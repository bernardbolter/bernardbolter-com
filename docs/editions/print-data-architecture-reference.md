# Print Data Architecture — Reference
## bernardbolter.com · Series, Artwork, and Commerce Layers
*June 2026 · Bernard Bolter × Claude*

---

## Purpose of this document

This is a reference, not an implementation brief. It exists to keep one coherent mental model of how print/edition data flows across three layers — Series, Artwork, and the future Vendure commerce integration — so that future schema and component work (by Cursor, by Claude, by anyone else) builds against the same architecture rather than each addendum quietly reinventing part of it.

Read this before `series-edition-tiers-addendum.md`, `edition-schema-reconciliation-addendum.md`, or `provenance-depth-finalization-addendum.md` if you're encountering the print/edition schema for the first time. Those documents implement pieces of what's described here.

---

## Revision note — this document's original Layer 1 design has been corrected

The original version of this document proposed a `SeriesEditionTiers` collection as the sole source of truth for tier specs, living entirely on the Series record. Implementation surfaced that a real, already-built, Vendure-wired per-artwork tier system (`dcs.editionTiers[]`, and its Megacities equivalent) already exists and already has live data and immutable `vendureProductId` references. That system is correct and stays as the actual tier record — **tier specs live per-artwork, not per-series.** What follows is the corrected model.

A lightweight series-level **template** (not a source of truth, not a live-linked relation) may still exist purely to pre-fill new artwork tier entries with sensible defaults (typical size, typical substrate for that series) so the artist isn't re-typing the same values for every new artwork — but editing the template does not retroactively change any already-created artwork's tier data, and an artwork's tier values can diverge from the template at any time. This is a convenience for data entry, not an architectural relationship the rest of the system depends on.

---

## The three layers, corrected

```
ARTWORK LAYER (dcs.editionTiers[] / equivalent)  →  what the print IS (spec) + who OWNS it (ownership)
COMMERCE LAYER (Vendure)                          →  what's available to buy RIGHT NOW (stock only)
SERIES LAYER (template, optional)                 →  pre-fill convenience for new entries, not a source of truth
```

### Artwork layer — the real source of truth

Each artwork's `editionTiers[]` (e.g. the existing DCS tab structure: Small print, Collector's print, Monumental) holds, per tier:

- **Spec fields** (already built): `tierName`, `totalEditionSize`, `printSubstrate`, dimensions, `includesSupportingPrints`
- **Commerce reference** (already built): `vendureProductId` — a pointer to the Vendure product, not commerce data itself
- **Ownership** (new — see `dcs-editiontiers-ownership-addendum.md`): `copies[]`, the same shape already designed elsewhere in this project — copy number, owner, claim status, visibility, date acquired

This is the artist's authoritative record of what the print is and who has confirmed ownership of each copy. It is deliberately slower and more careful than commerce — a copy only becomes `claimed-confirmed` here when the artist has actually recorded and stands behind that fact, regardless of how quickly a sale happened.

### Commerce layer — Vendure, scoped narrowly

Vendure's only authoritative responsibility in this architecture is **`editionsRemaining` — real-time stock at the point of sale** — plus price, currency, and the transaction/checkout/fulfillment flow itself. Vendure does not define what a print *is* (size, substrate) — that's set in Payload and, if needed, pushed to Vendure's product listing, not the reverse.

**Why stock stays in Vendure, not derived from Payload's claimed-copy count:** there is an expected, normal lag between a sale completing in Vendure and the artist manually confirming that buyer's ownership claim in Payload's `copies[]`. Vendure's stock count has to update at the moment of sale to prevent overselling — it cannot wait for the artist's confirmation step. Payload's claimed-count and Vendure's remaining-count are allowed to disagree during this window, and that's correct, not a bug: Vendure answers "is this available to buy right now," Payload answers "who has the artist confirmed owns this."

**What the public archive page displays:** the claimed-count shown in the Editions accordion ("4 of 9 claimed") is computed from Payload's `copies[]`, never from Vendure's `editionsRemaining`. The archive shows what's been verified and recorded by the artist, not raw transactional state — consistent with the project's founding principle that this record is structured by the artist, outside market validation systems.

### Series layer — template only

If useful, a series-level template record can store typical spec values (tier name, typical size, typical substrate) purely to speed up creating a new artwork's tier entries. It is not queried at render time, not a relation the page depends on, and changing it never alters existing artwork data. If this isn't worth building, it can be skipped entirely — every artwork's tier values can simply be typed fresh, exactly as `dcs.editionTiers[]` already works today.

---

## Two decisions, restated and corrected

### Decision 1 — `vendureProductId` lives on the artwork-side tier entry (confirmed correct, already built)

This was right in the original version of this document, and the existing `dcs.editionTiers[]` structure already implements it: each artwork's tier entry carries its own `vendureProductId`, since the sellable product is "a Collectors print of *this specific artwork*," not an abstract series-level slot.

### Decision 2 — ownership truth is never auto-derived from a sale (unchanged, now with the stock-lag detail made explicit)

Even with Vendure as the live stock authority, a completed Vendure sale does not automatically write to `copies[].claimStatus`. The sale decrements `editionsRemaining` in Vendure immediately; whether and how that becomes a publicly-displayed claimed copy with an owner's name is a separate, deliberate editorial act the artist performs afterward — the same act as confirming any other claim, regardless of how the sale happened. This preserves the gap between "a transaction occurred" and "the artist has recorded and stands behind this fact" — and that gap is honest, not a defect to engineer away.

### Do NOT

- Do not build a `SeriesEditionTiers` collection as a live source of truth that the page renders from — tier specs live on the artwork's own `editionTiers[]`, full stop
- Do not derive the publicly-displayed claimed-count from Vendure's `editionsRemaining` — always compute it from Payload's `copies[]`
- Do not write Vendure transaction data directly into `copies[].claimStatus` under any circumstance, automated or otherwise
- Do not let a series-level template (if built) become something the page queries at render time — it's a data-entry convenience only

---

## How the layers compose, end to end

A worked example — Basel Switzerland, Collector's print tier:

1. **Artwork layer (spec)**: Basel Switzerland's `dcs.editionTiers[]` has an entry already created — `tierName: "Collector's print"`, `totalEditionSize: 9`, `printSubstrate: "Aluminum mount"`, with a `vendureProductId` pointing to the corresponding Vendure product. These values were typed directly for this artwork (possibly pre-filled from a series template at creation time, but now independent data).

2. **Artwork layer (ownership)**: The same tier entry gains a `copies[]` array holding the real claims: `2/9 → K. Müller, claimed-confirmed, collectorVisible: true`, and so on. This is populated by the artist, deliberately, whenever a claim is confirmed — regardless of how the buyer came to own the copy.

3. **Commerce layer**: Vendure tracks `editionsRemaining` for this tier in real time as purchases happen. If someone buys copy 6 of 9 through Vendure, that count drops immediately — independent of whether the artist has yet added a `copies[]` entry for that buyer.

4. **Page render**: `EditionTierRegistry.tsx` reads the artwork's `editionTiers[]` directly — spec line (size/substrate) always visible in the header, claimed-count and expandable rows computed from `copies[]`. Vendure's `editionsRemaining` is never read by the public page; it exists purely to drive the checkout experience and prevent overselling.

---

## Summary table

| Question | Layer | Field(s) |
|---|---|---|
| What size/material does this artwork's Collector's print come in? | Artwork | `editionTiers[].printSubstrate`, dimensions |
| Who owns copy 5 of 9 of this specific artwork? | Artwork | `editionTiers[].copies[]` |
| Is this copy publicly attributed to a name? | Artwork | `copies[].collectorVisible` |
| Is this tier currently in stock / purchasable right now? | Commerce | Vendure `editionsRemaining` |
| What does the public archive page show as "claimed"? | Artwork (always) | `copies[]`, never Vendure |
| Did someone just buy one? | Commerce | Vendure transaction → artist reviews → manual edit to `copies[]` |
| Does this specific work have prints at all? | Artwork | `hasEditions` |
| Does this small-print activity even get tracked? | Series (note, not tier data) | `seriesUntrackedEditionsNote` |

---

*Print Data Architecture — Reference · June 2026 · Revised after surfacing the existing dcs.editionTiers[] structure*
*Implemented by: dcs-editiontiers-ownership-addendum.md (supersedes series-edition-tiers-addendum.md), edition-schema-reconciliation-addendum.md, provenance-depth-finalization-addendum.md*
*Future work: Vendure integration spec should reference the corrected layer split above as binding, not open to re-litigation*
