# FATHOM — Game Design Document

> *You are blind in the deep. Ping to see. It hears every ping.*

**Genre:** minimalist sonar-horror arcade roguelike · **Players:** 1 ·
**Platforms:** Web (itch.io / browser) + Steam (Electron) · **Render:** 2D vector on black, fixed 960×600 letterboxed · **Audio:** fully procedural (Web Audio).

This design was pressure-tested by an adversarial multi-agent panel (a game-design
judge, a horror judge, and a commercial/Steam judge). Against the alternative
mechanics it scored **35–36 / 40** and won **unanimously**. The strongest idea from
the runner-up ("HOLD") — the **fear spiral** — was grafted in, as were its
**involuntary drowning-gasp** and **style multiplier**.

Legend: ✅ implemented in this build · 🔜 designed, on the post-launch roadmap.

---

## 1. The pitch

FATHOM is a Tetris-grade horror arcade game: a one-more-run endless descent through a
flooded, pitch-black structure where your only way to see is a sonar **ping** — and
the blind thing in the dark homes on the exact sound you make to see. The whole game
lives in a single agonizing trade repeated forever: **light now means attention now.**
Instantly legible (one sentence, felt in ten seconds), infinitely replayable (depth =
score), and built to print streamable horror.

## 2. The core mechanic — *sight is noise*

One action reveals the world and that same action is what kills you. ✅

- **Ping** fires an expanding sonar ring that paints walls, beacons, air pockets and
  silhouettes as it sweeps past, then fades over ~2.6 s, leaving a dimming afterimage
  you must navigate from memory. ✅
- The **Angler** is blind too and hunts by **sound**: it hears every ping (far),
  fast swimming (near), wall-bumps (medium), and air-pocket gasps (far), and
  converges on your last sound. ✅
- **Oxygen** drains continuously, so you cannot freeze and wait it out — stillness is
  also death. ✅
- The double-bind **scales forever like Tetris speed**: deeper structures get denser
  (you *need* to ping more) while the Angler gets faster and hearing sharpens (you can
  *afford* to ping less). The curves cross and diverge — every ping becomes a micro-
  decision with no settled optimum. ✅

**Grafted from the runner-up:**
- **Fear spiral** ✅ — within the dread radius the Angler's nearness raises your breath
  rate, multiplying oxygen drain up to **1.9×** at point-blank. Panic literally
  suffocates you, forcing louder, more frequent surfacing — which draws it closer.
- **Involuntary drowning gasp** ✅ — at 0 air you don't die instantly; you get a **2.5 s**
  window of uncontrollable, loud gasps (a beacon to the creature) and a slim chance to
  reach a vent.
- **Style multiplier** ✅ — score is multiplied (1.0×–3.0×) by **nerve**: time spent
  navigating blind between pings raises it; pinging spends it.

🔜 **Charged ping** (hold to release a brighter/farther/**louder** ring),
🔜 **decoy ping** (throw a sound to bait the Angler), and 🔜 **echo-reading** (ring
return pitch differs off near vs far walls) are designed extensions of the same verb.

## 3. Controls ✅

- **Move:** WASD / arrows / left stick / touch left-half virtual stick. Momentum swim
  (accel 1400 px/s², max 150 px/s, water drag 6.5/s).
- **Ping:** Space / J / Left-click / RT. The loudest deliberate act.
- **Quiet swim:** hold Shift / LB — 0.42× speed, near-silent (invertable).
- **Pause:** Esc / P / Start. Menus are keyboard + mouse + gamepad + touch navigable.

The entire control surface is *see-button + move*.

## 4. The loop ✅

- **Micro (30–90 s):** ping → memorize the flash → swim blind toward the remembered
  gap (aided by a faint 74 px self-glow so you're never 100% blind) → the Angler drifts
  toward your last sound → dare to ping again, or push blind.
- **Depth (1–3 min):** recover *N* beacons (3 at depth 1, +1 per depth) to open the
  descent, bank remaining air as bonus, drop to the next, harder depth.
- **Meta:** die in one touch → epitaph + score + leaderboard → "one more run." The
  hook is the **guilt-loop**: the game never kills you; your decision to look does.

## 5. Systems ✅ (unless noted)

- **Sonar** — frozen visibility polygon cast per ping (600 rays) so walls occlude the
  reveal; brightness fades per-surface; passive self-glow line-of-sight masked.
- **Player & noise model** — every loud act publishes a `noise` the entity can hear;
  noise is the single currency linking action to danger.
- **Angler AI** — states the player learns by ear: PATROL (slow wander) → HUNT (homes
  on last noise) → SEARCH (sniffs the last known point) → back to PATROL. BFS
  pathfinding; a relock cadence prevents perfect tracking; interest decays after
  silence. Directional, distance-attenuated groans tell an attentive player where it
  is. 🔜 A dedicated LUNGE state with a 0.45 s wind-up tell and dodge window.
- **Oxygen** — drain + fear-spiral + air-pocket refill (loud) + drowning window.
- **World gen** — randomized-DFS braided maze of 48 px tiles; grows with depth;
  spaced beacons / air pockets / descent hatch; entity spawns far from the player.
  🔜 biome/modifier deck (wet-resonance, silt, currents, the vast empty hall).
- **Progression** — per-depth scaling of entity speed, start oxygen, passive vision,
  and entity count, with hard floors/ceilings (worse dilemmas, never impossible).
- **Render / post-fx** — vector reveal on black; dread red-out vignette; faux
  chromatic aberration at high threat; film grain; drowning gray-out/iris; ping flash;
  the rare face reveal; the death wash. All flashing respects Reduced Flashing.
- **Audio** — procedural sonar ping + echo tail, sub drone, water noise, a dread layer
  that swells with proximity, heartbeat-as-clock that quickens with tension, directional
  creature groans, gasp, beacon chime, descent sweep, and the death stinger. Gated to
  start on the "Descend" gesture (autoplay policy).
- **Persistence** — local settings, top-10 leaderboard, run meta (deepest, deaths).
  🔜 Steam Leaderboards / Achievements / Cloud.

## 6. Tuning constants

All live in [`src/config.js`](../src/config.js) — the single source of truth. Key values:

| Constant | Value |
| --- | --- |
| Ping ring speed / max radius / cooldown | 540 px/s · 980 px · 0.85 s |
| Ping noise / reveal fade / air cost | 1.0 · 2.6 s · 1.0 s of air |
| Passive self-glow radius | 58 px (just over a tile; shrinks with depth, floor 50%) |
| Player max / quiet speed · quiet noise | 150 px/s · ×0.42 · 0.20 (audible, not silent) |
| Angler hunt / patrol speed (d1) | 92 px/s · 46 px/s (+6/depth, cap 168) |
| Hearing: ping / swim / bump / gasp | 1500 / 520 / 520 / 900 px · kill 22 px · ears +5%/depth (cap +60%) |
| Oxygen start / drain / fear mult / drown window | 80 s · 1.0/s · ×2.4 (sqrt curve) · 2.5 s |
| Extra Angler every / max | 4 depths · 3 |
| Score: beacon / depth / air-bank / style | 250 · 1000 · 6/s · ×1.0–3.0 |

## 7. Difficulty curve

1. **Depth 1 (learn-by-doing):** open-ish maze, 1 Angler, 80 s air, 3 beacons. Ping freely.
2. **Depths 2–3 (the trade bites):** maze grows, Angler faster, less air, +1 beacon; quiet-swim becomes worth it.
3. **Depth 4 (second Angler):** sound triangulation begins; out-waiting matters. 🔜 biome modifiers.
4. **Depths 5–7 (dead-reckoning):** vision shrinks, fade feels short; long blind stretches between sparse pings; fear-spiral forces risky gasps.
5. **Depth 8 (third Angler, cap):** 🔜 currents + the vast empty hall.
6. **Depths 9–12 (the cross):** need-to-ping and can't-afford-to-ping fully diverge; every ping agonizing; style spikes for blind runs.
7. **Depth 13+ (endless):** all dials pinned; only nerve and (🔜) echo-reading remain. Leaderboard flex.

## 8. Ranked scare moments

**High**
1. **The Already-Here Face Reveal** ✅ — a navigation ping resolves the Angler's face within ~150 px; the light you summoned for safety shows you you're already dead. (Rarity-gated.) *The single highest-value frame in the game.*
2. **The Death Lunge** ✅ — contact → full-frame creature snap, blood-red flash (dampened by Reduced Flashing), percussive roar, hard cut to the epitaph.
3. **The Breath-Hold Standoff** ✅ — the Angler goes SEARCH and listens; the drone drops; you out-wait it while air (and the fear-spiral) drain.
4. **The Greedy-Ping Death** ✅ — pinging "for one more look" at the gate draws it instantly. Built-in *DON'T PING* chat chant.
5. **The Gasp Betrayal** ✅ — a forced surface-gasp, or the involuntary drowning gasp, and you watch it pivot toward the sound.

**Medium**
6. **Directional "It's Behind You"** ✅ — positional audio + dread vignette as it enters from off-screen. 🔜 explicit screen-edge bearing indicator.
7. **The Vast Empty Hall** 🔜 — a ping reveals *nothing* for terrifying seconds.
8. **Silent Arrival in Radius** ✅ — a routine ping shows it mid-frame, close but not face-filling.

**Low** · 🔜 **Decoy Backfire**, 🔜 **Current Drift Into Contact**.

## 9. Scoring & progression

Score = (250 × beacons) + (1000 × depth) + (6 × air-seconds banked at descent), with
beacon and depth components multiplied by the **style** multiplier. ✅ Primary
leaderboard metric is **depth** (Tetris-clean); score is the tiebreaker. Death writes
an epitaph for shareable loss screens. No power unlocks — purity of the arcade loop is
preserved. 🔜 cosmetic sonar palettes / creature variants at depth milestones; 🔜
daily-seed mode (the world is deterministic from a seed — see `core/rng.js`).

## 10. Accessibility ✅ (unless noted)

- Reduced Flashing (caps flash luminance, dampens face/lunge/death flashes).
- Screen-shake scale (0–1).
- Audio subtitles / directional cue captions (playable without headphones).
- Colorblind-safe danger palette (shifts red → high-contrast amber across creature, dread vignette, and the low-oxygen bar).
- Invert quiet-swim hold; full keyboard/gamepad/mouse/touch.
- Independent master / SFX / ambience volume.
- 🔜 fear-spiral softener cap, peak-loudness limiter, key rebinding UI, haptics,
  longer-afterimage navigation assist.

## 11. Content warnings ✅ (surfaced on the boot gate + store page)

Sudden loud sounds & audio jumpscares · brief high-contrast flashes (mitigable) ·
sustained darkness and dread · drowning/suffocation theme & loss-of-bodily-control
mechanic (may distress panic/claustrophobia/asthma) · a frightening creature & partial
body horror (never a clean gore shot) · thalassophobia content · headphones amplify
startle (limiter provided).

## 12. Top development risks (and mitigations)

1. **Blind nav reading as "unfair" not "tense."** → reveal fade 2.6 s, afterimage,
   the 74 px self-glow fairness floor, clean 2D-silhouette presentation. *Playtest the
   "felt blind vs felt skillful" line obsessively.*
2. **Degenerate never-ping crawl.** → oxygen + fear-spiral + density must make a no-ping
   run unsurvivable past ~depth 3. *Verify with a heuristic bot.*
3. **One-touch-death fairness.** → readable, learnable lunge tell + dodge window (🔜).
   *Instrument death causes; watch the cheap-death rate.*
4. **Fear-spiral balance** is make-or-break. → keep the accessibility cap as a safety valve.
5. **Audio dependence / muted legibility** → the visual sound layer must stay first-class.
6. **Procedural repetition fatigue** → the biome deck + set-pieces are content, not polish (🔜).

## 13. Why this can be influential

The verb is **portable and nameable** — "ping-to-see, seeing gets you heard" — and the
visual identity (a cyan ring on black) is instantly recognizable and mute-readable,
the way Tetris, Iron Lung, and Buckshot Roulette achieve reach. Expert play *looks like
courage* (long blind runs), which fuels leaderboard culture and clips. The whole thing
is near-textless, so it travels globally without translation.
