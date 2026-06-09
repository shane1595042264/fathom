# ADR-0008: Immersive-sim survival layer — destructible terrain, crafting, RPG stats, encumbrance

- **Status:** Accepted
- **Date:** 2026-06-09
- **Deciders:** team
- **Builds on:** ADR-0007 (roguelike core). The Narrator/boss/profile thesis is unchanged.

## Context
We want high systemic freedom and survival depth. The roguelike-horror core (ADR-0006/0007) is
strong but largely about *evasion*; the player wants destructible everything, salvage/crafting,
biome resources, RPG ability scores, and weight-based carrying — turning the game into an
**immersive sim**.

## Decision
Add a survival/immersive-sim systems layer, designed so the freedom **reinforces the dread**:
1. **Destructible material-hardness terrain.** Every wall/terrain tile has a material + hardness +
   HP; the player can break/mine any of it with the right tool over time. Mining is **loud and
   slow** (feeds the predator's hearing, leaves you exposed) and **cannot trivially tunnel to the
   exit** (hardness gating + noise + the watcher/boss countering). Extends the in-repo tile `Grid`.
2. **Salvage + crafting + biome resources.** Any item breaks down into materials; different
   Backrooms habitats yield **unique resources**; the player crafts tools/traversal/consumables/
   boss-counters — only safely in fragile pockets, never as cozy farming.
3. **D&D-style ability scores** (Strength, Dexterity/Speed, Constitution, Wisdom, …) that drive
   carry capacity, movement/dodge, HP/stamina, sanity/perception, mining, crafting, and checks.
   They extend the randomized "stranger" generator.
4. **Infinite backpack, weighted (Baldur's Gate model).** No slot cap, but every item has weight
   and **carry capacity scales with Strength**; overloading makes you slower and **louder** (the
   predator hears you), tying inventory directly to the stealth/evasion horror. The loaded pack
   drops on death (corpse-run), so weight makes recovery a real gamble.

## Consequences
- Positive: enormous emergent freedom and replay; salvage/crafting deepen the corpse-run economy;
  destructible walls create a genuine *physical duel* with the boss (he seals, you dig — but loudly);
  stats + weight add build/identity depth to the disposable strangers.
- Negative / risks: **another large scope multiplier** — this is now immersive-sim territory
  (Noita / Caves of Qud / Vintage Story). Two do-or-die guardrails: **(a) freedom must serve dread**
  (mining/crafting loud, slow, vulnerable; no free tunnel to the exit); **(b) profile integrity** —
  ability scores change raw numbers, so observations must be **normalized so the watcher learns the
  human, not the body's stats.** Must define a minimal shippable version and defer the rest.

## Alternatives considered
- **Keep evasion-only (no destruction/crafting/stats)** — simpler, but forgoes the requested freedom.
- **Full destruction with no anti-tunnel rules** — rejected: trivializes the maze and the horror.

## Note
Strategy summary, not legal/production advice. Scope must be governed by the phase plan in
`docs/DESIGN.md` / `docs/SYSTEMS.md`; the deterministic shippable floor (ADR-0007) still governs.
