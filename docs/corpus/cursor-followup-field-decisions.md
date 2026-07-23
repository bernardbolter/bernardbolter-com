# Follow-up: Field Source-of-Truth Corrections
*Response to the 2026-07-23 audit against Artworks.ts / Sessions.ts / studio importers*

The bridge doc (`art-official-field-source-of-truth.md`) has been updated with decisions below. Apply these to the doc's corrections — do not re-litigate, these are final for now. Two items still need your answer (marked at the end).

---

## Apply these corrections

1. **Dimension entry path** — doc corrected to `widthWhole` / `heightWhole` / `dimensionUnit`. Confirm the dialogue writes these, never `widthMm`/`heightMm` directly (those stay computed/readOnly via hook).

2. **`sizeTier`** — confirmed as always-asked, never silently inferred. No schema change needed here — just confirm the dialogue's current always-ask behavior is correct and matches the doc now.

3. **Private/provenance fields stay blocked from session-paste, by design:**
   - `salesRecord`
   - `insuranceValue`, `insuranceValueDate`
   - `provenanceConfidenceLayer` beyond the default studio entry
   - `artHistoricalReferences`

   **Do not loosen `fieldAllowlist.ts` for any of these.** The session conversation can surface this material, but committing it requires the deliberate Payload admin act, not a chat-envelope write. This is intentional friction, not a bug to fix.

4. **`currentLocation` shape** — confirm it's a group field (`category` + nested `locationDetail`), and that the envelope writes it as `currentLocation: { category, locationDetail }`, not as two sibling top-level fields.

5. **`salesRecord` type** — confirm it's `json` (transaction array), not `longText`. No change needed if that's already the case — doc was wrong, not the schema.

6. **`directInspiration`** — **change this one in the schema**: from `text` to `textarea`. Session answers to this question run to full paragraphs; a single-line field doesn't fit the actual content being written.

7. **`statement-throughlines`** — standardize the envelope's `collection` key on the **plural** form everywhere. Keep the Session record's own field singular (`statement-throughline`) since it refers to one item. This naming fork was likely causing silent paste failures.

---

### Priority fix — applied 2026-07-23

**Zod schemas are `.strict()`** on vision, artwork-fields, and multi-collection envelope (including nested entry objects). Unknown/misspelled structural keys now reject with a named Zod error instead of silent strip.

---

## Answered 2026-07-23 (applied to bridge doc Part 2c)

1. **`artwork-fields`** — fully separate third HTTP path (`POST /api/studio/archive/artwork-fields`), not only the in-envelope handler. Envelope `artworks` writes reuse `applyArtworkFieldsImport` internally; Studio exposes three panels (vision / fields / envelope).

2. **`{ items: [...] }` batch** — documented on vision and artwork-fields in bridge Part 2c. Envelope batches via multiple `writes[]` entries only (no `items` wrapper).

---

## Descoped for now (revisit later, not blocking)

**`reasoningStatus: complete` cross-collection guard** — currently only guards within a single bundled write (other `artworks` fields commit before `reasoningStatus`), but does not wait for other `writes[]` entries (e.g. a `bio-timeline` append) in the same envelope to succeed first. The `artwork-fields` path has no split guard at all.

For now: **soften the UI copy** so it doesn't overstate what's guaranteed (currently implies full cross-collection confirmation, which isn't true). Building the full cross-collection guard is a real improvement but not urgent — descope until after launch-critical work is done.

---

*Once the above is applied, the bridge doc will be the current, correct reference. Flag anything here that doesn't match reality rather than silently deciding differently — same rule as before.*
