# Addendum: `artHistoricalReferences` — From Admin-Only to Agent-Staged
## Revising the 2026-07-23 resolution
*July 27, 2026*

---

## What this changes

`artHistoricalReferences` (relationship → `ArtHistoricalReferences`, `hasMany`) was marked **ADMIN-ONLY, RESOLVED 2026-07-23** in `art-official-field-source-of-truth.md` and `art-official-source-of-truth.md`, forbidden for agent staging by design, after prose was mistakenly written into this field during the Brandenburger Tor session (a relationship field, not a text field — the "Brandenburger Tor / Basel bug").

That original bug fix stands and is not being reversed here: **prose must never be written into `artHistoricalReferences`.** This addendum resolves a separate, narrower question — whether a correctly-typed relationship payload (structured references, not prose) can be staged via the normal JSON envelope like the other relationship fields (`movementTags`, `styleTags`, `subjectTags`, `genreTags`, `periodTags`), which are already spec'd as agent-suggests / artist-confirms.

**New rule: `artHistoricalReferences` may be included in the field update package as a structured array, staged like the other relationship/tag fields, and confirmed by the artist at the same review step as everything else — no separate manual admin entry required.**

---

## Why

1. **Type consistency.** `artHistoricalReferences` is the same field type (`relationship`, `hasMany`) as the five tag fields already staged via JSON. Singling it out as admin-only was inconsistent with how the schema treats identical field types elsewhere.
2. **The actual risk was prose-in-relationship-field, not staging itself.** A correctly-shaped array of reference objects doesn't reintroduce that bug — it's structurally a different write than what broke Brandenburger Tor.
3. **Reduces friction without reducing curation quality**, provided matching is handled carefully (see below).

---

## Shape of the staged field

```json
"artHistoricalReferences": {
  "value": [
    { "name": "Robert Rauschenberg", "matchStrategy": "fuzzy-match-or-create", "relevanceNote": "Transfer drawings — solvent-transferred found media combined with hand-applied paint; direct technical precedent for the transfer-then-paint process." },
    { "name": "James Rosenquist", "matchStrategy": "fuzzy-match-or-create", "relevanceNote": "Former billboard painter; billboard vocabulary and scale entering fine art directly parallels the billboard-mountain device." },
    { "name": "Ed Ruscha", "matchStrategy": "fuzzy-match-or-create", "relevanceNote": "\"Mountains of the mind\" — painted peaks as psychological longing rather than lived place, from an artist raised in flat terrain." },
    { "name": "Gerhard Richter", "matchStrategy": "fuzzy-match-or-create", "relevanceNote": "Photograph-first landscape method; inherits Dutch/Romantic sky convention without inheriting its sentiment." },
    { "name": "Sigmar Polke", "matchStrategy": "fuzzy-match-or-create", "relevanceNote": "Ambivalent, simultaneously drawn-to/repelled-by relationship to mass-culture imagery." },
    { "name": "René Magritte", "matchStrategy": "fuzzy-match-or-create", "relevanceNote": "The Human Condition specifically — a painted image seamed into the scene it appears to continue." },
    { "name": "John Constable", "matchStrategy": "fuzzy-match-or-create", "relevanceNote": "Compositing method — separately observed sky studies assembled into a finished landscape, structurally close to transfer-first/paint-reactive process." },
    { "name": "Johannes Vermeer", "matchStrategy": "fuzzy-match-or-create", "relevanceNote": "View of Delft — closest single compositional cousin: city skyline held against water and sky, civic belonging inverted here into private displacement." }
  ],
  "confidence": "high",
  "reasoning": "All eight were explicitly proposed by the agent during the 2026-07-26/27 session and individually confirmed by the artist as genuine influences, not merely surfaced resonance. See record-influence-graph-confirmation-2026-07-26.md for the full reasoning trail.",
  "requiresArtistReview": true
}
```

## Import behavior required from Cursor

1. On import, for each entry: attempt a **fuzzy match** against existing `ArtHistoricalReferences` records by name (case-insensitive, tolerant of "Robert Rauschenberg" vs "Rauschenberg" vs "Rauschenberg, Robert").
2. If a match is found, link to the existing record — **never create a duplicate.**
3. If no match is found, create a new canonical `ArtHistoricalReferences` record with the given name, flagged `needsArtistReview: true` so the artist can confirm the canonical name/spelling before it accumulates variants across future sessions.
4. `relevanceNote` per entry is staged as a per-artwork annotation on the relationship (or in `artHistoricalContext` prose, whichever the schema supports for per-link notes) — not merged into a single blob, so future sessions can see *why* each specific reference was linked to *this* artwork.
5. The artist's confirmation step (already required, `requiresArtistReview: true`) is the actual safeguard here — same as every other field in the package. Nothing is written live without that review.
6. **Structural guardrail preserved from the original bug fix:** the tool-call level must still reject any attempt to write a `string`/prose value directly to `artHistoricalReferences` — only the structured array shape above is valid. This is what stops a future session from repeating the Brandenburger Tor error; it does not depend on the admin-only rule that's being relaxed here.

---

## Update needed to standing docs

- `art-official-field-source-of-truth.md` — row for `artHistoricalReferences`: change from "ADMIN-ONLY, RESOLVED 2026-07-23... forbidden for agent staging by design" to "RESOLVED 2026-07-23 (prose-in-relationship-field bug fixed); RE-RESOLVED 2026-07-27: structured-array staging permitted via JSON package, same pattern as tag fields; prose still structurally rejected at tool-call level."
- `art-official-source-of-truth.md` Part 6 ("Fields blocked from chat-envelope writes, by design") — remove `artHistoricalReferences` from that list; it remains distinct from `salesRecord`/`insuranceValue`/`provenanceConfidenceLayer`, which stay admin-only for private-data reasons unrelated to this fix.
- `fieldAllowlist.ts` — remove `artHistoricalReferences` from the disallowed block; add the structural type check described above (reject non-array/string values) in its place.

---

*Addendum recorded July 27, 2026, superseding the admin-only portion of the 2026-07-23 resolution for this field only.*
