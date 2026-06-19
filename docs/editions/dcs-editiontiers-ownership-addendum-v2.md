# Series Edition Tiers + Per-Artwork Ownership — Implementation Addendum
## bernardbolter.com · Schema Addition — Cursor Implementation Spec
*June 2026 · Bernard Bolter × Claude · Supersedes the earlier version of this document*

---

## Read first

**`print-data-architecture-reference-v2.md` — read this first, in full.** This addendum implements the model it describes. If you previously read an earlier version of this addendum that said "do not build SeriesEditionTiers" — that guidance is reversed. The architecture reference's "Revision history" section explains why.

---

## What this addendum does

Three changes, working together:

1. **Build `SeriesEditionTiers`** as a real collection — tier spec (name, size, substrate, edition size, AP count, `isOriginalTier`) plus the **one shared `vendureProductId` per tier, series-wide**.
2. **Extend the existing per-artwork `editionTiers[]`** (already built on the DCS tab, confirmed working with real data on Basel Switzerland) to **relate to** the matching `SeriesEditionTiers` record, and add `vendureVariantId` (this artwork's specific stock-tracked variant within the shared product) and `copies[]` (per-copy ownership — already speced in earlier work, now confirmed to live here).
3. **Migrate Basel Switzerland's real, already-entered tier data** into this corrected shape without losing what's there.

---

## Step 1 — Build `SeriesEditionTiers`

New Payload collection:

```ts
{
  slug: 'series-edition-tiers',
  fields: [
    {
      name: 'series',
      type: 'relationship',
      relationTo: 'series',
      required: true,
      admin: { description: 'Can point to a top-level series OR a specific sub-series (e.g. "Mediums of Perception" within A Colorful History). Tiers here apply only to artworks tagged with that exact series/sub-series.' },
    },
    { name: 'tierName', type: 'text', required: true },
    { name: 'tierOrder', type: 'number', required: true, admin: { description: '1 = top tier. Display order only.' } },
    {
      name: 'isOriginalTier',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'True only for the tier that IS the artwork itself (DCS/Megacities "Monumental," the 3+1AP tier) — not a reproduction of it. Renders in Status & Provenance, not the Editions accordion.' },
    },
    { name: 'editionSize', type: 'number', required: true, admin: { description: 'Numbered copies only — excludes AP count' } },
    { name: 'apCount', type: 'number', defaultValue: 0 },
    { name: 'widthCm', type: 'number' },
    { name: 'heightCm', type: 'number' },
    { name: 'substrate', type: 'text' },
    { name: 'printTechnique', type: 'text' },
    {
      name: 'vendureProductId',
      type: 'text',
      admin: { description: 'The ONE Vendure Product shared by every artwork using this tier. Price is set and changed directly in Vendure against this product — not duplicated here.' },
    },
    { name: 'notes', type: 'textarea' },
  ],
}
```

### Do NOT

- Do not add a price field here — price is Vendure's, edited there directly
- Do not let one `SeriesEditionTiers` record serve two different series or sub-series — each gets its own complete set, even for similarly-named tiers
- Do not let a sub-series' tiers apply to sibling sub-series or the parent series generally

---

## Step 2 — Extend the existing `editionTiers[]` entries

On each artwork's existing tier entry (DCS tab, confirmed already has `tierName`, `totalEditionSize`, `printSubstrate`, `vendureProductId`, `editionsRemaining`, `tierAvailabilityStatus`, `isOriginalTier`, `copies[]`):

**Add:**

```ts
{
  name: 'seriesEditionTier',
  type: 'relationship',
  relationTo: 'series-edition-tiers',
  admin: { description: 'The shared tier definition this entry belongs to. Name, size, substrate, and the shared Vendure Product are read through this relation.' },
},
{
  name: 'vendureVariantId',
  type: 'text',
  admin: { description: 'This artwork\'s specific Variant within the shared Vendure Product (see seriesEditionTier.vendureProductId). Stock is tracked per-variant, independently per artwork.' },
}
```

**Keep unchanged:** `copies[]`, `editionsRemaining` (still webhook-maintained, still never read by the public page for the claimed-count), `tierAvailabilityStatus`.

**Deprecate (do not delete yet, see migration note):** the per-artwork `tierName`, `totalEditionSize`, `printSubstrate`, and the per-artwork `vendureProductId` field. Once `seriesEditionTier` is populated, the display layer should read name/size/substrate through that relation, not the local fields — but leave the local fields in the schema for now as a fallback for any artwork not yet migrated (e.g. works using one-off, non-series-structured tiers, same fallback case as Gates of Perception III's giclée editions).

### Do NOT

- Do not delete the local `tierName`/`totalEditionSize`/`printSubstrate`/`vendureProductId` fields from the artwork-level entry yet — they remain the fallback path for non-series-structured works
- Do not remove `copies[]` or `editionsRemaining` — both are unchanged and correct as already built
- Do not let the per-artwork `vendureProductId` and the new `vendureVariantId` both populate simultaneously once migrated — after migration, `vendureProductId` lives only on `SeriesEditionTiers`, and the artwork only needs `vendureVariantId`

---

## Step 3 — Display logic update

`EditionTierRegistry.tsx` and the multi-copy Status & Provenance block:

- If `seriesEditionTier` is populated: read `tierName`, size, substrate, and `isOriginalTier` through that relation. Use the artwork's own `vendureVariantId` for any future commerce linking (not displayed publicly today).
- If `seriesEditionTier` is empty (fallback case): read the local `tierName`/`totalEditionSize`/`printSubstrate`/`isOriginalTier` fields directly, exactly as already implemented.
- Claimed-count is always computed from `copies[]`, regardless of which path supplied the spec — this is unchanged from existing implementation.

### Do NOT

- Do not display `editionsRemaining` or any Vendure stock data on the public page — unchanged rule
- Do not compute claimed-count from anything other than `copies[]`

---

## Step 4 — Migrate Basel Switzerland's real data

Basel Switzerland (`BB-DCS-2007-002`) already has three real `editionTiers[]` entries: "Small print," "Collector's print," "Monumental" — with real `totalEditionSize`, `printSubstrate`, and the `isOriginalTier`/`copies[]` fields already present in the schema (confirmed from the live admin) but not yet populated with data.

1. Create three `SeriesEditionTiers` records for Digital City Series, matching Basel's real values:
   - "Monumental" — `isOriginalTier: true`, editionSize 3, apCount 1, real substrate/size from Basel's entry
   - "Collector's print" — editionSize 9 (or whatever Basel's real `totalEditionSize` is — note earlier testing assumed 9, confirm against the actual admin value, which showed "Edition of 6" in one screenshot; reconcile this discrepancy with the real number before finalizing), real substrate/size
   - "Small print" — editionSize 200 (confirm against real value), real substrate/size
2. On Basel's three `editionTiers[]` entries, set `seriesEditionTier` to relate to the matching new record above
3. On Basel's "Monumental" entry specifically, **check `isOriginalTier: true`** if not already inherited correctly from the relation — confirm the display logic correctly treats this as the multi-copy original even before any further code change, since the field already exists per the admin screenshot
4. Populate `copies[]` on each of Basel's three tiers with real ownership data (or leave empty/unclaimed if genuinely nothing has sold yet — do not fabricate claims)
5. Set `hasEditions: 'limited'` on the Basel artwork record if not already set

### Do NOT

- Do not fabricate ownership data to fill `copies[]` — leave entries empty/unclaimed where nothing has actually sold
- Do not guess at Basel's real edition sizes — confirm the actual `totalEditionSize` values currently in the admin before creating the `SeriesEditionTiers` records, since test/fixture data used different numbers than what's actually entered for the real artwork

---

## Verification checklist

- [ ] `SeriesEditionTiers` collection exists with `vendureProductId` as the one shared product reference per tier
- [ ] No price field exists on `SeriesEditionTiers` — price is Vendure-only
- [ ] Each artwork's `editionTiers[]` entry has `seriesEditionTier` (relation) and `vendureVariantId` (own variant) added
- [ ] Local per-artwork `tierName`/`totalEditionSize`/`printSubstrate`/`vendureProductId` fields remain as fallback, not deleted
- [ ] `copies[]` and `editionsRemaining` are unchanged from the existing build
- [ ] Display logic reads spec through `seriesEditionTier` when populated, falls back to local fields otherwise
- [ ] Claimed-count is always computed from `copies[]`, never from `editionsRemaining` or Vendure data
- [ ] Basel Switzerland's real tier data is migrated: three `SeriesEditionTiers` records created with real (not test) values, relations set, `isOriginalTier` confirmed on "Monumental," `copies[]` populated with real or genuinely-empty data
- [ ] Editions accordion no longer shows "Monumental"/the original tier — it renders only in Status & Provenance once `isOriginalTier` is confirmed set

---

*Series Edition Tiers + Per-Artwork Ownership — Implementation Addendum · June 2026*
*Supersedes the earlier version of this document, which incorrectly rejected the SeriesEditionTiers collection*
*Read alongside: print-data-architecture-reference-v2.md, provenance-depth-finalization-addendum.md*
