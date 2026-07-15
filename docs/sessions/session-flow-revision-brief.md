# Session Flow Revision Brief

*Derived from The Thinker (BB-OGP-1993-005) Art/Official session, July 15, 2026. Read alongside `art-official-dialogue-spec.md`, which this brief amends — not replaces.*

**Canonical operator document:** [`art-official-session-protocol.md`](./art-official-session-protocol.md) — pasteable single spine for Claude app **and** Payload Art/Official admin. Use that for sessions; this brief is the design rationale only.

## Part 1 — Why

Running a full session in Claude chat (rather than the Payload admin's Claude-API-driven flow) surfaced several structural gaps in the existing session shape:

- The agent produced its own blind reading, which the current spec never asks for (spec asks the artist only).
- The comparison between blind description and the actual image happened immediately and did all the analytical work in one pass — leaving nothing distinct for a later, deliberate re-ask.
- Several existing schema fields (`encounterNote`, `descriptionShort`, `descriptionLong`, `compositionalNotes`, `dominantColors`, `processNotes`, `sourceMaterials`, subject/style/movement tags) were never touched, despite already existing in `artist-archive-schema-final.md`. The interpretive/relational fields got rich treatment; the descriptive/computed fields were skipped entirely.
- Provenance, ownership, and exhibition history — all real existing schema fields (Part 1.9 of the schema) — were never asked about until the very end, almost as an afterthought.

None of this needs new artwork schema. It needs a revised session shape that makes sure existing fields actually get visited, and gives certain moments (the re-ask, the abstract-proposal step) their own protected space instead of collapsing into general conversation.

## Part 2 — Revised session shape

Replace the flow in `art-official-dialogue-spec.md` Section [pre-upload ritual through confirmation] with:

1. **Pre-upload questions** (unchanged) — asked one at a time, never batched.
2. **Blind description** — artist only, as currently specced. Do NOT have the agent produce its own blind reading as a default behavior — this is optional and should be an explicit artist choice per session, not automatic. Store the artist's blind description as `firstImpression` (private session field, unchanged from current spec).
3. **Image upload.**
4. **Light acknowledgment** (NEW, replaces the current unstructured post-upload reaction) — one short beat: what the agent sees, and at most one sentence naming the most obvious divergence from the blind description. Explicitly NOT a full comparison or analysis. The rule: if this beat starts doing correction or interpretation at length, it is stealing the job of step 8. Keep it to 2–4 sentences.
5. **Small facts** (NEW) — if the artwork is already stubbed, quick confirmation only (dimensions, medium, year, series — read back, not re-asked in depth). If not stubbed, gather these now: title, year, medium, dimensions, series. This is the ramp from the raw/unguarded blind-description register into the deeper interpretive conversation, not a full intake form.
6. **Deep interpretive conversation** (unchanged in spirit) — intent, formal qualities, art-historical resonances, corpus/relational connections. Unscripted, one question at a time, follows the work rather than a checklist.
7. **"Where has this lived" beat** (NEW, mandatory, own protected block — see Part 3 below).
8. **Formal re-ask** (NEW, distinct from step 4) — return explicitly to `firstImpression`: "you described it at the start as [x] — does that still hold, now that we've talked all this through?" This is where the real weight of the blind/informed comparison happens, not step 4.
9. **Abstract-proposal beat** (NEW — see `bio-statement-capture-brief.md` for full detail) — either party may propose a bio-timeline entry or a statement-throughline entry. Apply the load-bearing test: only propose something as a bio/statement abstract if it's a genuine cross-work pattern or standalone life-fact, not a restatement of what's already going into this artwork's own fields.
10. **Session close** — practical/condition fields (unchanged from existing spec) plus whatever wasn't already covered in step 7.
11. **Confirmation** — full record shown for review: both descriptions side by side (`firstImpression` vs. the step-8 re-ask), proposed abstracts from step 9, and all field updates — all reviewed together before commit.

## Part 3 — "Where has this lived" beat (mandatory content)

One at a time, not a form-dump, but every session must pass through this block before the re-ask:

- **Current location** — studio, private collection, institution, or on loan (`currentLocation`, `locationDetail`)
- **Ownership** — if sold or gifted, to whom (or "private collection"), when acquired/relinquished (`ownershipHistory`), and whether the chain is actually traceable (`provenanceOriginKnown`, `provenanceConfidenceLayer`)
- **Sale details**, if applicable — date, price, currency, buyer (private), channel, gallery/auction house (`salesRecord`) — private fields, never surfaced publicly, but still need an answer
- **Exhibition history** — where shown, including whether this connects to a proper Events-collection relation rather than free text (see Part 4)
- **Insurance value**, if relevant (`insuranceValue`, `insuranceValueDate`)

This beat can be skipped only if the artist explicitly defers it ("let's come back to this later") — it should not be silently dropped by conversational momentum the way it was in the reference session.

## Part 4 — Known related gap: exhibition history field

Today's session recorded "exhibited at Vesuvios" in the free-text `workContext` field. This is likely the wrong home for it — exhibition appearances should probably be a relation to the Events collection (consistent with `loanHistory.eventId` already relating to Events), not free text. Flag this for schema review; do not silently continue writing exhibition facts into `workContext` once a proper relation exists.

## Part 5 — Do NOT

- Do not have the agent produce an unsolicited blind reading as standard practice — artist-only unless explicitly requested otherwise for a given session.
- Do not fold the re-ask (step 8) into the light acknowledgment (step 4) — they are different weights doing different jobs.
- Do not skip the "where has this lived" beat because the interpretive conversation felt complete — it is a separate, mandatory block.
- Do not silently drop encounterNote, descriptionShort/Long, compositionalNotes, dominantColors, processNotes, or sourceMaterials from a session — these already exist in schema and should be visited even if briefly.
- Do not treat step 5 (small facts) as a full intake form when the work is already stubbed — quick confirmation only.

## Part 6 — Verification checklist

- [ ] Session transcript shows all 11 steps present in order, or explicit artist deferral noted for any skipped step
- [ ] `firstImpression` recorded once, at step 2, before image upload
- [ ] A distinct re-ask (step 8) exists, separate from step 4's acknowledgment, referencing `firstImpression` explicitly
- [ ] "Where has this lived" content present or explicitly deferred
- [ ] Confirmation screen shows both descriptions side by side, not just the final one
- [ ] All applicable existing schema fields (encounterNote, descriptionShort, etc.) show a value or an explicit "artist declined" note, not silent absence

---
*Session flow revision brief · July 2026 · Read alongside art-official-dialogue-spec.md*
