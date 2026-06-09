# ADR-0007: Roguelike core — infinite runs, randomized strangers, corpse-run, LLM final boss

- **Status:** Accepted
- **Date:** 2026-06-09
- **Deciders:** team
- **Amends:** ADR-0006 (the Narrator concept holds; the *structure* changes from
  campaign-first to roguelike-first, and the finale becomes an LLM-driven boss).

## Context
ADR-0006 framed the game as an 8-level campaign + an endless mode. That under-uses the
Backrooms' hundreds of levels and the "it learns you" tech. We want a far more ambitious,
infinitely replayable core with a genuine climax.

## Decision
The **main game is an infinite, procedural roguelike** (Hades-grade meta-progression — every
run you gain something; you never truly fail). A short curated **campaign** is a guided taste.
Key systems:
1. **Randomized "stranger" characters.** Each run you are a procedurally-generated random
   person who fell into the Backrooms (distinct appearance/traits/perks/kit). **The character
   changes every run, but the persisted `PlayerProfile` tracks the *player* across all of
   them** — so the Narrator keeps knowing *you* no matter which body you wear. (This makes the
   randomized-character choice serve the core theme instead of fighting it.)
3. **Corpse-run death-drop.** Death leaves your corpse + carried items in that room; a later
   character can recover them by returning — but levels are random, so it's not guaranteed.
   Death becomes generative and less punishing while keeping stakes.
4. **Gather-to-break-through items.** You collect tools/items across a run and use them to beat
   the finale.
5. **Level roster breadth.** Many wiki levels via an archetype-skin system; work through the
   roster to **unlock the final boss.**
6. **The LLM-driven final boss = the Narrator.** The final room is driven in real time by the
   Narrator (an LLM with full behavior-knowledge of the player): it reshapes the map and summons
   the full entity roster to stop you. Its identity: **a former "stranger" who conquered the
   dimension** and now controls his room. You win by using gathered items **and being
   unpredictable** — acting against your own profiled patterns. (Built as **LLM-as-Director sets
   intents; a deterministic Executor applies them within a constrained, safe, rate-limited
   action space**, with a fully deterministic fallback boss when the LLM is off/unavailable.)

## Consequences
- Positive: Massive replayability; the randomized-stranger + persistent-profile pairing is a
  genuinely novel, thematically perfect hook; the corpse-run softens roguelike frustration; the
  LLM finally has a high-impact, diegetic role (the boss), not just flavor.
- Negative / risks: **Much larger scope** (roguelike systems + character gen + item build +
  meta-progression + a real-time-mutable LLM boss). The real-time LLM boss is the single
  riskiest piece (latency, safety, "controls the level however it wants" must be bounded). Must
  phase hard and keep the deterministic fallback as the shippable floor.

## Alternatives considered
- **Campaign-first (ADR-0006 as written)** — kept as a curated subset, not the main mode.
- **Single fixed character (Hades-style)** — rejected: randomized strangers + persistent profile
  is the better fit for "the watcher knows YOU, not the body."

## Note
Strategy summary, **not legal advice.** Real-time LLM-driven content also needs a content-safety
pass (see ADR-0006 guardrails). Confirm scope feasibility per the phase plan in `docs/DESIGN.md`.
