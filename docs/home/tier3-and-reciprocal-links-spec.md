# Tier 3 Gap Fix + Reciprocal Throughline/Bio-Event Links — Cursor Spec
*August 2026. Follows the corpus traversal work, page weight reduction, sitemap expansion, and bio/throughline permalink pages (`bio-throughline-permalink-pages-spec.md`).*

---

## Part 0 — Why, and what this does NOT touch

Two separate, small gaps, bundled here because they're both "close a hole in an existing structure" rather than new build:

1. **Tier 3 is missing from `tierMap`.** Live testing (`/api/corpus/index`, `/api/corpus/antiquity`, `/api/corpus/antiquity/sessions`) confirms every response lists tiers 1, 2, 4, 5. Tier 3 — vision analysis — has no address anywhere in the machine-readable map, even though `/[slug]/vision` pages exist and are already in the sitemap per `sitemap-and-open-items-brief.md`. It's not 404ing; it's invisible. Nothing points to it.

2. **Throughline/bio-event links only run one direction.** A throughline page lists the artworks that belong to it (`linkedArtworkSlugs`, rendered as cards — built in `bio-throughline-permalink-pages-spec.md`). An artwork's own page has no reciprocal link back — nothing on `/antiquity` says "this piece is part of the invented-antiquity pattern, see also five other works," even though the page's own prose gestures at exactly that connection. Visual Similarity already does this reciprocally; throughlines and bio-events don't yet.

**Do NOT** touch `/api/corpus/*` field selection, response shape, or vocabulary beyond what's specified below. Do NOT change the locked `bioTimelineEntries`/`statementThroughlines` field shapes from `bio-throughline-permalink-pages-spec.md` — this spec reads from them, doesn't restructure them.

---

## Part 1 — Tier 3 gap

**Step 1 — Report before building.** Confirm current state:
- Does a Tier 3 *JSON* endpoint exist at all (e.g. `/api/corpus/[slug]/vision`), or does vision analysis only exist as the HTML page at `/[slug]/vision`?
- If no JSON endpoint exists, is one wanted, or should Tier 3 in `tierMap` point directly at the HTML page? (Reasonable either way — the two-axis model this project is moving toward doesn't require every tier to be JSON, just addressable. Flag both options back rather than picking one silently.)

**Step 2 — Add Tier 3 to `tierMap`** on `/api/corpus/index` and `/api/corpus/[slug]`, following the exact shape tiers 1/2/4/5 already use. Only include it for artworks with ≥1 vision analysis — mirror the sitemap rule from `sitemap-and-open-items-brief.md` ("Do NOT include for artworks with none — thin pages hurt index quality").

**Step 3 — Verify** `artism:tier` counts and `tierMap` entries are consistent across `/api/corpus/index`, `?depth=survey`, and individual `/api/corpus/[slug]` responses for at least one artwork with vision analysis and one without.

---

## Part 2 — Reciprocal throughline/bio-event links

**Step 1 — Confirm the Visual Similarity implementation pattern first.** That's the one existing reciprocal lateral link on artwork pages. Check whether it's a stored field (backfilled, updated on write) or a live query, and follow that same pattern here rather than introducing a third approach. Report which it is before proceeding.

**Step 2 — Recommended approach: live reverse query, not a stored/backfilled field.**

Given the pattern in Step 1 likely supports it, and given `linkedArtworkSlugs` on `bioTimelineEntries`/`statementThroughlines` is already the single source of truth: query both arrays for entries whose `linkedArtworkSlugs` includes the current artwork's slug, at record-fetch time (JSON) and page-render time (HTML). No new stored field on Artworks, no backfill script, no two places to keep in sync. This is self-maintaining by construction — a new throughline added next month reciprocally links automatically, with nothing further to remember.

**If Step 1 shows Visual Similarity is a stored/precomputed field instead** (e.g. because embeddings comparison is too expensive to run live), then match that instead: add `artism:relatedByThroughline` / `artism:relatedByBioEvent` as stored array fields on Artworks, and write a one-time backfill script that iterates the current two collections' `linkedArtworkSlugs` arrays and writes the reverse reference onto each matching Artwork record. At current volume (one throughline, two bio entries) this backfill is trivial — a handful of writes, easy to verify by hand against the source records afterward.

**Step 3 — Surface the result in three places:**
- `/api/corpus/[slug]` (Tier 4 JSON) — add `artism:relatedByThroughline` and `artism:relatedByBioEvent` as arrays of `{ name, url }`, same shape convention as other relation fields in the corpus.
- The artwork HTML page — a visible section, styled consistently with the existing `Visual Similarity` section (reuse that component's layout, don't invent a second card style), linking to the relevant `/statement/throughlines/[slug]` or `/bio/entries/[slug]` permalink pages.
- `/api/corpus/index` (Tier 1) — do NOT add full reciprocal data here; a lightweight boolean or count (`hasThroughlineConnections: true`) is enough as a drill-down signal, full detail stays at Tier 4.

**Step 4 — Verify against the one live case.** `venice-biennale-2007` / `münster-2007` throughline should now produce visible, correct reciprocal links on every artwork in its `linkedArtworkSlugs`, and those links should round-trip: artwork → throughline page → back to the same artwork among its siblings.

---

## Do NOT

- Do NOT add a stored reciprocal field if Visual Similarity uses a live query — match the existing pattern (Step 1 gate).
- Do NOT modify `bioTimelineEntries`/`statementThroughlines` field shapes — read-only for this spec.
- Do NOT add full backlink detail to the Tier 1 index — signal only, per Part 2 Step 3.
- Do NOT add Tier 3 to `tierMap` for artworks with zero vision analyses.
- Do NOT use a denylist `select` anywhere in any new query — allowlist only, per the standing project rule (`3283f01` incident).
- Do NOT invent a new card/section style for the reciprocal links — reuse the Visual Similarity component's visual treatment.

---

## Verification checklist

- [ ] Tier 3 present in `tierMap` on index and record responses, only for artworks with vision analysis
- [ ] Tier 3 addressing (JSON endpoint or HTML page — per Step 1 decision) confirmed working for at least one artwork
- [ ] Reciprocal link mechanism matches Visual Similarity's existing pattern (live query or stored+backfilled — confirmed, not assumed)
- [ ] `artism:relatedByThroughline` / `artism:relatedByBioEvent` present on Tier 4 JSON for artworks in the live throughline/bio entries
- [ ] Visible reciprocal section on artwork HTML pages, styled consistently with Visual Similarity
- [ ] Round-trip confirmed: artwork → throughline permalink page → back to sibling artworks
- [ ] Tier 1 index carries only a lightweight signal, not full backlink data
- [ ] No denylist `select` introduced anywhere in this work

---

*Tier 3 gap + reciprocal throughline/bio-event links · August 2026*
*Read alongside: corpus-tier-depth-and-traversal-spec.md, corpus-traversal-patch-spec.md, bio-throughline-permalink-pages-spec.md, sitemap-and-open-items-brief.md*
