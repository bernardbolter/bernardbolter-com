# Edition Schema Reconciliation & Ownership Registry Addition
## bernardbolter.com · Schema Addition — Cursor Implementation Spec
*June 2026 · Bernard Bolter × Claude*

---

## Read first

Before touching schema or seed code, read:
- `artist-archive-schema-final.md` and `master-schema-spec.md` — Section "Editions" and "Provenance and Location," current `editions[]` array
- `dcs-tab-schema-spec.md` — Section 1.4, `editionTiers[]`
- `megacities-payload-schema.md` — Section 7, `print.editions[]`
- `artwork-page-layer-reorganization-addendum.md` — the page-level spec that depends on this document; its `EditionTierRegistry.tsx` component is built against the shape this document defines

This document resolves the "Reconciling these three shapes into one is a separate schema task" note left open in the layer reorganization addendum. It is a schema-and-data document, not a page-display document — display behaviour stays governed by the layer reorganization addendum and is not repeated here except where it affects field shape.

---

## The actual problem, restated

Three existing structures all use the word "edition," but they are not three variations of the same thing — they are **two different systems that happen to share vocabulary**:

**Commercial inventory systems** — `dcs-tab-schema-spec.md`'s `editionTiers[]` and `megacities-payload-schema.md`'s `print.editions[]`. Both exist to power an actual storefront: `vendureProductId`, webhook-synced `editionsRemaining`/stock counts, `tierAvailabilityStatus`, fulfilment partners, AR-enablement per format. They answer **"how many are left to sell, and where does someone buy one."** These are real, working systems already specced for their respective series tabs — this document does not replace or rename them.

**The static base `editions[]` array** — `artist-archive-schema-final.md`'s general field, used for works like Gates of Perception III (giclée formats with price, substrate, certificate, signature). No live stock sync, no Vendure link. Closer to a price sheet than inventory software.

**What the layer reorganization addendum actually needs — an ownership ledger.** Not "how many are left to sell," but **"who has copy 4 of 9, and is that public."** This question has never had a field. None of the three structures above answer it, and none should be stretched to.

The correct reconciliation is not merging these into one array. It is: keep the two commercial systems exactly as specced (they work, they're wired to a real backend, don't touch them) and **add a new, separate, lightweight ownership-registry layer that references the same tier structure by label, without depending on or duplicating the commercial fields.**

---

## What does NOT change

- `dcs-tab-schema-spec.md`'s `editionTiers[]` (Vendure-linked) — unchanged. Keep `tierName`, `totalEditionSize`, `printSubstrate`, `includesSupportingPrints`, `vendureProductId`, `editionsRemaining`, `editionsRemainingUpdatedAt`, `tierAvailabilityStatus` exactly as specced.
- `megacities-payload-schema.md`'s `print.editions[]` (Vendure-linked) — unchanged. Keep `tier`, `dimensions`, `editionSize`, `vendureProductId`, `arEnabled`, `available`, `notes` exactly as specced.
- The base `editions[]` array in `artist-archive-schema-final.md`/`master-schema-spec.md` — unchanged. Keep `formatLabel`, `widthCm`, `heightCm`, `substrate`, `printTechnique`, `totalEditionSize`, `artistProofs`, `remaining`, `pricePerPrint`, `currency`, `certificate`, `signature`, `notes` exactly as specced.

### Do NOT

- Do not rename, remove, or restructure any field in any of the three existing structures above as part of implementing this document
- Do not attempt to make the new ownership registry read or write `vendureProductId`, `editionsRemaining`, or any other commercial/stock field — the two systems are deliberately decoupled

---

## What's new: `ownershipRegistry` (array, on Artwork)

A new top-level field on the Artwork collection, private-and-public-mixed per the rules below, that exists purely to track per-copy ownership claims. It is independent of which commercial system (if any) governs that tier's sales.

```
ownershipRegistry: [
  {
    tierLabel: string          // Free text, matched by the editor to whichever commercial
                                // tier this corresponds to (e.g. "Original edition", "A0 edition",
                                // "small-print", "monumental" — matches dcs tierName, megacities
                                // tier, or base editions[].formatLabel by convention, not by
                                // foreign key — see "Why a label match, not a relation" below)
    tierOrder: number           // 1 = top/most exclusive, ascending — display ordering only,
                                // no behavioural difference between orders (all tiers use the
                                // same accordion display per the layer reorganization addendum)
    editionSize: number         // numbered copies only — excludes AP/artist-proof count
    apCount: number              // 0 if none
    copies: [
      {
        copyNumber: string                // "1/3", "47/100", "AP"
        isArtistProof: boolean
        owner: string | null               // display name; null = unclaimed. PRIVATE unless
                                            // collectorVisible is true (see access rules below)
        claimStatus: 'unclaimed' | 'claimed-pending' | 'claimed-confirmed'
                     | 'artist-held' | 'sold-secondary'
        collectorVisible: boolean           // gates whether `owner` is exposed publicly
        dateAcquired: string | null
        claimedCopyNumberKnown: boolean     // whether the claimant knew their own copy number,
                                             // or it was assigned by the artist on confirmation
        notes: string | null                // PRIVATE — never rendered publicly
      }
    ]
  }
]
```

### Why a label match, not a relation

`tierLabel` is a free-text match to whichever commercial structure governs that tier's sales (or to nothing, if the tier was never sold through Vendure — e.g. the giclée editions on Gates of Perception III, which have no Vendure link at all). A formal relational foreign key into `dcs.editionTiers[]` or `megacities.print.editions[]` was considered and rejected for this pass: those two arrays live in different series-specific tabs with different shapes, and building a polymorphic relation across three possible source structures (DCS tab, Megacities tab, base `editions[]`) adds real complexity for a benefit that doesn't materialise yet — nothing currently needs to query "show me the Vendure stock count and the claimed-owner count in one pass." If that need arises later, a relation can be added then without breaking the label-based registry that exists by that point.

### Access rules

- `owner` and `notes` are private by default; `owner` becomes publicly readable only for the specific copy where `collectorVisible === true`
- `copies[].notes` is never publicly readable, regardless of `collectorVisible`
- The array itself (`tierLabel`, `tierOrder`, `editionSize`, `apCount`, `copyNumber`, `claimStatus`, `isArtistProof`) is readable by the page-rendering layer to compute claimed-counts and render visible rows — but raw `claimStatus` values for non-visible copies must never reach the public API response unfiltered; the API layer should return only what `EditionTierRegistry.tsx` is allowed to show (claimed-count summaries, and full detail only for `claimed-confirmed` + `collectorVisible: true` copies), matching the existing pattern already used for `ownershipHistory`

### AP / Artist's Proof handling

`isArtistProof: true` copies are excluded from `editionSize` claimed-count math entirely (the count is "X of `editionSize` claimed," and `editionSize` already excludes AP copies per the field definition above). The AP copy's `claimStatus` starts at `'artist-held'` by default and is never required to have an `owner` value while in that state. If sold, it moves to `'sold-secondary'`, never `'claimed-confirmed'` — see the layer reorganization addendum's AP visibility rule for the full display logic this status drives. This field-level behaviour is unchanged from what the layer addendum already specified; it is restated here only because this is now the canonical schema location for it.

---

## `untrackedEditionsNote` (text, on Artwork)

Plain prose, public, no structured data. Already specified in the layer reorganization addendum — added here to the canonical schema document set. Example: "Small 5×5 inch prints of this work were also sold informally at markets; these were not consistently numbered and are not individually tracked."

This field exists specifically for print runs too informal or unreliably numbered to support a `copies[]` registry (per the project's working decision: signed-and-numbered runs get the registry, informal/unnumbered runs get this prose note instead, never both).

---

## `componentCount` (number, on Artwork, optional)

Already specified in the layer reorganization addendum — added here to the canonical schema set. For artworks physically realized as multiple components always sold and owned as a single unit (e.g. a triptych of three canvases sold together). Purely descriptive. Does not create a multi-record structure — the triptych remains one Artwork record; `componentCount` only affects how Layer0's gallery may label component images ("Panel 1 of 3").

### Do NOT

- Do not create separate Artwork records per component when `componentCount > 1` — ownership, edition, and sale logic all stay at the single-record level
- Do not infer or validate `componentCount` against the number of gallery images — it is an independent descriptive field an editor sets directly

---

## JSON-LD additions

Per the layer reorganization addendum, `generateArtworkJsonLd.ts` needs:

- **`artism:editionClaimSummary`** — array of derived public strings, one per `ownershipRegistry` tier, e.g. `["Original edition: 2 of 3 claimed", "A0 edition: 12 of 100 claimed"]`. Computed the same way the page's accordion-header summary is computed (claimed-confirmed count vs. `editionSize`, AP excluded). Never outputs raw `copies` data.
- **`artism:componentCount`** — integer, output only when present and greater than 1.

### Do NOT

- Do not output raw `ownershipRegistry.copies` array data in JSON-LD under any condition — this mirrors the existing rule for `ownershipHistory`/`provenanceConfidenceLayer` and applies for the same reason: per-copy claim detail beyond the public summary is not meant for machine harvesting any more than it's meant for casual page-reading

---

## Relationship to the three existing edition structures — summary table

| Structure | Purpose | Lives in | Touched by this document |
|---|---|---|---|
| `dcs.editionTiers[]` | Commercial inventory, Vendure-linked | DCS tab | No — unchanged |
| `megacities.print.editions[]` | Commercial inventory, Vendure-linked | Megacities tab | No — unchanged |
| base `editions[]` | Static price/format sheet, no stock sync | Base artwork schema | No — unchanged |
| `ownershipRegistry[]` | **New.** Per-copy ownership claims, independent of sales channel | Base artwork schema | **Yes — defined in this document** |

An artwork may have zero, one, or more of the commercial structures populated, and independently, zero or more `ownershipRegistry` tiers. They are not required to correspond one-to-one — a tier can exist in the ownership registry with no matching Vendure product (e.g. an older giclée run sold informally, like Gates of Perception III's editions), and a Vendure-tracked tier can exist with no ownership registry entry yet (e.g. a brand-new DCS print run where stock is tracked but no claims have come in).

---

## Verification checklist

- [ ] `dcs.editionTiers[]`, `megacities.print.editions[]`, and base `editions[]` are all unchanged from their existing specs
- [ ] `ownershipRegistry[]` is added as a new, independent array on the base Artwork schema
- [ ] `ownershipRegistry` does not reference or duplicate `vendureProductId`, `editionsRemaining`, or any other commercial/stock field
- [ ] `tierLabel` is free text, not a relation, and the document explaining why is preserved for future schema work
- [ ] `owner` and `copies[].notes` are private by default; `owner` is exposed publicly only per-copy where `collectorVisible: true`
- [ ] AP copies are excluded from `editionSize` claimed-count math; `claimStatus` starts at `artist-held`, moves to `sold-secondary` if sold, never `claimed-confirmed`
- [ ] `untrackedEditionsNote` and `componentCount` are added to the canonical schema documents
- [ ] `artism:editionClaimSummary` and `artism:componentCount` are added to the JSON-LD generation spec, outputting derived summaries only — never raw `copies` data
- [ ] No new Artwork record is created for multi-component works — `componentCount` stays a descriptive field on one record

---

*Edition Schema Reconciliation & Ownership Registry Addition · June 2026*
*Read alongside: artist-archive-schema-final.md, master-schema-spec.md, dcs-tab-schema-spec.md, megacities-payload-schema.md, artwork-page-layer-reorganization-addendum.md*
