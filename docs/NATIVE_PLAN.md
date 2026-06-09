# FATHOM — Native Build Plan (C# / MonoGame)

This is the **real, native, content-rich** version. The browser prototype in this repo
(`index.html`, `src/`) was the design proof; it stays as a playable reference. The
shipping game is built here, in `native/Fathom/`.

## Why MonoGame
- Native Windows/Linux/macOS `.exe` — **not** a web page, **not** a single HTML file.
- The framework behind **Celeste, Stardew Valley, Bastion, Axiom Verge, Streets of Rage 4** —
  2D games the world takes seriously.
- **Pure code, no mandatory editor.** Builds from the CLI (`dotnet build` / `dotnet run`),
  so it can be built and verified without a GUI workflow.
- Ships on Steam (Steamworks.NET), supports controllers, shaders, and real audio.

## The hook — *the predator that learns you*
The Angler does not chase your last sound. It builds a **profile of you** that **persists
across runs** (`%APPDATA%/FATHOM/profile.json`):
- your ping rhythm, your reaction time to its lock-on,
- which way you bolt when you panic (turn-bias under stress),
- whether you flee toward open water or hug walls,
- the regions of a level you favor,
- a Markov model of your movement so it can **predict and intercept** you.

Run 1 it is naive. Run 10 it is **waiting at the corner you always cut**. Between dives it
shows you its **dossier** on you. A separate **dive-suit AI ("FATHOM")** narrates — helpful
at first, then it turns, using your own data against you. (Authored voice now; a bundled
local LLM — `llama.cpp` via `LLamaSharp` — generates fully dynamic lines later.)

## Content scope (the ambition)
Five descent **zones**, each a distinct biome with its own hazard and an **apex creature**:
1. **The Wreck** — flooded freighter; the Angler; teaches the loop.
2. **The Trench** — open black water, current that drags you; the Choir (lures with crew voices).
3. **The Reef of Bones** — tight calcified maze; the Skitter (fast, swarms).
4. **Flooded Station** — power-puzzle rooms, flickering lights; the Warden (sees light, not sound — inverts the rule).
5. **The Mouth** — the bottom; the thing the suit-AI has been protecting.

Plus: **meta-progression** (rebreathers, decoy pingers, directional sonar, lures unlocked
across runs), **endless Abyss mode** after the campaign, **crew-log story** + multiple
endings, dynamic music, Steam achievements + leaderboards, full accessibility options.

## Architecture (`native/Fathom/`)
```
Fathom.csproj            net8.0, MonoGame.Framework.DesktopGL
Program.cs               entry; supports --shot (offscreen screenshot mode for verification)
Game/
  Core/      Rng, MathX, Time, Input, AudioSynth, SaveData
  AI/        PlayerProfile (the learning model), AdaptivePredator (uses it)
  World/     ZoneGen (rooms+loops), Tile, Lighting (render-to-target light mask)
  Play/      Player, Sonar (echo wavefront), Oxygen, Creatures/*, Director
  Voice/     SuitAI (authored + pluggable LLM backend), Dossier
  Render/    LightRenderer (additive), PostFx (grain/aberration), Hud
  Scenes/    Boot, Menu, Brief, Dive, Death, DossierScreen, Settings
Content/     procedural-first; recorded SFX/music added later
```

## Build & verify
- `dotnet build` — compilation is the first verification gate.
- `dotnet run -- --shot zone1` — renders N frames offscreen to PNGs I can read back.
- `dotnet test` — unit tests for `Rng`, `ZoneGen` (connectivity), `PlayerProfile`
  (serialization, prediction), `AdaptivePredator` (intercept logic).
- `dotnet publish -c Release -r win-x64` — the shippable native build.

## Milestones
- **M1 — Vertical slice:** window + first-person-feel lighting, ping echo wavefront, player,
  one Angler driven by `AdaptivePredator`, oxygen, the profile recording + dossier screen.
- **M2 — Zone 1 complete:** The Wreck end-to-end, suit-AI authored voice, audio pass, menus.
- **M3 — Zones 2–3 + meta-progression + Steam integration.**
- **M4 — Zones 4–5, story/endings, local-LLM voice, polish, ship.**
