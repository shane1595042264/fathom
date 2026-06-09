# Creatures, Senses, Movement & Voice

> The creature layer (ADR-0009): any-living-thing characters with asymmetric capability kits,
> multi-sense perception (**sonar is now just one sense**), an expanded movement verb-set, and
> **privacy-first local voice input** the Narrator hears and remembers. Companion to
> [`DESIGN.md`](DESIGN.md) / [`SYSTEMS.md`](SYSTEMS.md).

## How this deepens the thesis
The body is a **costume**; the watcher is **permanent** — and now it can **hear you.** Three
invariants hold without exception:
1. **The watcher learns the human, not the body.** The `StrangerNormalizer` extends from "divide out
   the stat block" to "divide out the whole **body** (CreatureKit + stats + weight)," so a dog
   flooring it and a human flooring it log the *identical* profile delta. **Voice is the one channel
   the body can never disguise** — pure human signal.
2. **Freedom serves dread, species-wide.** Every capability across every body routes through the one
   channel the predator consumes — **noise into `lastHeard`.** A dog is faster but its sprint is
   louder; a cat climbs but a leap thumps; **speaking aloud is a locatable human noise event** on top
   of being remembered.
3. **Sonar is demoted.** The in-repo render-target echolocation becomes **one depositor** among
   Sight / Hearing / Scent / Echo on the *same* two-buffer pipeline (`_revealRT` world-space +
   `_lightRT`). It's owned by the Bat; the existing **Sonar-Dark archetype** is just its home habitat.

---

## 1. Species — the `CreatureKit` (pure data, like `MaterialDef[]`)
A species is a data record in one static `CreatureKit[]` table (zero per-frame cost — *a new species
is data, not code*):
- **Size** `{Tiny, Small, Medium, Large}` → collision radius, which gaps/vents/crawlspaces are
  passable (a rat fits where a human can't), footstep-noise radius, silhouette to the predator.
- **Senses** (a struct of per-modality params, not a bool set): `Sight {cone°, range, nightFactor}`,
  `Hearing {radius, sensitivity}`, `Scent {trailRange, decay, entityScentRange}`, `Echo {range,
  cadence, passive}`, `Vibration {...}`. Usually 1 dominant + 1–2 weak. Their union = what you perceive.
- **MoveVerbSet** `MoveVerb → {SpeedMult, Stamina/s, NoiseScale, Enabled}` (see §3).
- **canCraft** (bool) — gates the entire ADR-0008 mine/craft/salvage tree. Humans true; most animals
  false → they can't punch hardness gates and must **route around** them.
- **Specialty** (the reason to want this body) + **Limitation** (the hard fear-tax that makes it a gamble).
- **Derived** (computed at gen, *never* a profile signal): BaseSpeed, CapacityKg (`8+6×STR`; a
  non-crafter's pack is tiny), CollisionRadius, FootstepRadius.

**The roll:** each run, a seeded weighted draw from your **unlocked pool** → instantiate the kit →
roll STR/DEX/CON + a cosmetic bio on top. **Unlocks** are meta (the only thing besides the profile
that persists): you start with **Human + one common animal**; new species enter the pool by **roster
progress** (clear the Echo levels → Bat; clear scent-heavy levels → Dog; carry an animal's "memory"
out). So the 10-archetype world doubles as the unlock tree.

| Species | Size | Dominant sense | Crafts? | Specialty | Limitation | Ship |
|---|---|---|:--:|---|---|:--:|
| **Human** | Medium | Sight + Hearing (weak in dark) | ✅ | tools/craft — turns on the whole immersive-sim tree; the body the mic attaches to | worst senses; blind in dark without a crafted lantern | ✅ floor |
| **Dog** | Medium | **Scent** (smells entities/clues at range, through walls) | ❌ | long-range early warning + auto-flags clues/loot/corpses; finds the path | can't craft; brutal but **loud** sprint; weak sight | ✅ floor |
| **Cat** | Small | dark-Sight | ❌ | near-silent **Crawl** + **Climb** onto ledges the predator may not follow | can't craft; fragile; small carry | ✅ floor |
| **Rat** | Tiny | Hearing/Smell | ❌ | fits hidden vents/gaps no one else can | one hit dies; helpless in the open | 🔜 post |
| **Bat** | Small | **Echo** (passive 360° sonar — *the demoted core*) | ❌ | "sees" in pure dark with no light at all | blind/helpless in Echo-dead habitats | 🔜 post |
| **The Hollow** | ? | uncanny | ❌ | a late, narrator-acknowledged milestone body | (spoiler) | 🔜 post |

The kit is the *only* thing that changes between bodies. The predator reads, as always, **only**
`lastHeard` + the normalized profile.

## 2. Senses — multi-modal perception on the existing render target
Each sense is **one reveal pass** layered on the in-repo two-buffer pipeline. Distinct **hue *and*
form** per modality keeps four overlays from muddying into noise.

| Sense | How it perceives | Render approach | Hue/form |
|---|---|---|---|
| **Sight** | a forward **cone** of clear vision | screen-space visibility-polygon cast restricted to an arc, **drawn fresh every frame — never into the world-space `_revealRT`** (or it smears) | warm white, hard cone |
| **Hearing** | brief blooms where sound happens | a **desaturated, short-lived reuse** of the sonar bloom | grey-blue, soft pulse |
| **Scent** | lingering trails + entities/clues at range | the **one new module**: a **low-res per-tile decaying `scentRT`** (fade-and-splat), dog-only read | amber/magenta, blobby trail |
| **Echo (sonar)** | expanding ping reveal | the in-repo `_revealRT`/`_lightRT` **reused verbatim** — proves the demotion is structural | cyan, expanding ring |

**Scent is what makes Hide a real decision** (it lingers where you were) and delivers the dog's
sense-at-range + clue-finding + tracking. **Minimal set:** Sight + Hearing + Scent implemented; Echo
*registered as a depositor* but its creature (Bat) is post-launch.

## 3. Movement verbs — all metered through stamina + noise
`MoveVerb {Walk, Sprint, Crawl, Jump, Roll, Hide, Climb, Swim}`, each a `VerbProfile {SpeedMult,
Stamina/s, NoiseScale, Enabled}`; species enable different subsets.

| Verb | Effect | Stamina | Noise | Species variation |
|---|---|---|---|---|
| **Walk** | baseline | none | low | all |
| **Sprint** | fast | high drain | **loud** (big `lastHeard`) | dog brutal; cat moderate; heavy load disables it |
| **Crawl** | slow | cheap | **near-silent** (generalizes the old quiet-hack) | cat silent; dog can't truly quiet |
| **Hide** | ~0 speed, **concealment** (silhouette + footstep radius → ~0), can't act | low | enter/exit **spike** | the horror beat (lockers/under things) |
| **Jump / Roll** | burst reposition | medium | one-shot **landing spike** | dog leaps; human clumsy |
| **Climb** | vertical onto ledges/shelves the predator may not follow | drain | low | **cat signature** — *the explicit cut line if the flat-grid timeline is at risk → defer* |
| **Swim** | water traversal | drain | medium | 🔜 post |

One **stamina** bar gates the economy; a **3-band encumbrance** (heavy disables sprint, scales noise)
ties to ADR-0008 weight. **Hide** is defeated by the watcher having *heard* you go in + profile-driven
hide-checking + scent lingering at the spot — so it's a gamble, not a safe button. **Minimal set:**
Walk, Sprint, Crawl, Hide, (Climb if the flat grid allows, else deferred).

## 4. Voice input — the Narrator hears you (privacy-first, POST-LAUNCH)
**Local, free, offline.** [Whisper.net](https://github.com/sandrohanea/whisper.net) (whisper.cpp
bindings) targets the exact `net8.0` build; a CPU `base.en-q5_1` model (~57 MB) decodes a short
utterance in well under a second. **No paid/cloud API, ever** (your "don't spend money").

**Privacy / consent (a hard product requirement, not a nicety):**
- **Default OFF.** Explicit one-time **consent** gate before any capture.
- **Verifiably local-only** — zero network except a gated one-time model download; audio **never
  uploaded or transmitted**, never written to disk.
- **Always-visible REC indicator** + one-click master off.
- **Push-to-talk** at launch (no always-on); VAD/always-on is a later opt-in.
- The store page must **say all of this plainly** — a horror game that "listens to your mic" reads as
  spyware unless it's obviously trustworthy.

**Content safety (`VoiceSanitizer` boundary):** transcripts pass through PII-redaction + a slur
denylist **before** reaching the Narrator; it **never echoes verbatim unless clean**, and **never
reads PII back.** Safety is deterministic, independent of any model.

**What it does:** a **session-only `VoiceMemory`** feeds the existing caption-only Narrator — e.g. one
Act-II **verbatim throwback** ("you said you weren't scared"). Cross-run persistent voice memory
("it quotes you from three bodies ago") is the most terrifying *and* most sensitive — **opt-in,
separate, off by default.**

**Noise tie-in:** a **voiced onset** injects a noise event into `lastHeard` (sub-50 ms, **never gated
on transcription latency**) — whisper is cheap, shout is loud — so speaking is a real risk dial, kept
*separate* from the content-memory path so the noise doesn't discourage talking.

**Graceful fallback:** the game is **fully playable with no mic, ever.** The profile's voice channel
is **stubbed at full-weight, body-invariant from day one**, so adding voice later needs no normalizer
rework. **Engineering caveat:** MonoGame 3.8.1's `Microphone` is documented flaky
([GH #8058](https://github.com/MonoGame/MonoGame/issues/8058)) → wrap behind an `IAudioCapture`
abstraction with an NAudio fallback + a startup mic self-test.

## 5. Profile integrity across species (the do-or-die gate, extended)
The `StrangerNormalizer` baseline expands from "this stat block" to "this **body**": speed as a
fraction of *this body's* max (`BaseSpeed × dexMult × weightSpeedMult × verbSpeedMult`), movement
logged as a **normalized verb-choice against the body's enabled set** (the generalized successor to
`OpenWaterBias`), **Markov/turn-bias at full weight with a legal-move-set guard** (so a Large body's
forced turns aren't mislearned as preferences), body-forced channels suppressed (a dog that *can't*
be quiet) at ~0 EMA alpha, mining tactic observed only for `canCraft` bodies, and the **voice channel
stubbed full-weight body-invariant.** **CI assertion (hard P1 gate, before any species code):** two
*wildly different* bodies (Dog/Cat at the floor) performing the identical human action → **identical
profile deltas.**

## 6. Minimal shippable vs post-launch
**Floor:** 3 species (Human/Dog/Cat) · Sight + Hearing + Scent (Echo registered, Bat deferred) ·
Walk/Sprint/Crawl/Hide (Climb if the flat grid allows) · stamina + 3-band encumbrance · the extended
normalizer + CI gate · **no voice.** This proves the whole thesis in three bodies: sonar demoted
(Echo is one of four passes), freedom-serves-dread (sprint loud / crawl quiet / craft loudest), and
the profile surviving a craft-human vs a silent-cat via the CI-gated normalizer.

**Post-launch:** voice (the full local-Whisper subsystem) · Bat/Rat/Hollow + flight/vibration/passive
echo · Jump/Roll/Swim + the vertical **Climb** layer · always-on VAD · cross-run `VoiceMemory` ·
the LLM-Director injecting recent utterances · the boss's **force-a-body** verb ("be a dog again").

## 7. Risks & open questions
**Risks:** profile pollution **across species** (the do-or-die gate — bodies differ far more than stat
blocks); **species balance vs the learning predator** (each specialty needs a real tax or it's an
always-pick); **mic as a trust/reputation liability** (one bad on-stream echo = damage → kept
post-launch, never rushed); **unwinnable runs** for non-craft bodies vs the anti-tunnel T3 spine (the
generation reachability assertion must guarantee a **routing** solution for the *smallest/weakest*
body, and spawns respect size/gap passability); **render readability + the buffer-boundary bug** (sight
screen-space, never world-space); **MonoGame mic flakiness**; **8-dir Markov distortion** on bodies
with different legal-move sets (log chosen-vs-legal).

**Open questions:** pure-random species roll vs a "choose your last body" token (recommend random at
launch); where Climb reconciles with the flat `bool[] Wall` grid (recommend Climb is the cut line);
does voice-noise discourage the talking the memory feature wants (whisper cheap / shout loud, content
kept separate); session-only vs cross-run VoiceMemory (session-only default, cross-run opt-in); how
species unlocks map to the boss gate (avoid RNG soft-blocks); the starting-animal must be able to
clear its own unlock habitat by routing (chicken-and-egg); the force-a-body path must route through
the normalizer.
