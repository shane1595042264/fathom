# Survival / Immersive-Sim Systems

> The freedom layer (ADR-0008): destructible material-hardness terrain, salvage + crafting +
> biome resources, D&D-style ability scores, and weight-based encumbrance. Companion to
> [`DESIGN.md`](DESIGN.md). **Design rule above all: if a feature does not make you more *hunted*,
> it does not belong.** This is FATHOM's hunt with a Vintage-Story-shaped *fear-tax* economy — not
> a survival-craft game with a monster bolted on.

## The five-lock thesis — how freedom *serves* dread
Every freedom is metered through the **one currency the `AdaptivePredator` already consumes:
NOISE into `lastHeard`.** Empowerment is exposure.
1. **LOUD.** Mining/crafting are the loudest sustained acts in the game — each swing re-writes
   `lastHeard` (~every 0.5s), and tougher/more-valuable walls are *louder*. Gaining power broadcasts
   your exact position to a thing whose speed/relock scale with how well it knows you.
2. **SLOW + STILL.** Channeled mining locks you to a tile and cancels on a step — you surrender
   evasion (your only real defense), and the flee-bias you taught it predicts your panic exit.
3. **WEIGHT IS THE LEASH.** A heavy haul drops your speed below the learned predator's bonus *and*
   enlarges your footstep noise — the loot you wanted is why you can no longer outrun or out-quiet it.
4. **THE WALL BITES BACK.** The boss re-pours concrete and walls back your holes ("I poured that
   concrete myself"). Destructibility curdles from "I can break anything" into "it *lets* me, and
   it's watching me try."
5. **THE RAREST CRAFT FORCES THE FIGHT.** Tier-3 boss-counter materials drop only from
   entities/anomaly nodes — crafting the tools to beat the hunter means going *toward* it.

> There is no winning a straight fight. Stats and gear buy **survival-time** and **reach**, never
> the right to power through. The horror lives in the negotiation between haul and survival.

---

## 1. Destructible terrain (material hardness)
**Material model (discrete tiers, not continuous).** `enum Material : byte { Air, Drywall, Plaster,
WoodPanel, Carpet, ConcretePillar, Rebar, SteelShutter, BossFlesh, Bedrock }`, each with a static
record `{ Hardness 0–5, MaxHP, NoiseScale, Drop, SignatureLevel }` in a shared `MaterialDef[]`
(zero per-tile cost). **Two axes are the crux:** **Hardness is a GATE** (a too-weak tool does *zero*
damage — bare hands can't scratch concrete) and **HP is THROUGHPUT** (swings-to-break). This is what
makes anti-exploit airtight: time-to-tunnel a high tier isn't "long," it's **infinite without the
right gear**, and gear costs materials gathered elsewhere.

| Material | Hardness (tool gate) | HP | Notes |
|---|---|---|---|
| Drywall | 0 (hands ok) | 30 | softest; starter mining |
| Wood Panel / Carpet | 1 | 60–80 | pry bar / shiv |
| Concrete Pillar | 3 | 400 | pick/hammer; ~8s with a starter pick |
| Rebar | 3 | 650 | bolt cutter |
| Steel Shutter | 4 | 900 | cutting torch / breaching charge |
| **Bedrock** | 5 | ∞ | level border — **flatly indestructible**, the only true wall |
| **BossFlesh** | 2-gateable | high | the boss core (see §1.4) |

**Tile data model (cheap by construction).** Keep `bool[] Wall` as the authoritative one-branch
collision/AI/render query (read hundreds of times/frame). Add **parallel arrays** sized `Cols*Rows`:
`byte[] Mat`, `short[] Hp`. **Invariant enforced everywhere: `Wall[i] == (Mat[i] != Air)`.** ~160 KB
for a 201×201 level, allocated once, zero per-frame cost. Mat/Hp are touched *only* by mining and
boss edits. **All runtime `Wall` mutations route through ONE method that bumps a `version` int** (so
the predator's cached path invalidates) — never write the arrays directly elsewhere. Material is
painted as a seeded post-pass after the maze carve (Bedrock ring, then archetype palette with
concrete/rebar veins as structural lines).

**Mining (channeled, never instant).** Hold dig against a tile; swings fire on a Dexterity-modulated
cadence dealing `tool.DigPower × StrengthMod` to `Hp[i]`. **Every swing emits a noise event into the
same `lastHeard` channel a ping uses**, with `loudness = Mat.NoiseScale × tool.NoiseScale` — louder
than a footstep, ~a ping; the pulse re-locks the predator every half-second. Stepping/getting
hit/releasing **cancels** the job but accumulated damage **persists** → the intended skilled play is
*dig-a-little / hide / repeat*, never a sustained tunnel.

**Tools — gate-then-throughput.** `tool.Tier ≥ Mat.Hardness` or the swing does **zero** damage and
clangs (loud, wasted). Ladder: Hands (T0) → Pry Bar/Shiv (T1) → Pick/Hammer (T2–3) → Bolt Cutter (T3)
→ Cutting Torch/Breaching Charge (T4) → *nothing reaches Bedrock (T5)*. Higher DigPower within a tier
= faster, but never crosses a tier. So "break anything" is gated behind "survive the habitat that has
the ore."

**Anti-tunnel — five independent, overlapping defenses** (remove any one, digging-to-exit is still
bad): (1) **hard tier-gate spine** — a generation-time assertion flood-fills the straightest
start→exit vector and guarantees a **depth-scaled contiguous T3+ spine** (re-roll the seed on fail);
the maze route is always faster than punching through; (2) **noise → predator**; (3) **standing-still
vulnerability**; (4) **the watcher/boss counter** — the profile learns "this human digs to shortcut"
as a *tactic frequency* and the boss re-pours/relocates and the narrator comments; (5) **economy
cost** — tool durability + consumable charges. **Digging is a tactical flank, never a strategic route.**

**Boss duel (the physical language of the fight).** The boss room is the one place reshaping is
real-time + adversarial via the LLM-Director → deterministic **Executor** → **Validator** pipeline,
using the *same array writes* mining uses: `RaiseWall(x,y,mat,hp)` / `Collapse(region)`. The Validator
runs a **reachability check after every edit** (player *and* boss) — never seals the player with zero
reachable floor, never walls the player's own tile — and a per-beat **build budget** (it reshapes
faster than you dig but can't instantly entomb). The core is **BossFlesh** (mid-tier mineable, high
HP) that **regenerates unless you're being unpredictable** — so you must defy your own profile *and*
mine to win. Carve-vs-build on shared tiles, symmetric operations on one data model.

---

## 2. Salvage · crafting · biome resources
**Everything breaks down to materials — but breaking is the loud/slow horror verb, not a free
vending machine.** Three salvage paths, all routed through hardness + a noise event:
1. **Tile mining** (above) — drops the wall's material.
2. **Item salvage** — `Recipe.Reverse()` returns **50–70%** of an item's materials (lossy → never a
   closed farming loop), time ∝ weight, a (quieter) noise channel. The relief valve for encumbrance.
3. **Corpse/entity salvage** — your recovered corpse's kit is reclaimed whole; **dead entities/traps
   are the only renewable source of the rarest Tier-3 materials** → the best gear forces you to fight/bait.

**Material taxonomy:**
- **T0 Bulk structure** (Drywall Dust, Splintered Wood, Bent Rebar…) — common, heavy, cheap fodder;
  their *weight* is the encumbrance pressure.
- **T1 Refined** (Sheet Metal, Sealed Wiring, Filament Cloth, Resin) — workbench-processed; backbone
  of tools/containers.
- **T2 Biome-signature** — 1–2 materials unique to each habitat; the *only* source of that biome's
  best gear (so clearing the roster = assembling the loadout).
- **T3 Anomalous / profile-active** (the signature tier no survival game has) — **Static Crystal**
  (jams `PredictNextDir`), **Memory Resin** (a crystallized fragment of a prior run's behavior),
  **Null Salt** (deadens noise). Drop only from entities/anomaly nodes/distilled Signal Fragments.

| Habitat | Signature resource | Crafts into |
|---|---|---|
| Level 0 — The Lobby | Damp Wallpaper + Buzzing Filament (prying flickers the lights → brief dark) | Filament Cloth → Muffled Wraps (lower movement noise), Dim Lantern |
| Level 37 — Poolrooms | Pool Tile + Chlorine Salt + Almond Silt | Null Salt precursor (noise-deaden), brewed Almond Water (sanity) |
| Level 1 — Habitable Zone | warehouse scrap / pipe stock | sheet-metal tools, barricades |

**Example recipes:** Pry Bar (T1 tool), Barricade (seal a corridor behind you — loud), Almond Water
(sanity restore), Muffled Wraps (quieter steps), Dim Lantern (small safe light), Null Salt Cell
(temporary noise-deaden — boss-counter). **Cozy-drift guards** (the central risk): salvage is lossy;
crafting pockets drain a quiet-meter; the workbench *pins you in place*; every swing is heard.
**Optimal play must remain "mine the minimum, descend," never "homestead."**

---

## 3. Ability scores (D&D-style)
The character is an entity with scores rolled at stranger-gen (point-buy envelope, no dump-stat
dead-on-arrival). **Minimal ship wires 3; the rest are post-launch depth.**

| Score | Drives | Ship? |
|---|---|---|
| **Strength** | carry capacity (§4), dig power (mild ±25%) | ✅ minimal |
| **Dexterity / Speed** | move speed, swing cadence, dodge | ✅ minimal |
| **Constitution** | HP/sanity pool, stamina | ✅ minimal |
| **Wisdom** | perception radius, sanity resistance, reading the dark | 🔜 post-launch |
| **Intelligence** | craft quality / recipe yield | 🔜 post-launch |

**Character-gen integration:** scores extend the stranger generator; appearance/bio remain cosmetic
(bio exists only to be read back to you by the Narrator). **In-run progression:** a stranger can
grow within a run (roguelike + RPG), but progression is **lost to the corpse** like gear — only the
*meta* (habitat knowledge, unlocked pools) and the watcher's profile persist. **Checks** resolve in
real time (no turn-based menus): stat thresholds gate actions (e.g. shove a heavy shutter, force a
barred door) and opposed rolls resolve instantly. **Balance:** stats buy *odds & reach*, never a
god-body, so skill + unpredictability always dominate against the learning predator.

### Profile integrity — the do-or-die guardrail (`StrangerNormalizer`)
Ability scores change *raw numbers* (speed, mine rate, carry), so without a hard boundary the watcher
would learn the **body's stat block instead of the human** — and the entire "it knows YOU" thesis
silently breaks. A single **`StrangerNormalizer` sits in front of every `Observe*` call**:
- speed logged as a **fraction of this body's BaseSpeed** (incl. the weight `speedMult`, so a heavy
  creeper and a light creeper log identically),
- reaction with the body's mechanical floor subtracted,
- trait/extreme-stat-forced channels logged at **near-zero EMA alpha** (trivial via the existing
  `Ema(cur, sample, a)` per-call alpha),
- **Markov / turn-bias kept at full weight** (dimensionless = pure human signal),
- **mining/crafting never observed** as raw seconds/damage — at most a *normalized dimensionless
  tactic* (dig-toward-exit-vs-resource ratio, dig-while-stressed boolean).

**This is a CI-asserted contract:** two extreme bodies performing the identical human action must log
identical profile deltas. Landed **before any stat/weight code** (phase P1).

---

## 4. Inventory & encumbrance (infinite backpack, weighted)
**No slot cap** — you can carry anything; the constraint is **weight**. `CapacityKg = 8 + 6 × STR`
(e.g. STR 1 ≈ 14 kg, STR 18 ≈ 116 kg). Every item/material has a Weight; heavy ore vs light herbs
force real choices. **Encumbrance is the leash** (lock 3 of the five-lock thesis): as load rises
toward capacity, **move speed drops** (a heavy haul → ~0.6× speed, *below* the learned predator's
+35% bonus) and **footstep noise radius grows** (the predator hears you sooner) — plus worse stamina
and dodge. So the loot you wanted is exactly why you can no longer outrun or out-quiet the intercept.
**Corpse interaction:** the entire loaded pack drops on death, pinned to the room — and its *weight*
makes the recovery run a real gamble (you must haul it back out past the same threats). **UI:** a
weight bar with a clear encumbered/over-encumbered threshold; salvage is the in-field relief valve.

---

## 5. Persistence (body vs watcher)
- **Persists:** `PlayerProfile` (the watcher's knowledge of YOU), Memory, Signal Fragments, the
  **recipe codex**, ability-score/level **meta** + habitat knowledge.
- **Lost to corpse (recoverable):** all carried gear + materials + in-run consumables + crafted tools,
  pinned to `(LevelSeed, tileX, tileY)`.
- **Resets per run:** half-mined wall state (it's seeded level geometry — otherwise corpse-runs become
  trivial re-digs). The corpse cache is the only persisted world delta.
- T3 anomalous mats **decay-into-Memory** if unrecovered, so a botched corpse-run still advances meta.

---

## 6. Minimal shippable version vs post-launch
**MINIMAL (the convergent intersection of all four specialists' minimal slices):** native hunt loop
wired (P0) → `StrangerNormalizer` + CI gate (P1) → **one habitat**, ~4 materials
(Drywall/Wood/Concrete/Bedrock), 2 tools (Hands/Pick), channeled mining feeding `lastHeard`, the
generation-time anti-tunnel assertion, fixed Satchel encumbrance (`8+6×STR`, weight→speed +
weight→noise only), full-drop corpse cache, **3 of 5 stats** (STR/DEX/CON), ~6 recipes, recipe-codex
persists / gear lost-to-corpse, and a **scripted (non-LLM) boss** using `RaiseWall`/`Collapse`.

**Explicitly POST-LAUNCH:** the live LLM Director, the Tier-3 anomalous/profile-active economy,
per-biome signature materials beyond ~3 habitats, the salvage-*everything* reverse-recipe system,
craftable rucksack tiers, BossFlesh regen-tied-to-unpredictability, WIS-perception + INT-craft depth,
stamina/dodge coupling, cache decay, partial-loot ferrying, Seam Chalk / No-Clip / Null Salt Cell.

## 7. Survival-layer risks & open questions
**Risks:** profile pollution (normalizer is do-or-die); **noise balance is the whole game** (burst-dig
survivable, sustained tunnel suicidal — only tunable in playtest vs the real predator); cozy-drift /
genre betrayal; **softlock/validator gaps** (reachability check after *every* edit + fuzz test);
version-invalidation (one mutation method bumps the version); scope creep (minimal slice discipline).

**Open questions:** half-mined wall state on corpse-run (recommend reset); mining-as-profile-signal
(observe a normalized *tactic* ratio, never raw seconds); encumbrance-vs-profile normalization formula
(divide by `BaseSpeed × dexMult × speedMult` — confirm + unit-test); does a max-STR mule break the
anti-tunnel noise math (pair high STR with low DEX so the mule is slow/loud); dodge i-frames vs
"evasion-not-power" (does dodge clear a lunge, or become a spammable tank?); workbench persistence
(recommend it drops to the corpse cache like all gear).
