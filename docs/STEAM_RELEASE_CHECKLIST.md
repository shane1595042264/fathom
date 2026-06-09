# FATHOM — Steam Release Checklist

This is the honest, end-to-end path from this repo to a live Steam store page.

> **What I (the build) can and can't do.** The game is finished and packageable, and
> all the configuration/code/scaffolding below is in the repo. The actual *publishing*
> steps require **your** Steamworks account, the **$100 USD** Steam Direct fee, identity
> & tax verification, and clicking the legal/“release” buttons in Steamworks — those
> cannot and should not be automated on your behalf. Each such step is marked **[YOU]**.

---

## Phase 0 — Prerequisites

- [ ] **[YOU]** Create a Steamworks account at <https://partner.steamgames.com> and complete identity + bank/tax verification (can take a few days).
- [ ] **[YOU]** Pay the **$100 Steam Direct** recoupable fee → this creates your **App ID**.
- [ ] Install **Node.js LTS** on the build machine. This repo has no Node yet:
      ```powershell
      winget install OpenJS.NodeJS.LTS
      ```
- [ ] Record your numeric **App ID**; put it in `steam/steam_appid.txt` and in `package.json` (`fathom.steamAppId`).

## Phase 1 — Build the desktop app

The Electron wrapper loads the *identical* game code, so there is one codebase.

```powershell
npm install            # installs electron + electron-builder (+ optional steamworks.js)
npm run start          # smoke-test the desktop build locally
npm run dist           # produces a Windows build under release/
```
- [ ] Confirm the packaged `.exe` launches, the boot/content gate appears, audio starts on “Descend”, a full dive plays, settings persist, and Alt-Tab auto-pauses.
- [ ] (Recommended) Also produce the single-file web build for itch.io / the web demo:
      ```powershell
      powershell -ExecutionPolicy Bypass -File tools\build-singlefile.ps1
      # -> dist/fathom.html  (one self-contained file, double-click to play)
      ```

## Phase 2 — Steamworks integration (code is scaffolded in `src/steam/` + `electron/`)

- [ ] **[YOU]** In Steamworks, define the App: name **FATHOM**, set it as a Game.
- [ ] **[YOU]** Add **Leaderboards**: `DEEPEST_DESCENT` (depth, descending) and `HIGH_SCORE` (score). The code calls these names — keep them or update `src/steam/steam.js`.
- [ ] **[YOU]** Add **Achievements** from [`steam/achievements.md`](../steam/achievements.md) (API names must match the file).
- [ ] **[YOU]** Enable **Steam Cloud** (auto-cloud the settings/scores JSON paths listed in `steam/achievements.md`).
- [ ] Wire `steamworks.js` (optional native module) — `electron/main.cjs` already lazy-loads it and no-ops gracefully if absent, so the game ships fine even before this is finished.
- [ ] Set **Steam Input** to enabled (the game already supports standard gamepads).

## Phase 3 — Store page

- [ ] **[YOU]** Fill the store page using [`docs/STORE_PAGE.md`](STORE_PAGE.md) (short/long description, tags, system reqs).
- [ ] **Capsule art / assets needed** (create these — the game's identity is a cyan sonar ring on black):
  - Header capsule 460×215, small 231×87, main 616×353, library 600×900 + hero 3840×1240 + logo.
  - 5+ screenshots (1920×1080). Lead with the **face-reveal** frame and the **expanding sonar ring**.
  - A 30–60 s trailer opening on the face-reveal beat.
- [ ] **[YOU]** Set **Mature Content** flags: frequent/intense scary themes, sudden loud sounds, flashing. Put the warning **above the fold** in the description.
- [ ] **[YOU]** Fill the **Accessibility** section: reduced flashing, colorblind-safe, subtitles/captions, screen-shake toggle, control inversion, volume mixes (all implemented).
- [ ] Tags: `Horror, Arcade, Roguelite, Difficult, Atmospheric, Score Attack, Singleplayer, Great Soundtrack, Underwater, Minimalist`.

## Phase 4 — Build upload (SteamPipe)

- [ ] Install the **Steamworks SDK** (download from the partner site → `tools/ContentBuilder`).
- [ ] Use the provided VDF template in [`steam/app_build.vdf`](../steam/app_build.vdf) (depot is defined inline) — set your App ID and depot ID.
- [ ] Point the depot at the packaged build output (`release/win-unpacked/` or your installer's payload).
- [ ] Upload:
      ```powershell
      steamcmd +login <you> +run_app_build ..\steam\app_build_<APPID>.vdf +quit
      ```
- [ ] **[YOU]** In Steamworks → Builds, set the uploaded build live on the `default` branch.

## Phase 5 — Pre-launch

- [ ] Build a **demo** (cap at ~depth 5, leaderboard on) for **Steam Next Fest** to drive wishlists. The itch/web build is the evergreen funnel.
- [ ] **[YOU]** Submit the build for Valve **review** (a few business days) and complete the store-page review.
- [ ] Test on a **Steam Deck** (Deck Verified is high-leverage here) — controller mapping + 7" text legibility.
- [ ] Verify on a low-end integrated-GPU laptop (target: locked vsync, smooth at 60 fps).
- [ ] **[YOU]** Set price, release date, and regions; build the wishlist runway (2–4 weeks min of an up store page before launch).

## Phase 6 — Launch & after

- [ ] **[YOU]** Click **Release** on the scheduled date.
- [ ] Ship a day-1 balance lever if needed — all tuning is in `src/config.js`.
- [ ] (Opt-in) telemetry: depth reached, death cause, pings/depth, cheap-death flag, to validate "no-ping is unsurvivable" and lunge fairness.

---

### Quick reference — what's already done in this repo
Game complete & verified · zero-dep web build · Electron wrapper + preload · Steam
integration shim (graceful no-op without the native module) · `steam_appid.txt` ·
achievement list · VDF templates · single-file build script · content/photosensitivity
gate · full accessibility options · local leaderboard + epitaphs · deterministic seeds
for daily mode.
