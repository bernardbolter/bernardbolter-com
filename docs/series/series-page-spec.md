# Series Page Spec
## bernardbolter.com · `/series/[slug]` · June 2026

*Read fully before starting. This page reuses the homepage's existing artwork-browsing machinery — it is not a new visual design. The work here is routing, initial-state overrides, and JSON-LD, not new components.*

---

## Part 0 — Why this page exists

The Bio (and eventually other static pages) name specific series by text — "Megacities," "Digital City Series," "Mediums of Perception." Those mentions need to link somewhere real: a URL with its own metadata and JSON-LD identity, not a bare text label. Rather than design a new custom series-overview layout, this page is the **existing homepage grid/timeline experience, opened pre-filtered to one series**, with the default view mode set to grid instead of timeline for this route only.

This is a deliberately temporary, swappable link target. When the planned dedicated series microsite goes live, every link currently pointing at `/series/[slug]` switches in one place — see Part 5.

---

## Part 1 — Schema

No new fields required. The `Series` collection already has everything this page needs: `name`, `slug` (auto-generated, unique), `description` (richText), `yearStart`, `yearEnd`, `city`, `country`, `coverImage`, `status`.

✓ Confirm `Series.slug` is unique and indexed — this is the route param.

---

## Part 2 — Page structure

### 2.1 File location

```
src/app/(public)/series/[slug]/page.tsx
```

Server component. Fetches:
1. The `Series` record matching `slug` (404 if not found or `status !== 'published'`)
2. The `Artist` singleton (for JSON-LD creator block — same pattern as every other page)
3. Artworks where `series` relation matches this Series record and `status === 'published'` — passed as the initial artwork set

### 2.2 This is NOT an overlay page

No close button, no fixed-position chrome distinct from the homepage. Same nav, same right-side icon stack (Filter / Search / Play), same header treatment. A person should be able to reach this page, browse, change the filter or view mode, and navigate normally — it behaves like a second entry point into the same browsing experience, not a modal layered on top of it.

### 2.3 Initial state overrides

Two things differ from a fresh homepage load:

1. **View mode defaults to `grid`**, not `timeline`.
2. **The series filter is pre-set** to this page's series (shown as an active pill in the Filter drawer, exactly as if the person had clicked it themselves).

Both are *initial* state only — the person can change either after landing. Changing the filter or view mode on this page must not be blocked or special-cased; it should behave exactly like the homepage from that point forward.

**Implementation approach:** Before writing any code, inspect `ArtworkProvider.tsx` (or wherever view-mode/filter state currently lives — confirm actual location, it may not be ported yet) for the real state shape and setter names. Do not invent function names. The general shape will be: a client wrapper component (e.g. `SeriesPageClient.tsx`) that receives the resolved `slug` and initial artworks as props from the server component, and on mount calls the provider's existing view-mode and filter setters once — not on every render, not via a `useEffect` with a missing dependency array that could loop.

**Homepage must self-reset.** Because this is shared global provider state, the homepage route (`/`) should explicitly reset to its own defaults (`timeline`, no filter) on its own mount, rather than relying on the series page to clean up after itself on unmount. This avoids ordering bugs (e.g. back-button navigation skipping unmount logic) and keeps each route responsible for its own initial state.

### 2.4 Header

Use the existing `HeaderTitle` decorative overlay pattern (same component as Bio/CV/Statement), large mode, with the series `name` as the text — e.g. "megacities". No intro paragraph, no description block, no year range displayed above the grid. The page goes straight into the artwork browsing UI.

---

## Part 3 — JSON-LD

**File:** `src/utilities/generateSeriesJsonLd.ts`, called from `generateMetadata` in `page.tsx`, same injection pattern as the artwork page (`<script type="application/ld+json">` in `<head>`).

```json
{
  "@context": {
    "@vocab": "https://schema.org/",
    "artism": "https://artism.org/schema/"
  },
  "@type": "CollectionPage",
  "name": "[series.name]",
  "url": "https://bernardbolter.com/series/[series.slug]",
  "mainEntity": {
    "@type": "Collection",
    "name": "[series.name]",
    "description": "[series.description — plain-text rendered from richText, NOT the full richText structure]",
    "startDate": "[series.yearStart]",
    "endDate": "[series.yearEnd — omit entirely if null/ongoing, do not output null]",
    "creator": {
      "@type": "Person",
      "name": "Bernard Bolter",
      "identifier": [
        { "@type": "PropertyValue", "propertyID": "ULAN", "value": "[artist.ulanUri]" },
        { "@type": "PropertyValue", "propertyID": "Wikidata", "value": "[artist.wikidataUri]" }
      ]
    }
  }
}
```

This is the same `Collection` object shape already planned in `master-schema-spec.md` as the target of every artwork's `isPartOf` field — this page is where that object finally has a real URL to live at. Confirm the artwork-page JSON-LD's `isPartOf.url` matches this page's URL exactly (`https://bernardbolter.com/series/[slug]`) — they must resolve to the same address.

**Do NOT:**
- Output `endDate` as `null` or empty string when the series is ongoing — omit the key entirely
- Inline the full richText `description` structure — resolve to a short plain-text string (strip formatting, cap length if needed for a clean JSON-LD value)
- Add a `hasPart` array enumerating every artwork — at scale this bloats the JSON-LD for no real benefit; the artwork→series relationship is already covered by each artwork's own `isPartOf` back-reference. Skip it.

---

## Part 4 — What NOT to do

- ❌ Do not design new visual components for this page — it is the existing grid/timeline UI with different initial state, full stop
- ❌ Do not add a close button or any overlay-page chrome — this is a standalone page, not a Bio/CV/Contact-style modal
- ❌ Do not add an intro text block, description, or year range above the grid
- ❌ Do not hardcode the series filter as permanently locked — the person must be able to change or clear it
- ❌ Do not let this route's initial-state overrides leak into the homepage's own defaults — homepage resets itself on its own mount
- ❌ Do not guess `ArtworkProvider` setter names — inspect the real file first
- ❌ Do not enumerate all artworks in the JSON-LD `Collection` block

---

## Part 5 — The future swap

Centralize every link to a series behind one helper:

```ts
// src/utilities/getSeriesLinkHref.ts
export function getSeriesLinkHref(slug: string): string {
  return `/series/${slug}`
  // Future: return `https://[dedicated-series-site]/${slug}` once that site is live
}
```

Every place that links to a series — the Bio page mentions, eventually anywhere else — calls this helper rather than constructing the URL inline. When the dedicated series microsite ships, this is a one-file change.

---

## Part 6 — Build order

**Step 1 — Route + data fetching**
Build `page.tsx`. Fetch Series by slug (404 on missing/unpublished), Artist singleton, and the filtered initial artwork set.
✓ Visiting `/series/megacities` (or whatever the real slug is) returns the page, not a 404, for a published series. Visiting a draft or nonexistent slug 404s.

**Step 2 — Initial state wiring**
Inspect the real provider implementation. Build `SeriesPageClient.tsx` (or equivalent) that sets view mode to grid and the filter to this series on mount, once.
✓ Landing on the series page shows grid view with only this series' artworks. Changing the filter or switching to timeline works normally afterward. Navigating to `/` shows the homepage's own defaults (timeline, no filter), not whatever was last set on a series page.

**Step 3 — Header**
Wire `HeaderTitle` with the series name, large mode, matching Bio/CV/Statement treatment.
✓ Series name renders as the decorative overlay title, scales correctly across breakpoints per the existing header-overlay type scale.

**Step 4 — JSON-LD**
Build `generateSeriesJsonLd.ts`. Inject via `generateMetadata`.
✓ View page source / inspect the `<script type="application/ld+json">` block. Confirm it matches the shape in Part 3. Confirm `endDate` is absent (not null) for an ongoing series. Confirm `description` is plain text, not a richText object dump. Validate with Google's Rich Results Test or equivalent.

**Step 5 — getSeriesLinkHref helper**
Build the helper in Part 5. Update the Bio page's series mentions to use it instead of any inline href construction.
✓ All series links on the Bio page resolve to `/series/[slug]` and use the shared helper, not a hardcoded string.

**Step 6 — Cross-check homepage reset**
Confirm Step 2's homepage self-reset doesn't introduce a flash of wrong state (e.g. briefly showing grid before snapping to timeline) on normal homepage loads.
✓ Loading `/` directly, and navigating to `/` from a series page, both produce the same clean timeline-default result with no visible flicker.

---

*Series page spec · bernardbolter.com · June 2026*
