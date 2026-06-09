# ADR-0002: Core mechanic — sonar echolocation ("ping to see, it hears you")

- **Status:** Superseded by ADR-0006 (echolocation demoted from core to a per-level mechanic for dark levels)
- **Date:** 2026-06-09
- **Deciders:** team

## Context
We wanted a single, elegant, Tetris-grade mechanic with a built-in double-bind that scales
difficulty forever and produces streamable horror moments. An adversarial design panel
(game-design / horror / commercial judges) compared three candidates.

## Decision
Core mechanic = **echolocation**: the world is dark; a sonar **ping** briefly reveals
geometry, but a blind, sound-hunting creature hears every ping. Oxygen adds a second bind.
The panel selected this unanimously.

## Consequences
- Positive: Elegant, readable, infinitely tunable; strong dread; clear streamable beats.
- Negative: Top-down/abstract framing was felt to be non-immersive (see ADR-0004 for the
  native move; immersion is a brainstorm topic).
- Follow-up: Under review — the brainstorm may keep echolocation as the core, fold it into
  a larger "genius" mechanic, or replace it. Any change supersedes this ADR.

## Alternatives considered
- **Gaze / "don't look"** and **breath-holding / sound-hiding** — fully fleshed out and
  scored lower by the panel on elegance + influence potential.
