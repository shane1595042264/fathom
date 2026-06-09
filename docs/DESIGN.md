# HE KNOWS YOU'RE HERE — Design Document

> **Status: LOCKED concept** (ADR-0006) + **roguelike core** (ADR-0007).
> Engine: native **C# / MonoGame**. Working title: **"He Knows You're Here — A Backrooms Game."**
> The Narrator deep-dive lives in [`NARRATOR.md`](NARRATOR.md). Decision log: [`adr/`](adr/).

## Elevator pitch
> A top-down Backrooms **roguelike** where every run you're a different random stranger who fell
> into the dimension — but the charming, curdling Narrator isn't profiling your *character*. It's
> profiling **YOU**: your panic-turns, your reaction time, the corner you always cut. Across
> hundreds of procedural levels it learns the human at the keyboard, no matter which body you're
> wearing, and your corpses pile up in the rooms where you died for a future stranger to loot.
> Clear the roster to earn the right to face the final boss: a former stranger who **conquered the
> Backrooms and now rewrites his room in real time** using everything the game has ever learned
> about you. The only way out is to become someone he's never met — to play against your own ghost.
> **He knows you're here. Stop being you.**

## Design pillars
1. **THE WATCHER KNOWS YOU, NOT THE BODY.** The load-bearing pillar. `PlayerProfile` persists
   across every randomized stranger and every death; the character is disposable. Predator, roast,
   corpse-run, final boss are all expressions of this one seam. *If a feature doesn't serve it, cut it.*
2. **THE JOKE AND THE THREAT ARE THE SAME MODEL.** The Narrator's roasts and the predator's
   interception read the *same* profile getters. Comedy curdling into dread isn't flavor on top of
   mechanics — it *is* the mechanics surfaced as voice.
3. **DEATH IS GENERATIVE, NEVER WASTED** (Hades' contract, enforced). Every run advances at least
   the profile and meta-currency, usually the roster, and leaves a recoverable corpse.
4. **UNPREDICTABILITY IS THE ULTIMATE SKILL.** The profile that made the watcher strong is the
   final puzzle: you win the boss by defying your own logged habits. Meta-power buys *odds*, never
   a god-body — so skill and self-defiance always dominate.
5. **SMALL TESTABLE CODE, UNBOUNDED CONTENT.** ~10 archetypes × ~24 skins × a modifier deck +
   seeded Grid = enormous variety from little code. Handcraft only what must land a specific beat.
6. **THE LLM IS AN UPGRADE, NOT A DEPENDENCY.** A deterministic, profile-driven boss and Narrator
   ship complete and on-tone. The LLM enhances and degrades gracefully; safety is enforced
   deterministically regardless of the model.

---

## 1. Shape of the game — one game, one save, three faces of one loop
Persistence splits **exactly along body-vs-watcher**. The **character** (random stranger:
appearance, traits, perk, carried kit) is disposable and resets each run. The **watcher**
(`PlayerProfile.json` — already in repo) and the **dimension's memory** (corpse ledger, level
roster, meta-currency, Narrator tone tier) persist. Everything below is one engine reading one profile.

- **CAMPAIGN — "The Tour"** *(the on-ramp / showcase, not the boss gate).* ~6–8 hand-picked iconic
  levels in a **fixed authored order** (Level 0 Lobby → a teach-the-verb middle → Level ! Run For
  Your Life → a false-calm showpiece → a "you think it's over" false ending that *reveals* infinite
  mode). Where the Narrator's charm→curdle arc is pre-written and lands hardest; produces trailer
  moments. Same profile feeds it, so the watcher "remembers" your campaign behavior later.
- **INFINITE — "No-Clip"** *(the MAIN game).* Procedurally-ordered descents from a **10-archetype
  engine** wearing **~24 named wiki-level skins** + a 0–3 **modifier deck**. Each run you ARE a fresh
  randomized stranger; entities hunt via **your** profile; the same dossier data is the Narrator's
  roast material. Bounded, escalating runs; death or voluntary bank-out.
- **THE BOSS — The Concierge's room.** Unlocked by clearing the roster + gathering counter-tools.
  A single arena the boss rewrites **in real time** (LLM-driven) and fills with summons, all aimed
  by your profile. (See §6.)

---

## 2. The loop & "never fail"
**Moment** (one room): enter a seeded Backrooms room → entities hunt using your cross-run profile →
scavenge items → find the exit. The Narrator talks over all of it, roasting *how* you played.
**Run** (one stranger): descend through rooms grouped into Levels → clear objective → choose a
branch (Hades/StS map: treasure / rest / challenge / elite doors) → repeat until death or bank-out.
**Meta** (across runs/bodies): your roster fills (gates the boss), meta-currency unlocks
strangers-pool upgrades, and the Narrator's **Knowledge of YOU** climbs toward 1.0.

**Four persistence tracks (what persists vs resets — this *is* the design):**
| Persists across all runs/bodies | Resets with the body (→ recoverable via corpse) |
|---|---|
| `PlayerProfile` (the watcher's knowledge of you) — the signature | Stranger identity, stats, traits, **carried inventory** |
| Level roster / codex (boss gate) | In-run currency/charges, HP/sanity, current seed/route |
| Meta-currency (**Memory**) + strangers-pool upgrades | Per-run boons |
| Corpse ledger · Narrator relationship tier | |

**Why you never fail:** a death always advances ≥ the profile + Memory, usually the roster, and
leaves a corpse. The post-run summary reads like Hades: *"+X Memory · Profile +Knowledge · 1 Level
charted · corpse marked in [Level]."* The fusing line: *"Oh, a new one. Don't worry, I remember you."*

---

## 3. Randomized strangers + the corpse-run
**Character gen** (seeded off the in-repo `Rng`; run seed = master ⊕ `RunsPlayed`): layered
**identity** (name + a throwaway 3-line pre-fall bio that exists only to be read back to you),
**appearance** (procedural sprite tint clamped to contrast against Backrooms yellow), **stats**
(point-buy Wind / Nerve / Hands, normalized so no dead-on-arrival rolls), and **traits/perks/kit**:
- **Traits (1–2, double-edged):** nudge the *same knobs the predator reads* — e.g. *Heavy Boots*
  (louder, but shove doors), *Wall-Hugger* (faster on walls — plays with `OpenWaterBias`).
- **Perk (the run's toy):** Decoy, Glimpse, Second Wind, Lockpick, Quiet Hands.
- **Kit (0–2 items):** scales *inversely* with stats to keep power flat.

**Profile continuity (the do-or-die rule):** `PlayerProfile` is the player, the Stranger is the
body — stored separately, different lifetimes. The profile measures *motor/decision habits of the
human*, so it carries verbatim across bodies. **Guardrail against profile pollution:** feed speed
as a *fraction of the current body's max* (not absolute px/s); discount trait-forced channels
(lower EMA alpha during that run). The predator + Narrator read **only** the profile.

**Corpse-run death-drop:** on death, body + carried items pin to `(LevelSeed, tileX, tileY)` in a
capped **Corpse Ledger**; banked Memory + Signal Fragments are already safe (never dropped). The
corpse renders as that exact stranger's slumped sprite with a loot glow. **Recovery rules:** reach
the room physically (no teleport); each dive draws from a weighted bag — with `p_haunt` (~12%,
raisable) it re-serves a level seed holding one of *your* corpses. A keystone gives a corpse-compass
chevron. Perk recovery is a short, loud channel (gated by Hands, interruptible). Corpses decay after
N (~6) live entries, **tithing into Memory** so the save never bloats and loot is never *fully* lost.
**Stakes stay real:** you lose the in-hand kit + unique trait/perk the instant you die; it only comes
back if you return. *(All tuning values — `p_haunt`, decay N, payout curves — are playtest-bound; see Open Questions.)*

---

## 4. Items & build (gather-to-break-through)
**Categories:** Traversal/No-Clip tools · Consumables/Sustain · **Profile/Anti-Prediction** (the
signature category no other roguelike has — items that mask/jam/rewrite what the watcher knows) ·
Entity counters · Trinkets/passives · Keys/gather-gates.

| Item | Effect (system it touches) | Flavor |
|------|----------------------------|--------|
| **Almond Water** | Restore Sanity; steadies the screen ~15s | the canonical safe drink; the Narrator hates that it works |
| **No-Clip Charge** | Dash through ≤2 `Wall` tiles; loud (feeds `lastHeard`) | how you fell in here in the first place |
| **The Static Mask** | Feeds the profile **garbage** → `PredictNextDir` returns noise, predator mis-aims; drains Sanity | you can't read your own patterns either |
| **Bone-Whistle** | Decoy sound event → summons path to empty space (best summon counter) | "I taught it to listen for you — never to doubt what it hears" |
| **Cartographer's Eye** | Reveals the tile-graph a screen ahead (loops, exit, seams) | turns the looping Grid from threat into information |
| **Seam Chalk / Threshold Key** | Mark a tile a persistent seam; warp back to it (corpse-run backbone) | mark where you died rich, punch back next life |
| **Liquid Pain** | Trade max Sanity for burst speed + one guaranteed dodge | canonical wiki substance |
| **Frayed Lanyard** | Your corpse spawns findable & never decays; next stranger knows its direction | de-randomizes recovery |
| **The Other Hand** | Hold/use **two** actives; +1 charge each (the combo enabler) | "two hands now. So can I. I have a lot of hands, where I am." |
| **Signal Fragment** | KEY — collect a threshold to earn the right to the boss; **banks on pickup** | "you're collecting pieces of me…" |

**Synergies** along three axes: **Profile-edit** (Static Mask + Markov Jammer + Stranger's Coat →
become unreadable = the boss win rehearsed all game; costs Sanity), **Stealth vs Loud** (anchored on
the sound/light model), **Charge-economy** (The Other Hand → Noita-style combos). Anti-synergies keep
choices sharp (Party Mask locks out Almond Water; loud tools raise the very signals profile items hide).

**Economy:** *in-run* = **Sanity** (soft-HP *and* the readability dial — bottoming out spikes the
predator's Knowledge), **Charges**, **Scrip** (lost on death). *Meta* = **Memory** (earned every run,
**especially by behaving unpredictably** — defying the watcher literally pays; never lost) and **Signal
Fragments** (the gate). Meta buys *odds & convenience*, never a god-body.

---

## 5. The world — covering many levels cheaply
**Ten archetypes** are the engine; named wiki levels are **skins** (palette/audio/props/Narrator
pack/attribution) over an archetype + modifiers:
1. **Sonar-Dark** (echolocation's home — ADR-0002 demoted here) · 2. **Exposed-Flee** (no cover) ·
3. **Loop-Trap** (anti-Markov; break your own pathing) · 4. **Rising-Hazard** (outrun a front) ·
5. **Resource-Desperation** (supply-route under a hunter) · 6. **Stillness/Noise-Gate**
(don't-move / Weeping-Angel rules) · 7. **Escort** (carry a fragile thing — home of corpse recovery) ·
8. **Shifting-Geometry** (walls re-carve — a lite preview of the boss) · 9. **Infestation-Swarm**
(many weak entities) · 10. **Sanctuary/False-Safe** (reads safe, then betrays — the curdle's home).

**Three content tiers:** **A —** ~6 handcrafted landmarks (Level 0 Lobby tutorial, Poolrooms
showpiece, Level ! flee gate, the Cathedral boss-door, + corpse-fiction beats); **B —** ~24
semi-curated named levels (fixed archetype+skin+modifier-bias, procedural grid — recognizable yet
infinite); **C —** pure procedural "no-clip churn" after the roster is exhausted.

| Sample roster | Archetype | Signature mechanic |
|---|---|---|
| Level 0 — The Lobby | Sanctuary/False-Safe | handcrafted tutorial; the Narrator at peak charm; first reveal of the watcher |
| Level 1 — Habitable Zone | Resource-Desperation | warehouse supply-route under a distant entity |
| Level 2 — Pipe Dreams | Loop-Trap | wrapping corridors; escape by breaking your habitual turn (first anti-Markov) |
| Level 37 — Sublimity (Poolrooms) | Sanctuary/False-Safe | beauty as bait; water acoustics; the disarm beat |
| Level ! — Run For Your Life | Exposed-Flee | pure open-field chase adrenaline gate |
| Level 9 — The Suburbs | Exposed-Flee | streets (exposure) vs houses (loot dead-ends); predator pre-positions on your flee-bias |

**The gate:** clear a **required anchor set + a count threshold** (e.g. all landmarks + 20/24 roster
+ some mastered) — *not* beating the campaign. Diegetic: every cleared level is a place he watched
you, so the boss's omniscience is **earned by your progress.** Specific levels are the only source of
**boss-counter tools**, so exhausting the roster is also assembling the loadout.

**Danger curve (two axes):** **Depth** (per-run scalars: entity speed/count, hazard rate, map size,
modifier stack) × **Knowledge** (cross-run — the predator's prediction/speed scale with how well it
knows *you*, persisting across bodies). Meta-power relief on Axis 1 is paid for by Axis 2 → a permanent
knife-edge. Banded archetype gating (charming → the-trade-bites → it-knows-you → pre-boss) gives a
readable ramp.

**CC-BY-SA at scale:** attribution rides on the ~24 **skins** as *data* (`attribution[]` per skin →
auto-generated credits + `ATTRIBUTIONS.md`); adapt mechanics + names, **author our own** descriptions/
art/Narrator scripts (minimize verbatim reuse); fence any genuinely derived text in `content/wiki-derived/`
under its own SA notice; **CI lint** rejects a skin missing attribution or referencing a banned source
(Kane Pixels/A24). *Positioning, not legal advice — IP counsel before commercial release.*

---

## 6. The Concierge — the LLM final boss
**Concept:** after the gate, you no-clip into one persistent arena — a single Grid the boss **owns and
rewrites live.** Not a DPS race: a **navigation/expression duel.** The room is his body; reaching the
exit means out-thinking the thing that watched every run. He narrates your tendencies as he walls them
off: *"You always break left under pressure. I built a wall there. I built it last Tuesday."*

**Architecture (the buildable trick) — three decoupled layers, only one can be slow:**
- **DIRECTOR (LLM, async, off-thread):** every ~2.5–4s it gets a compact JSON `WorldState` (player
  tile, dir history, distance-to-exit, items held/used, phase, live `PredictabilityScore`, low-res Grid
  digest) and returns an `IntentPlan` — an ordered list of **allowed verbs**. It never touches the Grid;
  it only expresses *intent*.
- **EXECUTOR (deterministic C#, every frame):** the only code that mutates `Grid.Wall[]`, spawns from
  the entity roster, arms traps. Carries out the latest plan smoothly under **rate limits**; if no fresh
  plan arrives, it keeps pursuing the last (intents are durable goals).
- **VALIDATOR (deterministic, between them):** schema-clamps every field, drops unknown verbs, caps
  spawns, runs **BFS reachability** (the exit must always be reachable), enforces **no-crush** (never
  seal the player's tile/neighbors) and **hysteresis** (no thrash). *The LLM physically cannot break the
  game — worst case its output is ignored and the deterministic fallback runs.*

**Action space (the only verbs he has):** `RESHAPE_REGION(seal|open|maze|funnel)`,
`OPEN/SEAL_ROUTE`, `SPAWN(entity, at_predicted_intercept, ≤cap)`, `SET_TRAP(snare|alarm|lights_out)`,
`MOVE_EXIT`, `TAUNT(profile_fact)`. Summons get an `AdaptivePredator(profile)` so they intercept where
**your** `PredictNextDir` says you'll go. Summoning costs "attention" (a budget) → more spawns = fewer
reshapes = counterplay.

**Four phases:** **0 Welcome** (charming, gives you the exit, honest PredictabilityScore on display) →
**1 Funnel** (moves the exit, funnels against `OpenWaterBias`/`DominantTurn`, first item counterplay) →
**2 Hunt** (heavy remodel, multi-summons, `lights_out`; he calls your moves a beat *early* when you're
predictable, fumbles when you defy him) → **3 Break** (items spent + PredictabilityScore held low → his
authority collapses, summons lose the lead, the true exit locks open; the omniscient voice loses the one
thing it had: knowing you).

**Win condition — a conjunction (both required, which is the thesis):** **(A)** spend **gathered items**
to neutralize his structural verbs (a charge to phase a seal, a whistle to misdirect a swarm, a jammer to
freeze a reshape); **(B)** drive a live **PredictabilityScore** (your actual moves vs `PredictNextDir` /
`DominantTurn` / `OpenWaterBias`, blended into an EMA) **below threshold and hold it** — his intercept
accuracy, seal speed, and summon lead all multiply by that score. *You beat the thing that knows you by
becoming someone it has never met.*

**Identity:** THE CONCIERGE / THE ARCHITECT — a former random stranger (exactly like you) who fell in,
survived everything, and learned the Backrooms until he could rewrite it. He is the voice that charmed
and roasted you all game. He is **what you're trying to become** — someone who conquered by *knowing* —
and his tragedy is that he can only control what he can predict.

**Fallback (the shippable floor):** a fully deterministic `ScriptedConcierge : IDirector` satisfies the
same contract from the in-repo `PlayerProfile` + seeded `Rng` (seal toward `OpenWaterBias`, spawn at the
predicted cut, taunt from `Dossier()`), producing a complete, on-tone boss **with no LLM.** The LLM is a
post-launch toggle.

---

## 7. Architecture & honest status
**What's REAL in `native/Fathom/` today** (verified): `PlayerProfile.cs`, `AdaptivePredator.cs`,
`Grid.cs`, `Rng.cs`, and `FathomGame.cs` — which is an **M1 render demo only** (render-target lighting +
a moving player, hardcoded seed). The predator/profile are **not yet wired into the loop**; there's no
entity/HUD/death-state in the native build yet, and `Grid` is immutable (has `Carve`, no `Seal`). So the
"foundation" = three excellent detached classes + a lighting demo. **First real work is wiring them into a
playable loop.**

**Reuse-first systems:** RenderCore (repurpose the lighting), WorldGen (generalize `Grid` to tile-types +
add `Seal`/regenerate), PlayerProfile (extend), EntityAI (from `AdaptivePredator`), SaveData (the JSON
Load/Save/Repair pattern). **New:** BehaviorTracker + GameEvent bus, NarratorDirector, VoiceService,
LlmBackend (behind `IDirector`/`INarratorVoiceSource`), CampaignDirector/RunManager, Steamworks.NET.

## 8. Scope / phase plan (honest, from the real current state)
- **P0 — Wire the foundation into a real loop.** AdaptivePredator + PlayerProfile into `Update`; one
  hunting entity; live observation; death state + a between-run Dossier screen; seed the Grid from the run
  seed. *Deliverable: one room where the monster demonstrably learns you across restarts.*
- **P1 — Single-run vertical slice of the infinite engine.** `LevelDefinition = {skin, archetype,
  modifiers, seed}`; 3 archetypes; chained seeded rooms with a branch choice. Profile normalized by
  body-max from day one. *A single tense Backrooms-roguelike run.*
- **P2 — Roguelike meta + strangers + corpse-run.** Stranger generator; the persistence split; CorpseDrop
  + weighted re-haunt recovery; Hades-style hub spend (odds only); trait-channel EMA discount.
- **P3 — Roster breadth + campaign + the gate.** Remaining archetypes, modifier deck, skin format +
  attribution-as-data + CI lint, ~6 landmarks + ~24 skins with Narrator packs, the gate, the campaign's
  fixed order + false-ending reveal.
- **P4 — The boss, deterministic first.** Grid mutability, `IDirector`, Executor + Validator,
  PredictabilityScore, the 4 phases. Ship the **ScriptedConcierge** — a beatable, on-tone finale with NO
  LLM. *The shippable floor.*
- **P5 — Ship v1.0 (deterministic), then LLM as a post-launch upgrade.** Polish, audio, accessibility,
  Steam, **tune the unpredictability win to feel fair** (the big feel gamble), IP/legal sign-off. Then add
  the bundled grammar-constrained `LLMDirector` behind the same interface + pure-procedural churn + NG+ Heat.

## 9. Biggest risks
- **Scope** (now a multi-year team-scale project, tracked against an M1 demo) → the deterministic
  ScriptedConcierge floor + hard phasing; *don't start roguelike systems before P0 makes it play.*
- **Unpredictability feel** (do-or-die tuning) → strong "he expected that / he didn't" feedback so it reads
  as skill, not noise.
- **Profile pollution** → normalize by body-max + discount trait-forced channels from the first line of
  stranger code.
- **Narrator writing quality** → authored bank first; LLM optional; see `NARRATOR.md`.
- **CC-BY-SA at roster scale** → attribution-as-data + fenced folder + CI lint + counsel before EA.
- **LLM bundle cost + degrade** → deterministic by default; local-LLM opt-in download; cloud never bundled.

## 10. Open questions
1. **Boss access:** repeatable attempt once gated, or a one-shot you stage a loadout for? (Shapes the meta-economy.)
2. **Gate threshold:** which anchor levels are required vs "clear any N"; which counter-tools are mandatory.
3. **LLM hosting:** bundled-local vs optional-cloud. *(Recommendation: deterministic default, local opt-in download, cloud never bundled.)*
4. **Run length & bank-out economics:** payout curve that keeps "never fail" true without making death weightless.
5. **Corpse `p_haunt` / decay N:** playtest-tuned; single config source.
6. **Port vs rebuild:** how much of the browser prototype's feel (oxygen, compass, HUD, audio) ports to native.
7. **Campaign/infinite shared save:** one ledger or a sealed first-time experience?
8. **Accessibility of the reveal's EQ-unmask** for deaf/HoH players (captions-only). 

## Decision log
[`adr/`](adr/) — 0004 (engine), 0005 (process), 0006 (concept), **0007 (roguelike core)** accepted;
0002 (echolocation) → the Sonar-Dark archetype; 0003 (learning model + LLM) → powers the Narrator + the boss.
