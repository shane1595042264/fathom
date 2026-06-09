# ADR-0003: The "it learns you" adaptive nemesis + optional local LLM voice

- **Status:** Proposed
- **Date:** 2026-06-09
- **Deciders:** team

## Context
A pure chase-and-die loop is not "revolutionary." The standout, ownable hook we landed on
in discussion: a monster that **learns the player across runs** and uses it against them —
horror by *being known*. A local LLM was floated for dynamic, personalized dialogue.

## Decision
Adopt an **adaptive predator** backed by a persistent **PlayerProfile** (ping rhythm,
reaction time, stress turn-bias, flee preference, movement Markov model) saved across runs,
which the AI uses to predict and intercept the player and which surfaces as a **dossier**.
A **voice** layer (the dive-suit AI that turns on you) delivers personalized lines: an
authored "ghostwriter" works everywhere and a bundled local LLM (LLamaSharp / llama.cpp,
grammar-constrained) upgrades it to fully dynamic. The mechanic is deterministic JS/C#; the
LLM only *enhances* the voice and degrades gracefully.

## Consequences
- Positive: Genuinely novel, streamable, marketable ("the game that learns to hunt you").
  Core ships without the LLM; LLM is optional/bundled.
- Negative / risks: Tuning the AI so "learning" is *felt* but fair; LLM adds app size and a
  native dependency; writing must keep a tiny model on-tone (grammar constraints).
- Status note: Proposed pending the brainstorm — it may become THE core, or one pillar of a
  larger genius concept.

## Alternatives considered
- **In-browser LLM (WebLLM/WebGPU) as the headline feature** — deferred; flaky on weak
  hardware and the *mechanic*, not the model, is the revolution.
