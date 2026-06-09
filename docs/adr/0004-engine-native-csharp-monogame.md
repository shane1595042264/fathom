# ADR-0004: Engine — native C# / MonoGame (not web, not UE5)

- **Status:** Accepted
- **Date:** 2026-06-09
- **Deciders:** team

## Context
The browser/single-file delivery (ADR-0001) did not feel like a serious, shippable title.
We wanted a real native game. UE5 was requested. The constraint: the work is done by an
agent through a terminal, file tools, and a browser — there is no human in an editor here.

## Decision
Build the shipping game **natively in C# with MonoGame** (the framework behind Celeste,
Stardew Valley, Bastion, Axiom Verge). It compiles to a real native `.exe`, ships on Steam,
and — critically — is **pure code, buildable and verifiable from the CLI** (`dotnet build`,
`dotnet run -- --shot` for headless screenshots). 2D is accepted.

## Consequences
- Positive: Real native executable; serious pedigree; fully buildable + verifiable in this
  environment (proven: SDK installed, project builds 0-error, lit slice screenshotted).
- Negative: Larger codebase than the prototype; Steam packaging via Steamworks.NET to wire.
- Supersedes ADR-0001's web delivery. The JS prototype stays as a design reference.

## Alternatives considered
- **Unreal Engine 5** — rejected *for this workflow*. UE5 development is ~80% interactive
  Editor work (levels, Blueprints, materials, nav, lighting); the agent cannot operate the
  Editor, install/compile the ~100 GB engine, or *verify* a build here. It would mean
  shipping unverifiable C++ for the user to debug. Revisit only if a human takes the Editor
  seat. The "genius" is the mechanic, not the renderer.
- **Godot** — viable (text scenes, CLI export) but still editor-centric for assets; MonoGame
  is more code-first and lower-risk to drive headlessly.
- **Three.js/WebGPU first-person (web)** — rejected: still a web game.
