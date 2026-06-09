using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Fathom.AI;

/// <summary>
/// The persistent psychological model the Angler builds of the player.
/// Updated every run and saved to %APPDATA%/FATHOM/profile.json, then read by
/// <see cref="AdaptivePredator"/> to predict and pre-empt the player.
/// This — not the rendering tech — is what makes FATHOM more than a chase game:
/// the monster genuinely learns YOU, across runs.
/// </summary>
public sealed class PlayerProfile
{
    // ---- Persisted state ----
    public int RunsPlayed { get; set; }
    public int Deaths { get; set; }
    public int AmbushDeaths { get; set; }                 // killed by an intercept, not a tail-chase

    public double PingIntervalEma { get; set; } = 2.0;    // seconds between pings
    public double ReactionEma { get; set; } = 0.6;        // s from lock-on to first flee input
    public double SpeedEma { get; set; } = 0.0;           // average move speed (px/s)
    public double PanicPingEma { get; set; } = 0.0;       // tendency to ping while air is low (0..1)
    public double OpenWaterBias { get; set; } = 0.5;      // P(flee toward open space vs hug walls)

    public long[] TurnCounts { get; set; } = new long[4]; // 0 straight, 1 left, 2 right, 3 reverse
    public long[] DirMarkov { get; set; } = new long[64]; // movement transitions: from*8 + to
    public long[] QuadrantVisits { get; set; } = new long[4];

    // ---- Derived ----
    /// <summary>0..1 confidence — how well it knows you. Grows over ~10 runs.</summary>
    [JsonIgnore]
    public double Knowledge => Math.Clamp(RunsPlayed / 10.0, 0.0, 1.0);

    // ---- Observation API (called by the game during a run) ----

    public void ObservePingInterval(double seconds)
        => PingIntervalEma = Ema(PingIntervalEma, Clamp(seconds, 0.1, 20), 0.15);

    public void ObserveReaction(double seconds)
        => ReactionEma = Ema(ReactionEma, Clamp(seconds, 0.05, 5), 0.2);

    public void ObserveSpeed(double pxPerSec)
        => SpeedEma = Ema(SpeedEma, Math.Max(0, pxPerSec), 0.05);

    public void ObservePanicPing(bool pingedWhileLowAir)
        => PanicPingEma = Ema(PanicPingEma, pingedWhileLowAir ? 1 : 0, 0.1);

    public void ObserveOpenWaterFlee(bool towardOpen)
        => OpenWaterBias = Ema(OpenWaterBias, towardOpen ? 1 : 0, 0.1);

    public void ObserveQuadrant(int q) { if (q >= 0 && q < 4) QuadrantVisits[q]++; }

    /// <summary>Record a discrete 8-dir movement (toDir) given the previous one (fromDir, or -1).</summary>
    public void ObserveDirection(int fromDir, int toDir, bool underStress)
    {
        if (toDir < 0 || toDir > 7) return;
        if (fromDir >= 0 && fromDir <= 7)
        {
            DirMarkov[fromDir * 8 + toDir]++;
            if (underStress)
            {
                int rel = ((toDir - fromDir) + 8) % 8; // relative turn, clockwise
                int bucket = rel == 0 ? 0 : rel <= 3 ? 2 : rel == 4 ? 3 : 1; // straight/right/reverse/left
                TurnCounts[bucket]++;
            }
        }
    }

    // ---- Prediction API (called by AdaptivePredator) ----

    /// <summary>Most likely next 8-dir given the current dir; -1 if there is no data yet.</summary>
    public int PredictNextDir(int curDir)
    {
        if (curDir < 0 || curDir > 7) return -1;
        long best = 0; int bestDir = -1;
        for (int to = 0; to < 8; to++)
        {
            long c = DirMarkov[curDir * 8 + to];
            if (c > best) { best = c; bestDir = to; }
        }
        return bestDir;
    }

    /// <summary>Dominant stress-turn bucket (0 straight, 1 left, 2 right, 3 reverse); -1 if no data.</summary>
    public int DominantTurn()
    {
        long best = 0; int idx = -1;
        for (int i = 0; i < 4; i++) if (TurnCounts[i] > best) { best = TurnCounts[i]; idx = i; }
        return idx;
    }

    // ---- Human-readable dossier (shown to the player between dives) ----
    public string[] Dossier()
    {
        var lines = new List<string>();
        lines.Add($"SUBJECT pings on a {PingIntervalEma:0.0}s rhythm.");

        long turnTotal = TurnCounts[0] + TurnCounts[1] + TurnCounts[2] + TurnCounts[3];
        if (turnTotal > 20)
        {
            string s = DominantTurn() switch
            {
                1 => "breaks LEFT",
                2 => "breaks RIGHT",
                3 => "doubles BACK",
                _ => "holds course",
            };
            lines.Add($"Under stress, SUBJECT {s}.");
        }

        if (RunsPlayed > 2)
            lines.Add(OpenWaterBias > 0.58 ? "SUBJECT flees toward open water."
                    : OpenWaterBias < 0.42 ? "SUBJECT hugs the walls."
                    : "SUBJECT's escape routes are erratic.");

        if (ReactionEma < 0.4) lines.Add("SUBJECT reacts fast. Strike without warning.");
        else if (ReactionEma > 1.0) lines.Add("SUBJECT freezes on contact. Press the advantage.");

        if (PanicPingEma > 0.5) lines.Add("SUBJECT panic-pings on low air. Wait by the vents.");
        if (AmbushDeaths > 0) lines.Add($"SUBJECT has been intercepted {AmbushDeaths}x. It is learning.");

        return lines.ToArray();
    }

    // ---- Persistence ----
    [JsonIgnore]
    public static string SavePath
    {
        get
        {
            string dir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "FATHOM");
            Directory.CreateDirectory(dir);
            return Path.Combine(dir, "profile.json");
        }
    }

    private static readonly JsonSerializerOptions JsonOpts = new() { WriteIndented = true };

    public static PlayerProfile Load()
    {
        try
        {
            if (File.Exists(SavePath))
            {
                var p = JsonSerializer.Deserialize<PlayerProfile>(File.ReadAllText(SavePath), JsonOpts);
                if (p != null) { p.Repair(); return p; }
            }
        }
        catch { /* corrupt/old save -> start fresh */ }
        return new PlayerProfile();
    }

    public void Save()
    {
        try { File.WriteAllText(SavePath, JsonSerializer.Serialize(this, JsonOpts)); }
        catch { /* non-fatal: never crash on a save failure */ }
    }

    /// <summary>Guard against tampered/old saves with wrong array lengths.</summary>
    private void Repair()
    {
        if (TurnCounts is null || TurnCounts.Length != 4) TurnCounts = new long[4];
        if (DirMarkov is null || DirMarkov.Length != 64) DirMarkov = new long[64];
        if (QuadrantVisits is null || QuadrantVisits.Length != 4) QuadrantVisits = new long[4];
    }

    // ---- helpers ----
    private static double Ema(double cur, double sample, double a) => cur + a * (sample - cur);
    private static double Clamp(double v, double lo, double hi) => v < lo ? lo : v > hi ? hi : v;
}
