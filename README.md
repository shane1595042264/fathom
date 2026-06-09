# FATHOM

> **You are blind in the deep. Ping to see. It hears every ping.**

FATHOM is a minimalist sonar-horror arcade game — a tight, endless "one more run"
loop in the spirit of Tetris, but terrifying. The screen is black. Your only sense
is a sonar **ping** that briefly lights the flooded labyrinth around you… and the
blind thing down here hunts the exact sound you make to see. Every ping is a
Faustian trade: *light now means attention now.*

It runs with **zero dependencies and zero build step** — double-click `index.html`
and play — and ships to Steam via a thin Electron wrapper around the identical code.

> **Screenshot:** run the game and ping in a corridor — a cyan sonar ring tracing the
> flooded maze on pure black, the diver glowing at center, the red Angler lurking in a
> side passage. That single frame is the store-page hero shot. (Drop a capture at
> `docs/screenshot.jpg` to show it here.)

---

## Play right now

**Option A — open the file (simplest):**
Double-click `index.html`. That's it. (The game uses only classic scripts and the
Canvas/Web Audio APIs, so it runs straight from `file://` with no server.)

**Option B — run a local server (recommended for development):**
```powershell
# Windows, no Node required — uses the bundled zero-dependency PowerShell server
powershell -ExecutionPolicy Bypass -File tools\serve.ps1 -Port 8137
# then open http://127.0.0.1:8137/index.html
```
or with any static server you like, e.g. `npx serve .` / `python -m http.server`.

**Headphones strongly recommended** — in a game played in darkness, the creature is
heard before it is seen.

---

## How to survive

| Action | Input |
| --- | --- |
| **Swim** | `WASD` / Arrow keys / left stick / touch (left half) |
| **Ping** (see) | `Space` / `J` / Left-click / `RT` — the loudest thing you can do |
| **Swim silently** | Hold `Shift` / `LB` — slow, but near-silent |
| **Breathe** | Rest on a green vent to refill air — surfacing is loud |
| **Pause** | `Esc` / `P` / `Start` |

**Goal:** recover the gold beacons to open the descent, then drop deeper. Forever.
Each depth: faster Angler, less air, tighter dark, eventually more than one hunter.
**Death is one touch.** Your score is how deep you got.

---

## The design in one paragraph

The core verb (`ping`) is both the only way to **see** and the only thing that gets
you **heard** — risk and reward are the *same action*. A continuous **oxygen** clock
means you can't simply hide and wait; a **fear-spiral** makes you breathe (and drain
air) faster the closer the Angler gets; and at zero air an **involuntary gasp** hands
the creature your position. A **style multiplier** rewards nerve — long blind
stretches navigated from memory score more. The difficulty scales like Tetris speed:
the deeper you go, the more you *need* to ping and the less you can *afford* to. Full
design rationale, tuning constants, and the ranked scare list are in
[docs/GAME_DESIGN.md](docs/GAME_DESIGN.md).

---

## Project layout

```
index.html              Entry point + boot/content-warning gate (loads all scripts in order)
src/
  config.js             ALL tuning constants — the single source of truth for game feel
  core/                 Engine: math, seeded rng, event bus, storage, input, procedural audio
  game/                 Systems: world-gen, sonar, player, entity AI, oxygen, progression
  render/               Renderer (darkness/reveal), post-fx/juice, HUD
  scenes/               Scene manager + menu, settings, how-to, pause, game, game-over
  main.js               Bootstrap + main loop
electron/               Desktop wrapper for the Steam build (main + preload)
steam/                  Steamworks integration notes, appid, achievement list
tools/                  Dev static server + single-file build script
docs/                   Design doc, Steam release checklist, store page copy
```

Everything is plain ES5/ES2017 JavaScript sharing one global `FATHOM` namespace —
no transpiler, no bundler, no `node_modules` required to run or ship the game.

## Tuning

Open [`src/config.js`](src/config.js). Every gameplay number lives there
(ping speed/cooldown, hearing radii, oxygen rates, the difficulty curve, scoring).
Reload to see changes. This is intentionally the only place you need to touch to
rebalance the whole game.

## Shipping to Steam

See [docs/STEAM_RELEASE_CHECKLIST.md](docs/STEAM_RELEASE_CHECKLIST.md) for the full,
honest, step-by-step path (it requires *your* Steamworks account and the $100 app
fee — those steps can't be automated for you). The Electron build is in `electron/`;
`package.json` has the scripts.

## License

© 2026. All rights reserved (placeholder — set your preferred license before release).

## Credits

Design, code, audio: procedural. Built with the Claude Agent SDK.
Core mechanic validated by an adversarial multi-agent design panel (see the design doc).
