# ADR-0009: Creature layer — any-species characters, multi-sense perception, movement verbs, voice input

- **Status:** Accepted
- **Date:** 2026-06-09
- **Deciders:** team
- **Builds on:** ADR-0007 (roguelike), ADR-0008 (immersive-sim). The Narrator/profile thesis is
  unchanged and in fact deepened (it now *hears* you).

## Context
The randomized "stranger" was implicitly a human with different stats. The player wants the fiction
that **any living thing can fall into the Backrooms**, an expanded movement verb-set, and a
**microphone** feature where the Narrator hears and remembers what the player says aloud. This also
reframes the sonar/echolocation system as just *one* sense among many.

## Decision
Generalize the character into a **randomized SPECIES** with an asymmetric capability kit, add a full
movement verb-set, make perception **per-creature**, and add **privacy-first local voice input**:
1. **Any-species characters.** Each run you are a random creature (human, dog, cat, …) with a
   capability kit: sensory loadout, movement verbs, craft-capable flag, size, a **specialty** and a
   hard **limitation**. E.g. *Human* crafts/uses tools but has weak senses; *Dog* can't craft but is
   small, fast, and **smells entities at range + finds clues.** Bodies differ wildly; **the watcher
   still profiles the human** (the `StrangerNormalizer` extends across species).
2. **Sonar is one modality.** The existing render-target echolocation reveal becomes **one sense**
   (e.g. a bat's). Different species perceive via **sight cones / scent trails / hearing / sonar**,
   layered on the existing render-target pipeline. (Amends ADR-0002 again: sonar is now a *per-creature
   modality*, not a per-level mechanic and not the core.)
3. **Movement verbs:** sprint, crawl, jump, roll, hide, (climb) — each costing stamina and emitting
   **noise** into the predator's channel (sprint loud, crawl silent), with species variation.
4. **Voice input (microphone), privacy-first.** A **local, free, offline Whisper** (whisper.cpp /
   Whisper.net) transcribes the player's speech; the Narrator **remembers it and reacts.** Voice is
   pure human signal → the strongest "it knows YOU" beat yet, and intensely streamable.

## Consequences
- Positive: huge identity/playstyle variety from asymmetric species; perception becomes a real
  systems axis; the mic makes the watcher *literally* hear you — a one-of-a-kind horror/stream hook;
  all of it reinforces the core thesis (more bodies, same watched human, now heard).
- Negative / risks: **another scope multiplier** (multi-sense rendering, per-species balance vs the
  learning predator, an audio-ML dependency). The mic is the highest-trust-stakes feature in the game.

## Mandatory guardrails
- **Microphone privacy (non-negotiable):** **opt-in only**, **local-only transcription, never uploaded
  or transmitted**, an always-visible recording indicator, one-click disable, and **content-safety**
  on what reaches the LLM (never echo slurs/PII back). The game is **fully playable with the mic off**
  (graceful fallback). No paid/cloud API — local Whisper only (the user's explicit "don't spend money").
- **Freedom serves dread:** speaking aloud is also in-game **noise** the predator can hear (position),
  not just memory fuel; movement verbs meter through the same noise channel.
- **Profile integrity across species:** the `StrangerNormalizer` normalizes across wildly different
  bodies (a dog's base speed ≫ a human's) so the profile learns the human's tendencies, not the body.

## Alternatives considered
- **Human-only characters** — rejected: forgoes the requested creature variety and the sonar-as-one-sense
  generalization. **Cloud speech API** — rejected: cost + privacy; local Whisper only.

## Note
Not legal advice. The microphone feature in particular must meet platform (Steam) and regional privacy
requirements; treat the consent/local-only/never-transmit posture as a hard product requirement, and
get a privacy review before shipping mic capture. Scope governed by the phase plan in `docs/DESIGN.md`.
