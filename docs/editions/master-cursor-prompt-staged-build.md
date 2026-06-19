# Cursor Prompt — Print Architecture & Provenance Depth, Staged Build
*June 2026 · revised after print-data-architecture-reference.md correction*

Paste this whole thing into Cursor as your opening instruction.

---

## Setup instruction for Cursor

You're implementing a connected set of schema and display changes across several stages. **Each stage ends with its own git commit. Stop after each stage, report what changed, and wait for confirmation before continuing to the next.** Do not attempt all stages in one pass.

Read these files in full before starting any stage — they supersede earlier specs where they conflict:

1. `print-data-architecture-reference.md` — **read this first.** Corrected mental model: tier specs and ownership live on each artwork's `dcs.editionTiers[]` (or Megacities equivalent); Vendure owns stock only; `ownershipRegistry[]` is the fallback for non-DCS/Megacities works (e.g. ACH giclée). **Do not build a `SeriesEditionTiers` collection.**
2. `dcs-editiontiers-ownership-addendum.md` — adds `copies[]` and `isOriginalTier` to existing per-artwork `editionTiers[]`; supersedes `series-edition-tiers-addendum.md` entirely
3. `provenance-depth-finalization-addendum.md` — provenance claims display, the multi-copy original treatment, the tonal background system, final right column order
4. `edition-schema-reconciliation-addendum.md` — `ownershipRegistry[]` shape for non-series-tab works (ACH giclée); where it conflicts with #2, #2 wins for DCS/Megacities
5. `artwork-page-layer-reorganization-addendum.md` — the two-column layout, Layer3 reordering, three visual idioms
6. `ownership-record-addendum.md` and `artwork-page-directive.md` — base specs the above all build on

**Superseded — do not implement:** `series-edition-tiers-addendum.md` (`SeriesEditionTiers` collection).

If anything across these documents is ambiguous or conflicting, stop and ask rather than guessing.

Test data: `__fixture-gates-iii` (unique original, inline `ownershipRegistry` giclée tiers) and `__fixture-basel-dcs` (DCS work — ownership on `dcs.editionTiers[].copies[]`). Verify every stage against both.

---

## Stage 1 — Schema: edition tier ownership on artwork tabs

Per `dcs-editiontiers-ownership-addendum.md` and `print-data-architecture-reference.md`:

- Add `copies[]` and `isOriginalTier` to each entry in `dcs.editionTiers[]` (DCS tab) — same per-copy shape as `ownershipRegistry[]`
- Add the same fields to `megacities.print.editions[]`
- Add `seriesUntrackedEditionsNote` to the Series collection
- Add `hasEditions` (`none`/`limited`/`open`) to the Artwork collection
- Keep `ownershipRegistry[]` on Artwork as the **fallback path only** for non-DCS/Megacities works (inline `tierLabel`/`tierOrder`/`editionSize`/`apCount`/`isOriginalTier`/`copies[]`) — do not delete it
- **Do not** create a `SeriesEditionTiers` collection or any `seriesEditionTier` relationship
- Document new fields in `artist-archive-schema-final.md`

**Migration**: update `__fixture-basel-dcs`: set `hasEditions: 'limited'`, populate `dcs.editionTiers[]` with three tiers — `monumental` (3+1AP, `isOriginalTier: true`, copies per fixture spec), `collectors-print` (9+2AP, claimed copies), `small-print` (200, empty copies). Clear `ownershipRegistry[]` on Basel. Gates III: `hasEditions: 'limited'`, keep inline `ownershipRegistry[]` only.

**Display rule (binding):** public claimed-count always from `copies[]`, never from `editionsRemaining`.

Commit: `schema: add edition ownership to dcs.editionTiers, hasEditions, seriesUntrackedEditionsNote`

---

## Stage 2 — Tonal background system

Per `provenance-depth-finalization-addendum.md`'s "Tonal background system" section. Pure styling, no schema dependency — safe to verify in isolation.

- Layer3 prose: remove any grey panel background, plain white throughout
- `Layer1ObjectRecord`: `background: #efeee9`
- Exhibition history block: `background: #ece9e2`
- `Layer2StatusAndProvenance`'s Status & Ownership block: remove grey background, becomes a white card (`background: #ffffff; border: 0.5px solid rgba(0,0,0,0.09)`) with the existing series-colour left border accent kept on top
- Confirm `EditionTierRegistry` already renders white, not inheriting grey from a parent
- Add the heavier hero-to-data divider (`border-top: 1.5px solid var(--color-border-secondary)`) above the two-column grid in `ArtworkPage.tsx`

Test: both fixture pages should show clear tonal separation — white prose, two distinct muted greys (Object record, Exhibition history), two white bordered cards (Status & Provenance, Editions).

Commit: `style: establish tonal background hierarchy across right column and prose`

---

## Stage 3 — Provenance claims display

Per `provenance-depth-finalization-addendum.md`'s "Provenance claims — surfaced, not summarized" section.

- Replace the single-line provenance summary in `Layer2StatusAndProvenance.tsx` with the full claims list from `provenanceConfidenceLayer`
- `documented-fact` → solid dot marker; `credible-inference` → hollow dot marker, italic text, "— inferred" suffix
- Legend renders once, only the marker types present in that record
- `institutional-assertion` claims render in a demoted "Additional records" sub-section at `opacity: 0.6`
- `speculation` claims never render publicly anywhere
- This list is never collapsed or accordioned, regardless of length

Test: Gates III (all `documented-fact`, no demoted section) and Basel (mixed confidence — Kunsthalle Basel `institutional-assertion` claim in seed).

Commit: `feat: surface individual provenance claims with confidence markers`

---

## Stage 4 — Multi-copy original tier

Per `provenance-depth-finalization-addendum.md`'s "Multi-copy original" section. `isOriginalTier` lives on the artwork's edition tier entry (`dcs.editionTiers[]` for DCS, or inline `ownershipRegistry[]` for fallback works).

- When a tier has `isOriginalTier: true`, render it inside Status & Provenance, **not** inside the Editions accordion
- Data source: `asEditionTiers()` in `ownershipRegistryPublic.ts` (reads `dcs.editionTiers` → `megacities.print.editions` → `ownershipRegistry` fallback)
- Render every copy including unclaimed ones, visibly, with "Unclaimed" + claim link for unclaimed copies
- Reuse the existing AP suppression logic — do not reimplement
- Filter `isOriginalTier: true` tiers out of `EditionTierRegistry`

Test against Basel: monumental tier (1/3 claimed, 2/3 and 3/3 visibly unclaimed, AP absent) in Status & Provenance; Collectors print and Small print in Editions accordion.

Commit: `feat: render original-edition tier as multi-copy provenance block`

---

## Stage 5 — Edition spec line, always visible

Per `dcs-editiontiers-ownership-addendum.md` display intent (spec from artwork tier, not a series collection).

- `EditionTierRegistry`'s accordion header shows a size/substrate spec line below the tier name, always visible — pull from `dcs.editionTiers[]` (`printSubstrate` + dimensions where available), Megacities `dimensions`, or inline fallback / `editions[]` for ACH giclée works

Test: Basel collectors/small print show substrate in closed accordion header. Gates III giclée tiers show theirs from inline/`editions[]` fields.

Commit: `feat: show edition size and substrate in always-visible accordion header`

---

## Stage 6 — Final section order, Documentation & media removal, record meta footer

Per `provenance-depth-finalization-addendum.md`'s remaining sections.

- Right column final order: Object record → Status & provenance → Exhibition history → Editions → External links → Record meta footer
- Remove the Documentation & media block entirely
- Add `↗` to exhibition entries where `event.hasPage === true`, linking to `/events/[slug]`
- Confirm exhibition history reads from the same `events` relation a future CV page would use
- External link labels derive from domain (`sameAs`), not manual `label`
- Add the record meta footer: catalogue number, reasoning status sentence, last-updated date
- Remove `ReasoningStatusBadge` from `Layer3ArtistAccount.tsx` — footer only

Commit: `feat: finalize right column order, remove documentation block, add record meta footer`

---

## General rules for every stage

- Stop and ask if anything in the source documents is ambiguous — don't guess and move on
- Don't refactor or "clean up" code outside the current stage's scope — flag it instead
- Match the codebase's existing styling convention for any new code
- Re-run the relevant fixture seed after any stage that changes data shape
- Never display `editionsRemaining` on the public artwork page
- Never auto-write Vendure sale data into `copies[].claimStatus`
- After each commit, give a short plain-language summary of what changed and what to check
