# FATHOM — Living Design Doc

> **Status: BRAINSTORM (WIP).** This is where we land the *genius* core before building.
> Decisions get promoted to ADRs in [`docs/adr/`](adr/). Nothing here is final until we say so.

## North star
A horror game with **one never-before-felt mechanic** — Tetris-elegant to learn, impossible
to master — wrapped in enough content to be a serious title (not a tech demo). It must create
**personal, emergent dread** and **streamable "did you SEE that?" moments**.

## Locked (decided)
- **Engine:** native C# / MonoGame → real `.exe`, Steam-ready, verifiable from CLI. (ADR-0004)
- **2D is fine.** The genius is the mechanic, not the renderer. (ADR-0004)
- **Process:** design-first; ADR per shift; all progress on GitHub. (ADR-0005)

## Open (the brainstorm)
- The **core mechanic / fantasy**. Echolocation (ADR-0002) is the incumbent but on the table.
- Structure: roguelite vs authored campaign vs both.
- How far the local-LLM voice goes. (ADR-0003)

## Design principles
1. **One verb, deep.** A single action that creates the whole game (ping / look / record / listen).
2. **The double-bind.** Doing the thing you need to do is also what dooms you.
3. **Emergent > scripted.** Dread should come from systems reacting to *this* player, not cutscenes.
4. **Streamable by construction.** Every run should be able to produce a clip.
5. **Fair, readable horror.** No cheap deaths; the player can always see why they died.

---

## Concept candidates (genius directions)
Each lists: the **hook**, the **novel system**, why it's **genius**, the **streamable moment**,
the **content path**, and **feasibility/risk** in MonoGame.

### C1 — THE NEMESIS THAT KNOWS YOU  ⭐ (extends ADR-0003)
- **Hook:** One persistent monster that **profiles how you play across runs** and adapts — then
  *tells you* what it has learned (suit-AI / local-LLM voice). Horror = **being known**.
- **Novel system:** a cross-run behavioral model (ping rhythm, reaction time, panic tells,
  flee bias, movement Markov) drives the AI *and* the personalized dialogue.
- **Genius:** the antagonist is **unique to you**. No two players' nemeses are the same.
- **Streamable:** "it predicted exactly where I'd run." "it called out my habit."
- **Content:** campaign where the nemesis evolves in stages; roguelite runs feed the model;
  meta-narrative of an entity studying you.
- **Feasibility:** HIGH (deterministic AI already prototyped; LLM optional). **Risk:** making
  "learning" *felt* yet fair.

### C2 — THE GAME IS HAUNTED (corrupted systems / fourth wall)
- **Hook:** the entity lives in the game's **systems** — the HUD lies, the map redraws, the
  save file rots, menus glitch, it reads your username/clock. (Inscryption / Eternal Darkness / DDLC lineage.)
- **Novel verb:** you must tell **real information from corrupted** information.
- **Genius:** dread from the meta-layer; intensely streamable ("did the GAME just do that?").
- **Content:** descent where corruption escalates; trust/distrust puzzles; "the game breaks" set-pieces; multiple endings.
- **Feasibility:** MEDIUM (bespoke UI trickery; tasteful execution is hard). **Risk:** gimmick fatigue.

### C3 — DEATH ECHOES (your past runs hunt you)
- **Hook:** every death leaves your **replaying ghost** in the world; the monster is **made of
  your previous selves**. You sabotage yourself across attempts.
- **Novel system:** record-and-replay of prior runs as live hazards; the level fills with your history.
- **Genius:** failure compounds **tangibly**; the horror is your own pattern, made flesh.
- **Streamable:** "I got killed by my own ghost." Escalating each death.
- **Content:** roguelite; bosses = amalgams of your deaths; a place that keeps everyone who dies.
- **Feasibility:** MED-HIGH (needs a deterministic sim for faithful replays). **Risk:** readability with many ghosts.

### C4 — SOUND IS EVERYTHING (echolocation, elevated)
- **Hook:** keep the dark + sonar, but the **whole ecosystem navigates by sound**. You **compose
  and weaponize** the soundscape: mimic calls, lay decoy pings, bait monsters into each other, go silent.
- **Novel verb:** improvising with sound as a tool *and* a threat.
- **Genius:** a horror game **played through sound design**.
- **Content:** zones with distinct sonic fauna; tools/upgrades; sound puzzles. (Closest to what's built.)
- **Feasibility:** HIGH. **Risk:** conveying an invisible world-state without killing the darkness.

### C5 — THE OBSERVER (perception is the verb)
- **Hook:** things only move when **unobserved** (or only when observed). Gaze / light / camera
  is a managed resource; you ration attention while escaping. Weeping-Angels as a full system.
- **Novel verb:** *looking.*
- **Genius:** elegant, pure, tense.
- **Feasibility:** MEDIUM (robust visibility + AI). **Risk:** feels familiar unless twisted hard.

### C6 — TWO OF YOU (causality / loop horror)
- **Hook:** control **two divers / timelines**; actions echo between them; the monster persists
  across the loop; you cooperate with your past self.
- **Novel verb:** planning across two synchronized timelines.
- **Feasibility:** MED-HARD (determinism + design complexity). **Risk:** clarity.

---

## Leading synthesis (proposal to debate)
**C1 × C2 — "the intelligence that knows you, and breaks the game to prove it."** A nemesis that
learns *you*, and expresses that mastery by **corrupting the game's own systems** against you: it
fakes the HUD *because it knows you trust it*; it whispers your own habits back through the suit-AI;
it rewrites the map to send you down the route you always pick. Echolocation can live inside this as
the "sense" you can no longer trust. Fresh, GOTY-flavored, and built to go viral.

## Open questions for us
1. Which flavor of fear do we build the genius core around? (being-known / game-haunted / your-past / sound / perception / time)
2. Roguelite, authored campaign, or both?
3. Do we keep echolocation as the sensory core, or pick a new one?
4. How essential is the LLM voice vs. an authored voice?

## Decision log
See [`docs/adr/`](adr/). Current: 0004 (engine), 0005 (process) accepted; 0002 (echolocation)
under review; 0003 (nemesis + LLM) proposed.
