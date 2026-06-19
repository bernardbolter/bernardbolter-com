# Print Data Architecture — Reference
## bernardbolter.com · Series, Artwork, and Commerce Layers
*June 2026 · Bernard Bolter × Claude · Final model after two revisions*

---

## Purpose of this document

This is a reference, not an implementation brief. It exists to keep one coherent mental model of how print/edition data flows across three layers — Series, Artwork, and Vendure commerce — so future schema and component work builds against the same architecture rather than each addendum quietly reinventing part of it.

**This document went through two false starts before landing on the model below.** Both are recorded briefly at the end, under "Revision history," so the reasoning isn't lost — but everything above that section is the current, correct model. Read top to bottom; do not read the revision history first and assume it's still live.

---

## The three layers, final model

```
SERIES LAYER     →  what CAN exist: tier spec + the ONE shared Vendure Product per tier
ARTWORK LAYER    →  what DOES exist: this artwork's Variant reference + who OWNS each copy
COMMERCE LAYER   →  Vendure itself: price (product-level), stock (variant-level, per artwork)
```

This works because of how Vendure's own data model is shaped, not despite it. In Vendure, a **Product** is a container — name, description, images, and the place price lives — while each **Variant** under that product carries its own SKU and its own independently-tracked stock level. That maps directly onto this project's actual need: tier specs and price are genuinely shared series-wide, while stock and ownership are genuinely per-artwork. One Vendure Product can represent "Collector's print" for the whole Digital City Series; each artwork using that tier (Basel, Frankfurt, etc.) is a separate Variant of that product, with its own stock count.

### Series layer — `SeriesEditionTiers` (real collection)

One record per tier per series or sub-series (e.g. Mediums of Perception within A Colorful History gets its own tiers, scoped to that sub-series only):

- `tierName`, `editionSize`, `apCount`, `widthCm`, `heightCm`, `substrate`, `printTechnique`
- `isOriginalTier` — true only for the tier that IS the artwork itself (DCS/Megacities' 3+1AP "Monumental" tier), not a reproduction of it
- `vendureProductId` — the one shared Vendure Product for this tier, series-wide. Price changes happen directly in Vendure against this product and apply to every artwork using the tier — there is no price field duplicated in Payload.

This record answers "if this series produces a Collector's print, what size, substrate, and shared product is it" — never "who owns one."

### Artwork layer — extends the existing per-artwork tier entries

Each artwork (e.g. via the DCS tab's `editionTiers[]`, already built) keeps a tier entry per tier it participates in. That entry:

- **Relates to** the corresponding `SeriesEditionTiers` record — name, size, substrate, and the shared Vendure Product are read through this relation, not retyped
- Carries its own `vendureVariantId` — this specific artwork's Variant within the shared Product, with independently-tracked stock
- Carries its own `copies[]` — the real ownership ledger for this artwork's copies of this tier: copy number, owner, claim status, visibility, date acquired. Irreducibly per-artwork — Basel's copy 2/9 and Frankfurt's copy 2/9 are different physical objects with different owners, and can never be merged or shared.
- Carries `hasEditions` at the artwork level (`none`/`limited`/`open`) — the authoritative, deliberately-set signal for whether this specific piece has any print activity at all, independent of whether the underlying arrays happen to be populated

This is the layer where **ownership truth lives**, asserted by the artist — see Decision 2 below.

### Commerce layer — Vendure

Price lives at the Product level (one per tier, series-wide) and is edited directly in Vendure — Payload does not duplicate or override price. Stock lives at the Variant level (one per artwork-tier combination) and is tracked automatically by Vendure as orders are placed, allocated, and fulfilled.

---

## Two decisions

### Decision 1 — Vendure's Product/Variant split maps directly onto Series/Artwork

A Vendure Product (the tier, e.g. "Collector's print") is shared series-wide and lives at the Series layer with `vendureProductId`. A Vendure Variant (this specific artwork's independently-stocked unit within that product) lives at the Artwork layer with `vendureVariantId`. This isn't a workaround forced onto Vendure — it's Vendure's native Product → Variant hierarchy, and it happens to land exactly on the spec-is-shared / stock-and-ownership-are-per-artwork split this project needs.

### Decision 2 — ownership truth is never auto-derived from a sale

Even with Vendure tracking real-time stock per variant, a completed sale does not automatically write to `copies[].claimStatus`. The sale decrements that artwork's variant stock in Vendure immediately — there is an expected, normal lag before the artist manually reviews and confirms the buyer's ownership claim in Payload's `copies[]`. This is not a bug to engineer away; it is the same distinction this whole project is built on — a transaction occurring is a different fact from the artist recording and standing behind an ownership claim.

**What the public archive page displays:** the claimed-count shown in the Editions accordion ("4 of 9 claimed") is always computed from `copies[]`, never from Vendure's variant stock level. The two numbers are allowed to disagree during the confirmation lag, and that's correct — Vendure answers "is this available to buy right now," the archive answers "who has the artist confirmed owns this."

### Do NOT

- Do not put `vendureProductId` on the artwork-level tier entry — it lives once, on the `SeriesEditionTiers` record, since one Product is shared across every artwork using that tier
- Do not put `vendureVariantId` on the series-level tier definition — it is irreducibly per-artwork
- Do not duplicate or override price in Payload — Vendure is authoritative for price, edited directly there
- Do not derive the publicly-displayed claimed-count from Vendure stock/variant data under any circumstance — always compute it from `copies[]`
- Do not write Vendure transaction data directly into `copies[].claimStatus`, automated or otherwise — every claim passes through the same manual confirmation step, regardless of how the sale happened
- Do not infer whether an artwork has prints from whether `editionTiers[]`/`copies[]` happen to be populated — `hasEditions` is the explicit, authoritative signal

---

## How the layers compose, end to end

A worked example — Basel Switzerland, Collector's print tier:

1. **Series layer**: A `SeriesEditionTiers` record exists for Digital City Series, `tierName: "Collector's print"`, `editionSize: 9`, `apCount: 2`, real width/height/substrate, and `vendureProductId` pointing to the one shared "Collector's print" Vendure Product for the whole series.

2. **Artwork layer (spec + commerce reference)**: Basel Switzerland's tier entry relates to that `SeriesEditionTiers` record, and carries its own `vendureVariantId` — Basel's specific Variant within the shared Product, with its own stock count tracked independently from Frankfurt's or any other DCS artwork's Collector's-print variant.

3. **Artwork layer (ownership)**: The same tier entry's `copies[]` holds the real claims: `2/9 → K. Müller, claimed-confirmed, collectorVisible: true`, and so on — populated by the artist, deliberately, whenever a claim is confirmed.

4. **Commerce layer**: When someone buys Basel's Collector's print 6/9 through Vendure, that specific variant's stock drops immediately. This is independent of whether the artist has yet added a `copies[]` entry for that buyer.

5. **Page render**: `EditionTierRegistry.tsx` reads the artwork's tier entry, follows the relation to `SeriesEditionTiers` for the always-visible spec line (size/substrate), and computes the claimed-count and expandable rows from `copies[]`. Vendure's stock data is never read by the public archive page.

---

## Summary table

| Question | Layer | Field(s) |
|---|---|---|
| What size/material does this series' Collector's print come in? | Series | `SeriesEditionTiers` |
| What's the price? | Commerce | Vendure Product (edited directly there) |
| Does this specific artwork have prints at all? | Artwork | `hasEditions` |
| Who owns copy 5 of 9 of this specific artwork? | Artwork | `editionTiers[].copies[]` |
| Is this copy publicly attributed to a name? | Artwork | `copies[].collectorVisible` |
| Is this artwork's copy currently in stock? | Commerce | Vendure Variant stock (`vendureVariantId`) |
| What does the public archive page show as "claimed"? | Artwork, always | `copies[]`, never Vendure |
| Did someone just buy one? | Commerce | Vendure transaction → artist reviews → manual edit to `copies[]` |
| Does this small-print activity even get tracked at all? | Series | `seriesUntrackedEditionsNote` |

---

## Revision history (for context only — not the current model)

**First draft** proposed `SeriesEditionTiers` holding everything, including ownership, with no per-artwork commerce reference at all. Rejected once a real, already-built per-artwork `dcs.editionTiers[]` structure was discovered, already wired to Vendure with a `vendureProductId` per artwork.

**Second draft** swung the other way — tier specs and `vendureProductId` both per-artwork, no series-level record at all, accepting spec duplication as the cost of fitting Vendure. This was based on an incorrect assumption that Vendure requires one Product per artwork. It does not — Vendure's native Product/Variant split (see above) supports exactly the shared-spec/per-artwork-stock model this project needs, without duplicating anything.

The model at the top of this document is the result of recognizing that, and is final unless Vendure's actual data model is shown to work differently than documented.

---

*Print Data Architecture — Reference · June 2026*
*Implemented by: a corrected SeriesEditionTiers addendum (rebuilding the collection this document now calls for) plus updates to the existing per-artwork editionTiers[] structure — see the current implementation brief for exact field changes*
