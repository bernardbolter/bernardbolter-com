# DCS/Megacities Edition Tiers — Ownership Layer Addendum
## bernardbolter.com · Schema Addition — Cursor Implementation Spec
*June 2026 · Bernard Bolter × Claude*

---

## Read first

- `print-data-architecture-reference.md` — **read this first, including the revision note at the top.** It corrects the original layer model after surfacing that `dcs.editionTiers[]` already exists, is already populated, and is already wired to Vendure.
- `provenance-depth-finalization-addendum.md` — the multi-copy original display and provenance marker system this addendum's `copies[]` data feeds into

**This document supersedes `series-edition-tiers-addendum.md` entirely.** Do not implement that document. The `SeriesEditionTiers` collection it specified is not built — tier specs stay on the existing per-artwork `editionTiers[]` structure instead.

---

## What already exists (confirmed from the live Payload admin)

The DCS tab on the Artwork collection already has `editionTiers[]` with real data: tier name, total edition size, print substrate, "includes supporting prints," `vendureProductId`, webhook-maintained `editionsRemaining`, and `tierAvailabilityStatus`. This is the artist's real, working tier-and-commerce structure — Small print, Collector's print, Monumental (or equivalent names) for Basel Switzerland today. Megacities has (or should have) an equivalent structure on its own tab.

**None of this is duplicated or replaced by this addendum.** It is extended with one thing: per-copy ownership.

---

## What's added: `copies[]` on each tier entry

Add a new array field to each entry in `dcs.editionTiers[]` (and the Megacities equivalent):

```ts
{
  name: 'copies',
  type: 'array',
  fields: [
    { name: 'copyNumber', type: 'text', required: true },           // "1/3", "47/100", "AP"
    { name: 'isArtistProof', type: 'checkbox', defaultValue: false },
    { name: 'owner', type: 'text' },                                  // display name; empty = unclaimed
    {
      name: 'claimStatus',
      type: 'select',
      options: ['unclaimed', 'claimed-pending', 'claimed-confirmed', 'artist-held', 'sold-secondary'],
      defaultValue: 'unclaimed',
    },
    { name: 'collectorVisible', type: 'checkbox', defaultValue: false },
    { name: 'dateAcquired', type: 'date' },
    { name: 'claimedCopyNumberKnown', type: 'checkbox', defaultValue: false },
    { name: 'notes', type: 'textarea', admin: { description: 'Private — never rendered publicly' } },
  ],
}
```

Same shape already established in earlier addenda — nothing new about the per-copy fields themselves, only where they now live (nested inside the existing per-artwork `editionTiers[]` entry, rather than a separate top-level `ownershipRegistry[]` relating out to a series collection).

**`isOriginalTier`** also moves here as a field directly on each `editionTiers[]` entry (not a separate relation):

```ts
{
  name: 'isOriginalTier',
  type: 'checkbox',
  defaultValue: false,
  admin: { description: 'True only for the tier that IS the artwork itself — e.g. DCS/Megacities 3+1AP. Renders in Status & Provenance, not in the Editions accordion. See provenance-depth-finalization-addendum.md.' },
}
```

### Do NOT

- Do not create a separate `SeriesEditionTiers` collection — this addendum replaces that approach
- Do not relate `copies[]` out to anything — it lives directly nested inside the existing `editionTiers[]` entry it belongs to
- Do not modify or remove any existing field on `editionTiers[]` (`vendureProductId`, `editionsRemaining`, etc.) — this is a pure addition

---

## Stock vs. claimed-count — the display rule

Per the corrected architecture reference: `editionsRemaining` (Vendure-synced) and the claimed-count derived from `copies[]` (Payload-owned) are allowed to diverge, and the public page must always display the **Payload-derived** number, never Vendure's.

```ts
const claimedCount = tier.copies.filter(
  c => !c.isArtistProof && c.claimStatus === 'claimed-confirmed'
).length

// Display: `${claimedCount} of ${tier.totalEditionSize} claimed`
// NEVER: tier.editionsRemaining for this purpose
```

`editionsRemaining` is not displayed on the public artwork page at all under this addendum. It exists purely to drive Vendure's own checkout flow (preventing overselling), which is outside the scope of the archive page.

### Do NOT

- Do not display `editionsRemaining` anywhere on the public artwork page
- Do not compute the claimed-count pill from anything other than `copies[].claimStatus`

---

## Series-level template (optional, lowest priority)

If useful for faster data entry, a simple template can exist — either a small new collection or just default values set on the Series record — holding typical tier name/size/substrate per series, used only to pre-fill a brand-new `editionTiers[]` entry when an artist creates one. This is **not** queried by the page at render time and has no relation the rest of the system depends on. Build this last, or skip it — it's a convenience, not part of the architecture.

---

## Migration note

For `__fixture-basel-dcs` and the real Basel Switzerland artwork (`BB-DCS-2007-002`):

1. Add the `copies[]` field to the schema for `dcs.editionTiers[]`
2. On Basel Switzerland's existing "Original edition"/Monumental tier (3+1AP — confirm which existing tier name corresponds to the original-edition concept), set `isOriginalTier: true` and populate `copies[]`: 1/3 claimed (private collection, Berlin), 2/3 and 3/3 unclaimed, AP entry present but will stay suppressed per the existing AP rule
3. On the Collector's print tier, populate `copies[]` with the claimed entries already designed in earlier fixture work (K. Müller, private collection London, etc.)
4. On the Small print tier, leave `copies[]` empty (0 claimed, "Edition of 200 — available")
5. Set `hasEditions: 'limited'` on this artwork

This replaces the earlier fixture instruction that referenced a `seriesEditionTier` relation — there is no such relation under this corrected model. `copies[]` is added directly to the existing tier entries.

---

## Verification checklist

- [ ] No `SeriesEditionTiers` collection exists — confirmed not built, per the corrected architecture
- [ ] `copies[]` is added directly to each `editionTiers[]` entry on the DCS tab (and the Megacities equivalent)
- [ ] `isOriginalTier` is a field on each `editionTiers[]` entry, not a separate relation
- [ ] Public claimed-count pill is computed from `copies[]`, never from `editionsRemaining`
- [ ] `editionsRemaining` is not displayed anywhere on the public artwork page
- [ ] Basel Switzerland's (`BB-DCS-2007-002`) real tier data is migrated: `isOriginalTier` set on the correct tier, `copies[]` populated across all three tiers per the migration note
- [ ] `EditionTierRegistry.tsx` and the multi-copy Status & Provenance block both read from `editionTiers[].copies[]` directly, with no relation lookup

---

*DCS/Megacities Edition Tiers — Ownership Layer Addendum · June 2026*
*Supersedes: series-edition-tiers-addendum.md (do not implement that document)*
*Read alongside: print-data-architecture-reference.md, provenance-depth-finalization-addendum.md, edition-schema-reconciliation-addendum.md*
