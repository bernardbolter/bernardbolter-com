# Event Page Fixes — Brief
## Based on live review of /events/megacities (Circylar Gallery, 2020)
*June 2026*

This is a fix-and-build brief against a real, already-populated event page — not a fresh template spec. Apply directly to the existing `/events/[slug]` template, since these issues will affect every event page, not just this one.

---

## Part 1 — Bugs (fix first, not design choices)

### 1.1 Raw ISO date strings displaying

Currently rendering as `2020-01-01T00:00:00.000Z – 2020-12-13T00:00:00.000Z`. Format `startDate`/`endDate` for display — e.g. `Jan – Dec 2020`, or for single-day events `16 Nov 2020`. Use month/year precision only; do not display time-of-day. If `isOngoing`, render end as "ongoing."

### 1.2 Duplicate header / nav / icon rendering

The floating assistant icons and the hamburger+icon are repeating multiple times down the full length of this page (more than the two-instance duplication seen on the CV page). This confirms the bug is **not page-specific** — find the shared header/nav/chrome component and check for multiple mount points (e.g. a component re-mounting on scroll, or both a mobile and desktop instance rendering simultaneously instead of being conditionally swapped). Fix at the source component. Verify the fix resolves the issue on both the CV page and this event page, since both show the same symptom.

### 1.3 `descriptionShort` and `descriptionLong` both rendering, near-duplicate content

The page currently shows `descriptionShort` immediately followed by `descriptionLong`, and the two say almost the same thing in slightly different words. Remove `descriptionShort` from this template entirely — it should only be used for previews/cards/JSON-LD meta description, not displayed on the full page. Only `descriptionLong` renders here.

---

## Part 2 — Installation images: resize to a grid

Currently each installation photo renders near full viewport height, stacked in a single column — the page is mostly photo-scroll.

**Change to:**
- 2-column grid (single column on mobile)
- Each image capped at a fixed max-height (~500–600px)
- `object-fit: cover` within that fixed frame

**Note on `object-fit`:** the sitewide `object-fit: contain` invariant applies to **artwork images**, protecting their real proportions. Installation/documentation photos are a different category — they are not the artwork itself, so cropping to a consistent frame with `cover` is the correct, intentional choice here and does not violate that invariant. Do not apply `contain` to `installationImages`.

- Caption renders below each image in the existing small muted style, unchanged
- `altText` remains on the `<img>` tag as before, unaffected by the layout change

---

## Part 3 — Add "Artworks Shown" section

Currently missing entirely. Add a new section between the description and the references/footer:

- Heading: "Artworks Shown" (or similar — match existing section-heading style used elsewhere on the site)
- Grid of the event's `artworks[]` relation, reusing the **existing artwork-card component** from the homepage/browsing grid — same real-size-scaling logic, do not build a new card component
- If `artworkPresentationNote` is filled, render it as a short caption/intro line above the grid (e.g. *"Shown as four wheatpasted satellite collages, with Skate City presented on a low pedestal table."*)
- If `artworks[]` is empty for a given event, hide this section entirely — same hide-when-empty rule used throughout the rest of the site

**Before building:** check whether `artworks[]` is actually populated on the Megacities record in Payload. If it's empty, that's a data issue from the dialogue session, not a template bug — confirm which before assuming the section needs new code versus the relation just needing to be filled in.

---

## Part 4 — Remove the map link entirely

Remove the "View on map" link and any associated map-link UI from the template. Do not replace it with a functional Google Maps link — just remove it. `venueLatLng` stays in the schema and continues to feed JSON-LD `location` data; it simply has no visual/interactive counterpart on the page going forward.

---

## Part 5 — What NOT to do

- ✗ Do not apply `object-fit: contain` to installation images — that rule is for artworks only
- ✗ Do not keep `descriptionShort` visible anywhere on this page
- ✗ Do not add a functional map link in place of the removed one
- ✗ Do not build a new artwork-card component — reuse the existing one
- ✗ Do not render the "Artworks Shown" section header when `artworks[]` is empty

---

## Part 6 — Files likely involved

| File | Change |
|---|---|
| `src/app/(site)/events/[slug]/page.tsx` (or equivalent) | Remove descriptionShort render, remove map link, add Artworks Shown section |
| Date formatting utility (shared, used elsewhere if one exists) | Apply to `startDate`/`endDate` here |
| Installation images component | Switch to 2-col grid, capped height, `object-fit: cover` |
| Header/nav/chrome component (shared) | Investigate and fix duplicate mount — Part 1.2 |

---

## Part 7 — Verification

- [ ] Dates render as readable month/year, not raw ISO strings
- [ ] No duplicate header/icon/chrome elements anywhere on the page, on first load and after scrolling
- [ ] Same chrome-duplication check re-verified on the CV page
- [ ] Only `descriptionLong` displays — `descriptionShort` is gone from this template
- [ ] Installation images render in a 2-column grid, capped height, cropped with `cover`
- [ ] Artworks Shown section appears with the correct artwork cards, or is absent entirely if `artworks[]` is empty
- [ ] `artworkPresentationNote` renders as a caption above the artworks grid when present
- [ ] "View on map" link and any map UI is fully removed
- [ ] `venueLatLng` still present in the record and in JSON-LD output, even with no visual map

---

*June 2026 · Fix brief against the live Megacities (Circylar Gallery, 2020) event page*
