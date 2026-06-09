# ADR-0001: Zero-dependency browser prototype first

- **Status:** Superseded by ADR-0004
- **Date:** 2026-06-09
- **Deciders:** team

## Context
The dev machine had no Node, Python, or game-engine toolchain installed — only a browser
and Git. We wanted a *playable, verifiable* artifact fast, to prove the core mechanic
before committing to a heavy stack.

## Decision
Build the first prototype as a zero-dependency, zero-build vanilla-JS + HTML5 Canvas +
Web Audio game (classic scripts; runs by opening `index.html`), with an Electron wrapper
documented for Steam.

## Consequences
- Positive: A complete, polished, design-validated prototype was built and reviewed
  entirely in-browser with screenshot verification. It remains in the repo as the design
  proof (`index.html`, `src/`) and a playable reference.
- Negative: Browser/single-file delivery does not read as a "serious" shippable title and
  is not the desired immersive experience.

## Alternatives considered
- **Native engine up front** — rejected at the time because no toolchain was installed and
  we wanted a fast, verifiable proof of the mechanic. Revisited in ADR-0004.
