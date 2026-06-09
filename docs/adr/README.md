# Architecture / Design Decision Records (ADRs)

This folder is the **decision log** for FATHOM. Every time we make or change a
significant decision — engine, core mechanic, scope, business model — we write (or
supersede) an ADR here. This keeps the *why* behind each pivot, so we never re-litigate
settled questions or lose the reasoning behind a shift.

## Process (agreed 2026-06-09)
- **Design before build.** A decision shift gets an ADR *before* we burn effort building it.
- One ADR per decision. Don't edit a decided ADR's meaning — supersede it with a new one
  and mark the old as `Superseded by ADR-XXXX`.
- Keep them short. Context → Decision → Consequences → Alternatives.
- Numbered sequentially. Use `0000-template.md` as the starting point.

## Index
| # | Decision | Status |
|---|----------|--------|
| [0001](0001-browser-prototype-zero-deps.md) | Zero-dependency browser prototype first | Superseded by 0004 |
| [0002](0002-core-mechanic-sonar-echolocation.md) | Core mechanic: sonar echolocation ("ping to see, it hears you") | Accepted (under review in brainstorm) |
| [0003](0003-adaptive-learning-nemesis-and-local-llm.md) | The "it learns you" adaptive nemesis + optional local LLM voice | Proposed |
| [0004](0004-engine-native-csharp-monogame.md) | Engine: native C# / MonoGame (not web, not UE5) | Accepted |
| [0005](0005-process-design-first.md) | Process: brainstorm + design doc + ADR before building | Accepted |
