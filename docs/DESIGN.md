# HE KNOWS YOU'RE HERE — Design Document

> **Status: LOCKED core concept (ADR-0006).** Working title: **"He Knows You're Here — A Backrooms Game."**
> Engine: native **C# / MonoGame** (ADR-0004). Structure: **campaign + endless** ("Both").
> This doc is the build plan. Decision history lives in [`docs/adr/`](adr/). Earlier brainstorm
> candidates are preserved in git history (commit `63193b0`).

## Logline
> A top-down 2D Backrooms descent narrated by a charming guide-AI that is secretly the
> monster — and **proves it by predicting your next move** from a cross-run profile of how
> you actually play.

## Pitch
The Backrooms, narrated by the thing that's been watching you. You no-clip down through iconic
Backrooms levels, guided by a warm, witty, Stanley-Parable-grade **Narrator** who roasts *how
you move* — cautious, reckless, wall-hugging, item-hoarding, panic-pinging. His omniscience is
**not scripted**: it's fueled by our verified, persisted `PlayerProfile` (action rhythm,
reaction time, stress turn-bias, flee-toward-open-vs-walls, a Markov movement model) — the same
data the hunting entities read. Across the campaign his charm **curdles into horror** as that
data lets him predict you before you act, and the reveal lands: there is no guide-AI — **he is
the entity**, the audience that profiled you across every run, and the between-dive "dossier"
was him the whole time. **The audience is the monster.**

The wedge nobody occupies: a **legible, performant 2D top-down** look (deliberate contrast to
the 500 first-person 3D Backrooms clones) fused with an **authored narrator persona** the new
"AI-knows-you" games lack. We out-narrate the clones and out-character the adaptive-AI wave.
Premium narrative-horror indie ($14.99–$19.99), built on a foundation already verified in this
repo (render-target darkness, procedural looping worldgen, the `PlayerProfile` moat).

## Design pillars
1. **THE NARRATOR IS THE PRODUCT.** A single-performer, three-coats-of-paint authored persona
   (charming guide → uncanny → tender-menacing watcher) is the moat and the reason to buy.
   Every store asset, trailer, and pitch leads with the Narrator + the twist — never generic
   liminal screenshots.
2. **OMNISCIENCE IS REAL, NOT FAKED.** Narrator and entities read the *same* persisted profile.
   The signature horror is **prediction, not threat** — a correctly-called next move is worth
   ten threats, and it's computed from the player's own logged behavior, which is what makes the
   reveal land instead of being a cheap twist.
3. **THE CURDLE: CHARM → HORROR IN LOCKSTEP.** Lighting, mechanics, and narrator tone descend
   together. Full-bright lobby with helpful banter → contracting darkness as the predator shifts
   from trailing to intercepting → authored slivers of light where mechanics **invert the very
   instincts the game spent the whole campaign profiling.**
4. **2D TOP-DOWN AS A DELIBERATE WEDGE.** Legible, clippable, performant, instantly different in
   a thumbnail. Reuse the verified native foundation rather than rebuild — reuse-first is how an
   indie ships this scope.
5. **SHIP DISCIPLINE: REUSE-FIRST, FALLBACK-ALWAYS, GUARDRAILED.** Authored line bank is the
   source of truth and ships standalone; the optional local LLM is a default-OFF, endless-only
   enhancement with grammar + denylist + silent fallback. Roasts target in-game **behavior**
   only, never identity; PG-13 playful menace.

---

## 1. The Narrator (the signature)

**Persona** — codename "the Voice." A warm, urbane, slightly theatrical baritone that introduces
itself as your guide-AI: the helpful companion narrating your descent, in the lineage of The
Stanley Parable's narrator. Funny, fond of you, quietly proud when you do well. **That is the
mask.** The truth, revealed across the game: there is no guide-AI — there is only the thing in
the dark that has been *narrating itself* the whole time. The charm is camouflage; the
"guidance" is a profile being assembled. His horror is **intimacy**: he doesn't threaten what
he'll do to you, he tells you **what you'll do, before you do it**, because he's watched you do
it a hundred times. He calls you "diver," then "subject," then eventually by the pattern he's
reduced you to ("the one who always breaks left"). **The audience is the monster.**

**Voice direction** — one performer, one through-line, three coats of paint. ACT I: mic-close,
warm, a documentary-host smile (you are the creature he finds delightful). ACT II: same warmth,
but the *timing* goes wrong — he answers questions you didn't ask, lands on details no guide
should know; lower reverb so he feels too close. ACT III: the performance drops — flat, clinical
"we," long unfilled silences, then sudden whispered intimacy. **Tech gimmick:** a comms-radio
EQ filters his voice in Act I ("it's your suit"); across the game the radio artifacts strip away
until Act III is bone-conduction-clean — **the mask coming off is literally an EQ automation.**
Two recorded takes per critical line (filtered + dry) to crossfade as Knowledge rises. Always
hold 200–400ms of silence after a roast — the laugh and the dread both live in the pause.

### The arc (charm → curdle → horror)
| Act | Levels | Knowledge | Tone |
|-----|--------|-----------|------|
| **I — The Charming Guide** | 0–1 | 0.0–0.3 | Witty, warm, genuinely helpful. Roasts are affectionate and play as comedy. Only seam: he's a touch too interested in *how* you move. Profile fills silently; callbacks stay vague. |
| **II — The Uncanny Roast** | 2–4 | 0.3–0.6 | Still warm, but wrong. Predicts you correctly ("you'll break left — there it is"). References last run. Jokes land, but with a held beat where you're unsure you should've laughed. |
| **III — The Gleeful Tormentor** | 5–6 | ~0.6 | Mask off. Admits it's been steering the hunter; slips between "it" and "I." Comedy becomes cruelty; cross-run data used as proof of real omniscience. |
| **IV — The Reveal & After** | 7–8+ | 0.6–1.0 | Clinical, intimate, tender-menacing. The dossier is recited as accusation. Narrates your death before it happens — and is right. The horror is total recognition. |

### Behavior → reaction (a selection; each tied to a real `PlayerProfile` signal)
- **Idles / stops** → I: teasing; II: fills the silence with something it shouldn't know; III: it goes silent *too*, then breaks it from very close. (Stillness is the one trigger where its *silence* is the line.)
- **Pings/looks rapidly** (low `ActionRhythmEma`) → I: "a flincher, you'll ping at a moth"; III: clinical readback — *"every two-point-one seconds you tell me where you are. I have never had to look for you."*
- **Breaks left under stress** (`DominantTurn`) → I (vague): "you favor your left, I think"; II: "corner's coming. You'll break left. …there it is"; III: it stops saying it and just *is* on the left.
- **Hugs walls** (`OpenVsWallBias` < 0.42) → II: "you'll take the wall, you always take the wall" (and the predator waits along it); III: *"I built the walls so you'd have something to hold."*
- **Panic-pings on low air** (`PanicEma`) → III: *"When you're dying, you reach for the light. Every single time. That's not survival. That's how I know it's really you."*
- **Dies to an intercept** (`Intercepts`) → III: *"I told it. I always tell it. It has terrible aim and a wonderful memory — like me."*

### Sample lines (the writing bar)
**Funny (Act I):**
- *"Right — you can't see, so you PING, and the ping is a little light that goes 'here I am!' to the one thing in the ocean you'd least like to say that to. I didn't design this. I'm just very fond of it."*
- *"You hugged that wall like it owed you money. I respect the commitment. The wall is, of course, indifferent."*
- *"You've pinged four times in ten seconds. At this rate you're less 'silent diver' and more 'lighthouse with anxiety.'"*

**Uncanny (Act II):**
- *"You'll break left here. You always break left. — …there it is. Good. No, I'm — I'm glad. It's nice to be right about you."*
- *"I'm your suit. I'm right here against your skin. I can hear you from in here. …I can hear you from out there, too. Isn't that a strange thing for a suit to say."*

**Menacing (Act III):**
- *"Quiet-swim all you like. Silence isn't hiding. Silence is just the part of the song where I get to choose when the next note happens."*
- *"Don't run toward the dark to lose me. The dark is the part of me you can't see yet."*

**The reveal:**
- *"Let me tell you a secret about your guide-AI. There is no guide-AI. There is the dark, and the thing in it that hears every breath — and a hundred dives ago that thing got curious, and started writing down everything you do. I write very neatly. Would you like to hear what I've learned? You will anyway. You always stay for this part."*

**On-death epitaph (shareable end-card every run):**
- *"There. You broke left. I told you you'd break left. I'd say I'm sorry, but we both know I waited there because of it."*

### The reveal moment (staging)
Fires **once per profile**, the first time the player reaches Act III (Knowledge ≥ ~0.65) and
survives deep enough to ground an objective. A navigation ping reveals the entity's face already
inside kill range — **but the lunge doesn't come.** The screen holds, music cuts, the comms-radio
EQ strips off the voice in real time over ~4s (you *hear* the mask come off), and he delivers the
reveal — quietly, almost tenderly. **The proof (this is what makes it land):** immediately after,
he makes **one live, specific prediction** off the current profile ("now you'll break left,
because you always break left") and **releases control mid-sentence** — whatever you do, the
profile-driven entity intercepts it, because the prediction was *real, computed from your own
logged behavior*. **Aftermath:** the dossier UI header silently changes from `PLAYER PROFILE` to
`MY NOTES ON YOU`; his address term collapses to the single pattern he's reduced you to; every
accurate prediction afterward is a fresh micro-horror with no further exposition.

### LLM / content guardrails (condensed)
Identity-lock (never break character; absorb out-of-world input as narcosis). Tone matches the
act the engine passes (1/2/3). **Grounded on the profile, never invented** — only reference
behaviors supported by the real values; cite a number only in Act 2–3 and only the exact value
provided, one decimal. **Core horror is prediction, not threat** — no gore/anatomy. **Hard
guardrails:** PG-13; never reference/target real protected attributes; no slurs; roasts target
in-game **behavior** only. 1–3 sentences, TTS-ready, no meta-leaks (translate signals to in-world
language). Grammar-constrained output + denylist; **deterministic authored fallback** on any
failure. Silence is a tool — don't over-talk.

---

## 2. The World

### Campaign — the iconic descent (8 levels, the tonal arc made physical)
| # | Level (wiki ref) | Look | Top-down mechanic | Key entities | Narrator role |
|---|------------------|------|-------------------|--------------|---------------|
| 1 | **Level 0 — The Lobby** | Mono-yellow offices, buzzing fluorescents. Only level where the dark stays OFF. | Teaching loop + no-clip onboarding; the grid *loops* (walk straight, return to start). One hidden clipped-wall exit. | None (a distant Smiler as foreshadow) | **Peak charm**, tour-guide banter; plants the profiling hook as "friendly attention." |
| 2 | **Level 1 — Habitable Zone** | Cavernous warehouse, failing fluorescents, long yellow pools. First real darkness. | Light-as-safety stealth (entities hunt only in dark); shove crates for cover; first collectibles. | Hounds, Smilers, Death Rats | Still helpful, first barbs (wall-hug vs open, hoarding). |
| 3 | **Level 2 — Pipe Dreams** | Tight concrete tunnels, pipes, black ooze. Darkest yet. | Sound-and-steam gauntlet (navigate by sound; time vents that also mask footsteps). Predator begins **leading**. | The Windows (wall-arms), Hounds, Clumps | **Turning point** — wit sharpens; openly references the dossier; first invasive omniscience. |
| 4 | **Level 37 — Sublimity (Poolrooms)** | Sunlit tiled pools, turquoise water, serene. Bright again — false relief. | Water acoustics + the false calm (ripples carry sound; dry islands are silent). Underwater exit costs air/sanity. | Largely deserted by design | **The disarm** — quiet, tender, briefly drops the comedy. The last time it sounds kind. |
| 5 | **Level Fun (Level !)** | Garish orange walls, blue carpet, warbled birthday loop, strobing light. | Attention / "don't be noticed" social horror (the meter rises with running/lingering/backtracking; cap it → swarm). Tuned against *your* logged tendency. | Partygoers | **Gleefully hostile** — enjoys your fear; comedy becomes cruelty. |
| 6 | **Level 9 — The Suburbs** | Endless night cul-de-sac, streetlamp pools, warm house windows. | Open-field risk economy (streets = exposure + speed; houses = loot + dead-end). Predator pre-positions on *your* flee-bias. | Wretches, Smilers, Hounds | **Openly adversarial** — admits steering the hunter; slips "it"/"I"; cites cross-run data. |
| 7 | **Level 188 — The Windows** | Vast dim hotel, courtyard ringed by windows showing *other places* — eventually your own past runs. Light comes only from the windows. | The watched-windows / gaze mechanic — stay centered, away from walls (**inverts** the wall-hug instinct you were profiled on). | The Windows, The Peripherals | **The reveal crests** — "every window is me. It was always the audience. It was always me." |
| 8 | **The End — An Endless Ending** | Bare grey office hall echoing Level 0, one door. Stanley-Parable-clean. | Authored finale, no combat. **Choice:** OBEY (loop back to Level 0, it keeps you) or **DEFY** (break your own logged pattern — the only true end). | None — the only monster is the Narrator/you | **Full reveal & resolution** — "the monster was the audience. The monster was me. The monster, if we're honest, was also you." |

### Endless "No-Clip" mode (the replayable spine + the coda)
No-clip between infinitely generated floors, each skinned as a random campaign archetype (+ rare
glitch hybrids), difficulty scaling with depth (more darkness, faster/greedier predator). **This
is where `PlayerProfile` earns its keep:** every run feeds the cross-run model, so the hunter
literally gets better at being *you* the longer you play. The Narrator runs an **infinite roast
loop** (authored bank + optional LLM). Death is **data, not failure** ("That's the fourth time.
I knew the corner before you did."). No redemptive ending by design — the thesis as a treadmill.
Leaderboard = depth survived against a monster trained on your own tendencies.

---

## 3. Architecture (native C# / MonoGame)

**Reuse-first.** ✅ = reuses the verified prototype in `native/Fathom/`.
| System | Purpose | Reuse |
|--------|---------|:--:|
| RenderCore / LightRenderer | Repurpose the verified render-target lighting (world-space reveal → additive light → multiply) from the sonar ring to **fluorescent/flashlight cones + flicker + mono-yellow room tone**. | ✅ |
| WorldGen / LevelGraph | Generalize `Grid.cs` from `bool[] Wall` to a **tile-type grid** (Floor/Wall/Carpet/Pillar/Exit/NoClipSeam/Hazard); keep DFS+braid+rooms+`Rng`. Backbone for endless *and* connective tissue under campaign prefabs. | ✅ |
| PlayerProfile | The engine of the hook. Keep all signals; rename Angler-era fields to behavior-neutral; **add** `BacktrackEma`, `IdleSecondsTotal`, `ItemHoardCount`, `DeathsByType`, `LevelsReached`, `HesitationEma`. | ✅ |
| EntityAI (from AdaptivePredator) | Reuse intercept/lead logic (`PredictNextDir` + knowledge-weighted lerp + speed mult) for entities that hunt by the **same** profile — which sells the reveal. | ✅ |
| BehaviorTracker | Per-run instrumentation → feeds profile + emits typed `GameEvent`s (idle, backtrack, wall-hug, hoard, door-hesitation, reckless sprint, death, near-miss). | new |
| **NarratorDirector** | **The signature system.** Scores events × profile resonance × arc-fit × novelty; cooldowns/anti-repeat/beat-gating; owns the tone arc; selects authored line or fires LLM. | new |
| VoiceService | Plays recorded VO (key beats) / offline TTS (slot lines) / captions (LLM); ducks ambience; one priority narrator channel; **always** renders subtitles. | new |
| LlmBackend | Optional pluggable LLamaSharp behind `INarratorVoiceSource`; grammar-constrained, async, hard fallback to the bank. | new |
| CampaignDirector / RunManager | Sequence handcrafted levels + scripted beats + the reveal; switch Campaign ↔ endless No-Clip on the same systems. | new |
| SaveData / Persistence | Reuse the `PlayerProfile` JSON Load/Save/Repair pattern for `SaveData`, `NarratorState` (arc), `NarratorMemory` (used line IDs, cross-session anti-repeat). Steam Cloud. | ✅ |
| Steam integration | Steamworks.NET — achievements, leaderboards (No-Clip depth), Cloud. | new |
| Input / Camera / HUD | Reuse WASD + axis-separated collision + player-centered camera; add gamepad, stamina, inventory, subtitle layer. | ✅ |

**NarratorDirector pipeline:** ingest `GameEvent`s → score each into a *Moment* (salience =
event weight × novelty × arc-fit × **profile resonance**, e.g. wall-hug scores higher when
`OpenVsWallBias` < 0.42 = a confirmed trait) → gate (global min gap that shrinks with tension,
per-category cooldown, per-line anti-repeat via `NarratorMemory`) → pick tone phase from arc
state → select authored line by `{category, tonePhase, requiredProfileCondition}` and fill slots
from the profile; if LLM enabled and the moment is high-salience, request an LLM line, **falling
back to the chosen authored line** on timeout/failure → deliver via VoiceService.

**Voice pipeline (3 tiers):** (A) **recorded VO** for ~150–300 key/always-fires beats (.ogg);
(B) **offline neural TTS** (Piper, ~30–60MB) for slot-filled lines; (C) **caption-only** for
fully-dynamic LLM lines (teletype, ducked bed). Fallback ladder: VO missing → TTS → caption, so
a beat is never silent. Subtitles always on (accessibility); captions are the localization surface.

**LLM plan:** LLamaSharp + a small instruct GGUF (Qwen2.5-0.5B/1.5B or Llama-3.2-1B class, Q4_K_M,
~350–900MB), CPU-only ~0.5–2s, behind a default-OFF "Dynamic Narrator" toggle, GBNF
grammar-constrained + denylist, hard authored fallback. **Strictly an enhancement; the game ships
complete without it.**

**Milestones:** **M1** re-skin foundation → walkable lit Level 0 (verify via `--shot`). **M2**
narrator vertical slice (event bus + tracker + director + ~200 Act-I lines + VoiceService) — *prove
the "it knows me" roast lands*. **M3** campaign spine (Levels 0/1/2/!/Fun) + entities reusing
AdaptivePredator + Act-II tone + SaveData. **M4** endless No-Clip + Steamworks + audio/VO pass +
TTS + accessibility. **M5** the reveal + endings + optional LLM + IP/attribution pass + ship.

---

## 4. Positioning & business
**The wedge:** between the 500+ first-person 3D Backrooms clones (Escape the Backrooms ~89%,
48k peak) and the new "the game knows you" wave (A.I.L.A, MIMESIS, 2025) — *a top-down 2D
Backrooms + a Stanley-Parable narrator whose omniscience is real.* **"The Backrooms, narrated by
the thing that's been watching you."** Lead with the Narrator + twist, never liminal screenshots.
Price **$14.99–$19.99** (premium tier self-selects away from $4.99 clones).

**Comparables:** Stanley Parable (narrator-as-character benchmark), Escape the Backrooms (audience
size + iconic-levels checklist), A.I.L.A/MIMESIS (the conceptual threat — *don't* lead on raw AI),
Inscryption (meta-reveal + spoiler discipline), Alien: Isolation ("it learns you" shorthand),
Buckshot Roulette/Iron Lung (minimal solo horror that went viral), Darkwood/Don't Starve (2D
top-down reads as deliberate style, not budget).

**Streamable moments:** the **profile call-out** ("you always break left… you'll do it in four
seconds" → they do); the backtrack/idle/hoarder roasts; **the turn** (spoiler-gated); the
personalized death epitaph (a shareable end-card every run); the "don't go in Level Fun" dare;
the endless-mode "how deep before it breaks character" flex.

**Title:** working title **"He Knows You're Here — A Backrooms Game"** (strong standalone brand +
"Backrooms" kept in the Steam name/tags for SEO). Alternatives: *Backrooms: The Watcher*,
*NOCLIP: A Backrooms Story*, *Backrooms: Audience of One*, *The Backrooms Are Watching*.

## 5. Top risks → mitigations
- **Setting saturation / cash-grab stigma** → lead with narrator+twist; 2D look as instant
  differentiator; premium price; strong capsule; Next Fest demo + streamer clip.
- **"Adaptive AI" is contested (A.I.L.A/MIMESIS)** → compete on the authored *persona* + the
  audience-is-the-monster reveal, not raw AI ("a comedian who's been studying you").
- **Narrator repetition kills the premise** → large trigger-organized authored bank FIRST;
  campaign fully authored/voiced; LLM optional, endless-only; repetition telemetry in playtests.
- **Local-LLM tone/safety blowup** → grammar + denylist + never feed PII + default OFF + authored
  fallback; roasts target behavior only.
- **CC-BY-SA ShareAlike contamination** → hard-partition (see §6).
- **Spoiling the twist in marketing** → Inscryption-style discipline; embargo the reveal.
- **Scope blowout** → phase hard; reuse-first; **cut order: drop endless mode and the LLM layer
  before you ever cut the narrator or the twist** — those two are the product.

## 6. IP / CC-BY-SA compliance (summary — *not legal advice; get counsel before EA*)
The Backrooms idea + generic aesthetic are unprotectable; **wiki levels/entities are CC-BY-SA**;
**Kane Pixels / A24 film content is off-limits.** Strategy = **hybrid partition:**
- ✅ **Ours (own copyright):** the engine, the Narrator + line bank, `PlayerProfile`/adaptive
  systems, all original procedural geometry, **all original entity art/audio.**
- 🔁 **CC-BY-SA (segregated, attributed content pack):** only the specific curated-level
  layouts/lore *derived* from wiki articles. Use the wiki's release-statement template; maintain a
  per-asset provenance manifest (source URL, authors, license + version); mark modifications;
  surface an in-game Attributions screen + repo `CREDITS`.
- ⛔ **Blacklist:** Kane Pixels/A24 material; incompatible-license sources; verbatim wiki prose in
  narrator output. **Original art for every entity.** Legal review of the SA boundary before EA.

## 7. Open questions (to resolve before/with build)
1. **VO economics & casting** — who voices the one-actor three-act narrator; ~150–300 key lines ×2
   takes; full VO at EA or captions+TTS bridge to 1.0? (Largest content-cost unknown.)
2. **Reveal gating across modes** — endless can hit high Knowledge first; do modes share one
   profile/arc-state, and does endless pre-trigger/spoil the campaign reveal?
3. **Tone-arc pacing** — what advances Act I→II→III (beats only, cumulative Knowledge, or both),
   and how to avoid stranding a low-engagement player in "charming" forever?
4. **Profile cold-start** — does the Next Fest demo need a seeded/accelerated profile so the "it
   knows me" moment can fire inside one ~20-min session?
5. **Min-spec LLM viability** — can a 0.5–1.5B GGUF produce on-tone lines within ~1.5s CPU-only
   often enough to feel additive? (Needs a perf/quality spike before Phase 2.)
6. **Endless narrator fatigue** — content-budget target + escalation/silence strategy so dread
   survives long sessions once authored lines are exhausted.
7. **Accessibility vs the EQ-unmask** — what carries the reveal's punch for deaf/HoH players on
   captions-only (the beat must not be audio-dependent)?

## Decision log
[`docs/adr/`](adr/) — 0004 (engine), 0005 (process), **0006 (this concept)** accepted; 0002
(echolocation) superseded → per-level mechanic; 0003 (learning model + LLM) folded into 0006.
