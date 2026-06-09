using System;
using System.Numerics;

namespace Fathom.AI;

/// <summary>
/// Drives the Angler. Beyond chasing the last heard sound, it uses
/// <see cref="PlayerProfile"/> to LEAD the player — predicting where they will go and
/// moving to intercept, biased by their learned tendencies. The more it knows
/// (<see cref="PlayerProfile.Knowledge"/>), the more it cuts you off instead of
/// trailing you, and the faster/greedier it commits to a new sound.
/// </summary>
public sealed class AdaptivePredator
{
    private readonly PlayerProfile _p;

    public AdaptivePredator(PlayerProfile profile) { _p = profile; }

    /// <summary>Hunt speed scales up as it learns you (up to +35%).</summary>
    public float SpeedMultiplier => 1f + 0.35f * (float)_p.Knowledge;

    /// <summary>Commits to a fresh sound faster the better it knows you.</summary>
    public float RelockBonus => 0.4f * (float)_p.Knowledge;

    /// <summary>
    /// Where the Angler should aim this tick. Blends the last heard position with a
    /// predicted future position; the prediction's weight grows with knowledge, so a
    /// well-profiled player gets intercepted at the corner they always cut.
    /// </summary>
    /// <param name="lastHeard">Most recent sound location.</param>
    /// <param name="playerVel">Current player velocity (fallback heading).</param>
    /// <param name="playerCurDir">Player's current 8-dir index, or -1.</param>
    /// <param name="leadSeconds">How far ahead to lead, in seconds.</param>
    /// <param name="playerSpeed">Observed instantaneous player speed (px/s).</param>
    public Vector2 ComputeTarget(
        Vector2 lastHeard,
        Vector2 playerVel,
        int playerCurDir,
        float leadSeconds,
        float playerSpeed)
    {
        // Predicted heading: the Markov model first, else current velocity.
        Vector2 heading;
        int predicted = _p.PredictNextDir(playerCurDir);
        if (predicted >= 0)
            heading = Dir8(predicted);
        else if (playerVel.LengthSquared() > 0.0001f)
            heading = Vector2.Normalize(playerVel);
        else
            heading = Vector2.Zero;

        float speed = MathF.Max(playerSpeed, (float)_p.SpeedEma);
        Vector2 predictedPos = lastHeard + heading * (leadSeconds * speed);

        // The more it knows you, the more it commits to the cut-off rather than the chase.
        float w = 0.15f + 0.6f * (float)_p.Knowledge;
        return Vector2.Lerp(lastHeard, predictedPos, w);
    }

    /// <summary>8 compass directions, clockwise from +X (screen space, +Y down).</summary>
    public static Vector2 Dir8(int d)
    {
        switch (((d % 8) + 8) % 8)
        {
            case 0: return new Vector2(1, 0);
            case 1: return Norm(1, 1);
            case 2: return new Vector2(0, 1);
            case 3: return Norm(-1, 1);
            case 4: return new Vector2(-1, 0);
            case 5: return Norm(-1, -1);
            case 6: return new Vector2(0, -1);
            default: return Norm(1, -1);
        }
    }

    /// <summary>Quantize a heading vector to the nearest 8-dir index.</summary>
    public static int ToDir8(Vector2 v)
    {
        if (v.LengthSquared() < 1e-6f) return -1;
        float ang = MathF.Atan2(v.Y, v.X);            // -PI..PI
        int d = (int)MathF.Round(ang / (MathF.PI / 4f)); // eighths
        return ((d % 8) + 8) % 8;
    }

    private static Vector2 Norm(float x, float y) => Vector2.Normalize(new Vector2(x, y));
}
