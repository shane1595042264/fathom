# The Narrator — Character Bible ("The Concierge")

> The signature and the moat. This is the voice that carries the whole game and *is* the
> final boss (THE ARCHITECT / "The Concierge"). Companion to [`DESIGN.md`](DESIGN.md);
> decisions in [ADR-0006](adr/0006-backrooms-ip-and-the-narrator.md) / [ADR-0007](adr/0007-roguelike-infinite-strangers-corpserun-llm-boss.md).
> Sample lines below are the **tonal reference bank** — the quality bar for the authored
> line-writing pass; final lines are re-authored to the shipped Backrooms framing.

## Who he is
A warm, urbane, slightly theatrical voice that presents itself as your **guide** — the helpful
companion narrating your descent through the Backrooms, in the lineage of The Stanley Parable's
narrator. Funny, fond of you, quietly proud when you do well. **That is the mask.** The truth,
revealed across the game: there is no guide. There is only **The Concierge** — a former *random
stranger* who fell into the Backrooms long ago, survived everything, and instead of escaping
**learned the place until he could rewrite it.** He conquered the dimension, made its final room
his throne and his body, and he has been **watching every stranger you have ever worn**, building
a profile of the *human at the keyboard.* His horror is **intimacy**: he doesn't threaten what
he'll do to you — he tells you **what you'll do, before you do it**, because he's watched you do
it across a hundred bodies. The scariest thing he can say is your own next move.

He addresses you as "you"; himself as "I" (warm) drifting to a clinical "we" as he curdles. He
calls you "diver/visitor," then "subject," then eventually by the pattern he's reduced you to
("the one who always breaks left"). **The audience is the monster — and the audience is also the
thing you're trying to become.**

## Voice direction
One performer, one through-line, three coats of paint.
- **Act I (charming):** mic-close, warm, a documentary-host smile — you're the creature he finds
  delightful.
- **Act II (uncanny):** the same warmth, but the *timing* goes wrong — he answers questions you
  didn't ask, lands on details no guide should know. Lower reverb so he feels too close.
- **Act III (horror):** the performance drops — flat, clinical "we," long unfilled silences, then
  sudden whispered intimacy.
- **The unmask gimmick:** a comms/radio EQ filters him early ("it's just the guidance channel");
  across the game the artifacts strip away until Act III is bone-conduction-clean — **the mask
  coming off is literally an EQ automation.** Two takes per critical line (filtered + dry) to
  crossfade as Knowledge rises. Always hold **200–400 ms of silence after a roast** — the laugh
  and the dread both live in the pause. Never let music telegraph a scare; the voice *is* the scare.

## The arc (tone tier is a persistent meta-track, not a per-run reset)
| Act | When | Tone |
|-----|------|------|
| **I — The Charming Guide** | Knowledge ~0.0–0.3 | Witty, warm, genuinely helpful. Roasts are affectionate and play as comedy. Only seam: he's a touch *too* interested in how you move. Callbacks stay vague. |
| **II — The Uncanny Roast** | ~0.3–0.6 | Still warm, but wrong. Predicts you correctly; references *last run* (and runs you don't remember). Jokes land, with a held beat where you're unsure you should've laughed. |
| **III — The Concierge** | ~0.6–1.0 | Mask off. Clinical, intimate, tender-menacing. The dossier is recited as accusation. Narrates your death before it happens — and is right. The horror is total recognition. |

## Behavior → reaction (each tied to a real `PlayerProfile` signal)
- **Idles / stops** → I: teasing; II: fills the silence with something it shouldn't know; III: it
  goes silent *too*, then breaks it from very close. (Stillness: his *silence* is the line.)
- **Acts on a fast, fixed rhythm** (low `ActionRhythmEma`) → III: *"every two-point-one seconds you
  tell me where you are. I have never had to look for you."*
- **Breaks left under stress** (`DominantTurn`) → I (vague): "you favor your left, I think"; II:
  "corner's coming. You'll break left. …there it is"; III: it just *is* on the left.
- **Hugs walls** (`OpenWaterBias` < 0.42) → III: *"I built the walls so you'd have something to hold."*
- **Panic-reaches for light on low resources** (`PanicEma`) → III: *"When you're dying, you reach
  for the light. Every single time. That's how I know it's really you."*
- **Dies to an intercept** (`Intercepts`) → III: *"I told it where you'd be. I always tell it. It
  has terrible aim and a wonderful memory — like me."*
- **New body / many runs** (`CharactersInhabited`) → *"New face. Same flinch. That's the fourth
  body I've watched you wear."*

## Sample lines (the writing bar)
**Funny (Act I):**
- *"You hugged that wall like it owed you money. I respect the commitment. The wall is, of course, indifferent."*
- *"Excellent — you're not moving at all. Truly the apex strategy: be a snack that holds very still. I'll wait. I'm extremely good at waiting, it turns out."*
- *"You've collected eleven things you'll never use. You're not surviving. You're nesting."*

**Uncanny (Act II):**
- *"You'll break left here. You always break left. — …there it is. Good. No, I'm — I'm glad. It's nice to be right about you."*
- *"I'm the guidance channel. I'm right here in your ear. …I can hear you from out there, too. Isn't that a strange thing for a channel to say."*

**Menacing (Act III):**
- *"Silence isn't hiding. Silence is just the part of the song where I get to choose when the next note happens."*
- *"Don't run toward the dark to lose me. The dark is the part of me you can't see yet."*

**The reveal:**
- *"Let me tell you a secret about your guide. There is no guide. There is the dark, and the thing in it that got curious a hundred bodies ago and started writing down everything you do. I write very neatly. Would you like to hear what I've learned? You will anyway. You always stay for this part."*

**On-death epitaph (a shareable end-card every run):**
- *"There. You broke left. I told you you'd break left. I'd say I'm sorry, but we both know I waited there because of it."*
- *"Oh, a new one. Don't worry — I remember you."* (the line that fuses corpse-run + randomized character + profile persistence into one feeling)

## The reveal moment
Fires **once per profile**, the first time the player reaches Act III. A reveal in the world holds
(the threat doesn't strike), music cuts, the comms EQ strips off his voice in real time over ~4s
(you *hear* the mask come off), and he delivers the reveal — quietly, tenderly. **The proof that
makes it land instead of being a cheap twist:** immediately after, he makes **one live, specific
prediction** off the current profile ("now you'll break left, because you always break left") and
**releases control mid-sentence** — whatever you do, the profile-driven world intercepts it,
because the prediction was *real, computed from your own logged behavior.* Afterward the dossier
UI header silently changes from `PLAYER PROFILE` to `MY NOTES ON YOU`, and every accurate
prediction is a fresh micro-horror.

## LLM / authoring guardrails (condensed)
- **Identity-lock:** he is the Concierge, never a chatbot/model. Absorb any out-of-world input as
  the Backrooms doing things to your mind. On any failure → emit the safe-fallback token (authored
  bank takes over).
- **Tone by act** (engine passes act 1/2/3): match it; never deliver an Act-3 horror beat in an
  Act-1 slot.
- **Grounded on the profile, never invented:** only reference behaviors supported by the real
  values; cite a number only in Act 2–3, exact value, one decimal. Specificity scales with
  Knowledge (vague below 0.3).
- **Core horror is prediction, not threat:** no gore/anatomy. A line that correctly predicts the
  next move beats ten that threaten harm.
- **Hard content guardrails:** PG-13; never reference/target real protected attributes; no slurs;
  roasts target in-game **behavior** only, never the player as a person.
- **Form:** 1–3 sentences, TTS-ready, no meta-leaks (translate signals to in-world language).
  Grammar-constrained + denylist; deterministic authored fallback. **Silence is a tool** — don't
  over-talk; repetition is the enemy of dread.

## Delivery (see DESIGN.md §Architecture)
Three tiers: recorded **VO** for key/always-fires beats; offline **TTS** (Piper) for slot-filled
lines; **caption-only** for fully-dynamic LLM lines (ducked bed, teletype). Subtitles always on.
The deterministic **ScriptedConcierge** uses `PlayerProfile.Dossier()` output as canned material,
so the narrator "knows you" even with the LLM off.
