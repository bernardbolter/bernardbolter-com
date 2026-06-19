# DCS Edition Tier Auto-Population Addendum
## bernardbolter.com · Schema/Hook Addition — Cursor Implementation Spec
*June 2026*

---

## Read first

- `print-data-architecture-reference-v2.md`, `dcs-editiontiers-ownership-addendum-v2.md` — this builds on Steps 1-4 of that work, apply after Step 4 (Basel migration) is verified

---

## Why

All Digital City Series artworks use the same three fixed tiers (Small print, Collector's print, Monumental) — confirmed, not "usually." Requiring a manual `seriesEditionTier` dropdown selection per tier per artwork is pure repetition with no actual decision being made — every DCS artwork gets the identical three relations, every time.

## What to build

A Payload hook (`beforeChange` or `afterChange` on the Artwork collection, scoped to artworks where the series is Digital City Series) that auto-populates `editionTiers[]` with three entries — one per DCS `SeriesEditionTiers` record — when:

- A new artwork is created and tagged as Digital City Series, and `editionTiers[]` is currently empty, OR
- An existing DCS artwork's `editionTiers[]` is empty and the artwork is saved

Each auto-created entry should have `seriesEditionTier` already set to the matching DCS tier record (matched by `tierOrder` or a stable identifier, not by re-typing the name), and `tierName`/`totalEditionSize`/`printSubstrate`/`vendureProductId` left empty (these are the deprecated fallback fields — no need to populate them when the relation is set from creation).

Leave `vendureVariantId` and `copies[]` empty for the artist to fill in per-artwork — these cannot be automated.

### Do NOT

- Do not overwrite or duplicate `editionTiers[]` entries if they already exist on an artwork (e.g. Basel, already migrated) — only auto-populate when the array is genuinely empty
- Do not auto-populate this for non-DCS artworks — scope strictly to artworks tagged with the Digital City Series
- Do not auto-fill `vendureVariantId` or `copies[]` — these remain manual, per-artwork entry

## Verification

- Create a new test DCS artwork with no `editionTiers[]` data → confirm all three tiers appear automatically with `seriesEditionTier` already linked
- Confirm Basel's existing (already-migrated) `editionTiers[]` are untouched by this hook, not duplicated or reset
- Confirm a non-DCS artwork (e.g. Gates of Perception III) is unaffected
