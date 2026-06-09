# ADR-0006: Pivot to the Backrooms + the omniscient Narrator as the signature

- **Status:** Accepted
- **Date:** 2026-06-09
- **Deciders:** team
- **Supersedes:** ADR-0002 (echolocation as core). **Folds in:** ADR-0003 (learning model).

## Context
We wanted an existing-IP setting for built-in audience/traction, and a genuinely novel,
ownable hook to stand out. Research confirmed: 500+ Backrooms games exist on Steam but the
acclaimed ones are all first-person 3D; the few **2D** Backrooms games are thin shovelware.
**No robust, faithful top-down 2D Backrooms exists** — a real gap. Separately, the Backrooms
mythos is effectively open (4chan-origin idea + generic aesthetic are unprotectable; wiki
levels are CC BY-SA; Kane Pixels/A24 original content is off-limits).

## Decision
Build **the definitive top-down 2D Backrooms game** in C#/MonoGame. Structure = **Both**: a
handcrafted **campaign** descending through iconic levels + an endless procedural **"no-clip"
mode**. The ownable, signature differentiator is an **omniscient NARRATOR** (Stanley
Parable-style) that is **secretly the entity**: it begins witty and charming, dynamically
**roasts the player's specific behavior** (funny + unsettling), and its uncanny omniscience
**curdles into horror** as it's revealed to have been watching and profiling the player all
along. The existing cross-run **PlayerProfile** now fuels the Narrator's personalized
material; the optional bundled **local LLM** generates infinite on-tone roasts. **IP = hybrid:**
we own the engine + the Narrator; curated iconic wiki levels are included with **CC-BY-SA
attribution** for those parts.

## Consequences
- Positive: Built-in Backrooms search traffic; a genuinely novel hook (no one fused
  narrator-comedy with Backrooms horror); the LLM finally has a perfect diegetic home; our
  Narrator + engine are fully ours to own and franchise.
- Negative / risks: Narrator **writing quality is do-or-die** (comedy+horror is hard); voice
  tech (recorded VO vs TTS vs LLM+captions) is an open cost/quality decision; "Both" is a
  large scope — must phase; IP traction means dependence on the mythos's continued popularity
  (accepted: it's our first game). Must comply with CC-BY-SA for the curated levels.
- Echolocation (ADR-0002) is **demoted** from the core to a per-level mechanic for dark levels.

## Alternatives considered
- **Faithful full wiki adaptation (CC-BY-SA everything)** — rejected: can't exclusively own
  the marquee content; ShareAlike exposure. **Fully original (no wiki levels)** — rejected:
  loses the direct fan-service traction. Hybrid captures both.
- **Original (non-IP) game** — rejected: forgoes the built-in audience that motivated the pivot.

## Note
This is a strategy/positioning summary, **not legal advice**. Confirm CC-BY-SA compliance and
trademark posture with a qualified IP attorney before commercial release.
