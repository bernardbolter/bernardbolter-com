# Megacities Edition Tier Auto-Population Addendum
## bernardbolter.com · Schema/Hook Addition — Cursor Implementation Spec
*June 2026*

---

## Read first

- `dcs-tier-autopopulate-addendum.md` — the hook this generalizes. Read the implementation report for `dcsEditionTierAutopopulate.ts` / `artworkDcsEditionTiersBeforeChange.ts` before starting.

---

## Why

Confirmed: Megacities' edition tier structure (tier names, count) is fixed and identical across every Megacities artwork, the same as DCS. The existing hook is scoped specifically to `series === 'digital-city-series'` — it does not cover Megacities at all right now. Rather than write a near-duplicate Megacities-specific hook, generalize the existing one.

## What to build

Generalize `dcsEditionTierAutopopulate.ts` / `artworkDcsEditionTiersBeforeChange.ts` (rename if it makes sense to drop the "dcs" prefix once it's shared — your call, low priority) to:

- Trigger for any artwork whose series is one with a known fixed tier structure — initially Digital City Series and Megacities, matched by series slug
- Look up `SeriesEditionTiers` records for whichever series the artwork belongs to (not hardcoded to DCS), sorted by `tierOrder`
- Auto-populate `editionTiers[]` with one entry per tier, `seriesEditionTier` set, exactly as the existing DCS behavior — same empty-array guard, same "only when currently empty" rule, same `skipDcsEditionTierAutopopulate`-style context flag (rename or keep, your call) to allow explicit skipping

### Do NOT

- Do not auto-populate for series without a confirmed fixed tier structure (e.g. A Colorful History generally, which uses the inline fallback / `seriesUntrackedEditionsNote` path, not `SeriesEditionTiers`)
- Do not touch already-populated `editionTiers[]` on any artwork, regardless of series — unchanged rule from the original addendum
- Do not assume every future series gets this behavior automatically — keep the trigger list explicit (DCS, Megacities) rather than "any series with any SeriesEditionTiers records," since a series could have tier definitions without every artwork in it being uniform

## Verification

- Create `SeriesEditionTiers` records for Megacities (real tier names/sizes/substrates, your call on values)
- Create a new test Megacities artwork with no `editionTiers[]` → save → confirm all Megacities tiers appear with `seriesEditionTier` linked
- Re-save Basel (DCS) → confirm still unaffected, hook still works for DCS after generalization
- Save a non-DCS, non-Megacities artwork → confirm no auto-population
