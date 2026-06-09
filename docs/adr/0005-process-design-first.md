# ADR-0005: Process — brainstorm + design doc + ADR before building

- **Status:** Accepted
- **Date:** 2026-06-09
- **Deciders:** team

## Context
Several direction shifts (delivery target, engine, core ambition) happened mid-build, which
risked spending effort building things we then changed. We want a *genius* idea locked
before heavy implementation.

## Decision
Adopt a **design-first** workflow:
1. Brainstorm the core concept until we agree it's genius-tier.
2. Capture it in the living design doc (`docs/DESIGN.md`).
3. Record each decision/shift as an ADR here *before* building it.
4. Then implement, verifying increments with screenshots and pushing to GitHub.

## Consequences
- Positive: Less wasted build effort; clear, auditable reasoning; remote-friendly (all
  progress + decisions live on GitHub for review without running anything locally).
- Negative: More up-front writing before code — accepted as worth it.

## Alternatives considered
- **Keep building and steer as we go** — rejected; it caused the rework this ADR prevents.
