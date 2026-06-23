# Event Page — Layout Redesign & JSON-LD Brief
## Based on live review of /events/megacities-2020
*June 2026*

Read alongside: `event-page-fixes-brief.md` (prior brief — see note below), `design-system.md`, `artwork-page-directive.md`

---

## Part 0 — Retract one item from the previous brief

`event-page-fixes-brief.md` Part 1.2 asked Cursor to fix "duplicate header/icon rendering." This was **a browser extension artifact in the screenshot tool, not a real website bug.** Remove any code added specifically for this issue. Do not touch the actual header/nav component on this account.

---

## Part 1 — Section order (primary layout change)

The current page renders: header → description → artworks shown → installation photos.

**Change to this order:**

```
1. Page header (title, event type pill, date range, venue name + address)
2. Installation images grid (masonry — see Part 2)
3. descriptionLong (richtext render)
4. artistNote (if filled — rendered as a styled italic blockquote, visually distinct from descriptionLong)
5. Artworks Shown section (see Part 3)
6. Context block (organiser/curator, if filled)
7. References / sameAs footer
```

`descriptionShort` does NOT render anywhere on this page — confirmed removed in prior brief, verify it stays out.

---

## Part 2 — Installation images: masonry grid, natural proportions

**Current state:** 2-column grid with fixed max-height and `object-fit: cover`. This is causing the weird crops visible in the screenshot — all four photos are 1000×1000px square source images, but the gallery space and wall shots have different natural framing.

**Change to:**
- CSS masonry layout (CSS `columns: 2` or CSS Grid `masonry`, or a simple JS masonry library if neither renders correctly in Next.js App Router)
- Each image renders at its **natural aspect ratio** — no fixed height, no `cover` crop
- Column width constrained by the 2-column layout; images scale proportionally within that
- Small gap between images (~8–12px)
- No captions visible in the grid

**Lightbox on click:**
- Full-size image
- Caption rendered below the image in the lightbox
- Prev/next navigation between photos
- Click-outside or Esc to close
- Simple implementation — no heavy library needed; a small React state-based lightbox is fine

**`object-fit` note:** Do NOT use `object-fit: cover` here. That rule only protects artworks from distortion — these are documentation photos, and their natural proportions should be preserved.

---

## Part 3 — Artworks Shown: use the existing artwork card component

**Current state:** The artworks grid is rendering raw images at inconsistent sizes with title labels below — this is NOT using the real-size-scaling artwork card component from the browsing grid/homepage.

**Fix:** Replace whatever is rendering now with the existing artwork card component (the same one used on the main artworks browsing grid and timeline view). This component already handles:
- Real physical size scaling (`sizeTier` + `orientation` → display size)
- `object-fit: contain`
- Title label

Do NOT build a new card component. Import and reuse the existing one.

If `artworkPresentationNote` is filled on the event record, render it as a short text caption/intro **above** the artworks grid, in a muted smaller style.

If `artworks[]` is empty, hide this entire section including the heading.

---

## Part 4 — JSON-LD implementation

Add a `<script type="application/ld+json">` block to the event page `<head>`. Build it server-side from the Payload event record. The schema.org type for solo/group exhibitions is `ExhibitionEvent`.

### 4.1 Full JSON-LD shape for this event type

```json
{
  "@context": "https://schema.org",
  "@type": "ExhibitionEvent",
  "@id": "https://bernardbolter.com/events/megacities-2020",
  "name": "Megacities",
  "description": "[descriptionLong rendered as plain text — strip richtext formatting]",
  "startDate": "2020-11-26",
  "endDate": "2020-12-13",
  "eventStatus": "https://schema.org/EventScheduled",
  "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",

  "location": {
    "@type": "Place",
    "name": "Circylar Gallery",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Schwartzkopffstraße 2",
      "addressLocality": "Berlin",
      "addressCountry": "DE"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 52.5343456,
      "longitude": 13.3795639
    },
    "url": "http://circylar.com/"
  },

  "organizer": {
    "@type": "Person",
    "name": "Jürgen Blümlein"
  },

  "performer": {
    "@type": "Person",
    "@id": "https://bernardbolter.com/bio#person",
    "name": "Bernard Bolter",
    "url": "https://bernardbolter.com"
  },

  "about": [
    { "@type": "Thing", "name": "Overview Effect" },
    { "@type": "Thing", "name": "urban settlement" },
    { "@type": "Thing", "name": "skateboarding culture" },
    { "@type": "Thing", "name": "satellite collage" },
    { "@type": "Thing", "name": "city as terrain" }
  ],

  "workFeatured": [
    {
      "@type": "VisualArtwork",
      "@id": "https://bernardbolter.com/deutsche-stadt",
      "name": "Deutsche Stadt",
      "creator": {
        "@type": "Person",
        "@id": "https://bernardbolter.com/bio#person"
      }
    },
    {
      "@type": "VisualArtwork",
      "@id": "https://bernardbolter.com/america-city",
      "name": "America City",
      "creator": {
        "@type": "Person",
        "@id": "https://bernardbolter.com/bio#person"
      }
    },
    {
      "@type": "VisualArtwork",
      "@id": "https://bernardbolter.com/skate-city",
      "name": "Skate City",
      "creator": {
        "@type": "Person",
        "@id": "https://bernardbolter.com/bio#person"
      }
    }
  ],

  "image": [
    "https://pub-6a869efbfec4404396a52a3b7056bfc7.r2.dev/berlin_exhibit_4.jpg",
    "https://pub-6a869efbfec4404396a52a3b7056bfc7.r2.dev/berlin_exhibit_3.jpg",
    "https://pub-6a869efbfec4404396a52a3b7056bfc7.r2.dev/berlin_exhibit_2.jpg",
    "https://pub-6a869efbfec4404396a52a3b7056bfc7.r2.dev/berlin_exhibit.jpg"
  ],

  "url": "https://bernardbolter.com/events/megacities-2020",

  "sameAs": [
    "http://circylar.com/megacities-satellite-collages-by-bernard-john-bolter-iv/"
  ],

  "keywords": "Overview Effect, urban settlement, skateboarding culture, satellite collage, city as terrain, seamless composite, large-format print, wheatpaste installation"
}
```

### 4.2 Field mapping rules (for generalising across all event records)

| JSON-LD field | Source field | Notes |
|---|---|---|
| `@id` | `slug` | `https://bernardbolter.com/events/{slug}` |
| `name` | `title` | |
| `description` | `descriptionLong` | Strip richtext to plain text |
| `startDate` | `startDate` | ISO date only — strip time (`2020-11-26`, not full ISO timestamp) |
| `endDate` | `endDate` | Same; omit if null |
| `location.name` | `venueName` | |
| `location.address.streetAddress` | `venueAddress` | First line only if multiline |
| `location.address.addressLocality` | `venueCity` | |
| `location.address.addressCountry` | `venueCountry` → ISO 3166-1 alpha-2 | `Germany` → `DE`, `United States` → `US`, etc. |
| `location.geo.latitude` | `venueLatLng.lat` | Omit `geo` block if null |
| `location.geo.longitude` | `venueLatLng.lng` | |
| `location.url` | `venueUrl` | |
| `organizer.name` | `organiser` | Omit block if null |
| `performer.@id` | Always `https://bernardbolter.com/bio#person` | |
| `about[]` | `conceptualKeywords[]` | Map each `keyword` to a `Thing` with `name` |
| `workFeatured[]` | `artworks[]` | Each artwork → VisualArtwork with `@id` = `https://bernardbolter.com/{artwork.slug}` |
| `image[]` | `installationImages[].image.url` | Array of raw image URLs |
| `sameAs[]` | `sameAs[].uri` + `jsonldSameAs[].uri` | Merge both arrays, deduplicate |
| `keywords` | `conceptualKeywords[]` joined | Comma-separated string |
| `eventStatus` | Always `EventScheduled` for now | Future: add cancelled/postponed logic |
| `eventAttendanceMode` | `isOnline` → `OnlineEventAttendanceMode` or `OfflineEventAttendanceMode` | |

### 4.3 `performer` vs `organizer`

- `performer` = the artist (Bernard) — always present, always points to `https://bernardbolter.com/bio#person`
- `organizer` = from `organiser` field — present only when filled; use `Person` type
- If `curator` is filled and different from `organiser`, add a second `contributor` block with `@type: Person, name: [curator name]`

### 4.4 `@type` variations by `eventType`

| `eventType` | schema.org `@type` |
|---|---|
| `solo-exhibition`, `group-exhibition`, `art-fair` | `ExhibitionEvent` |
| `performance` | `PerformanceEvent` (or `TheaterEvent` if applicable) |
| `talk-panel`, `screening` | `Event` |
| `education` | `EducationEvent` |
| `award`, `publication`, `bibliography`, `residency` | `Event` |
| `other` | `Event` |

### 4.5 What NOT to do

- ✗ Do not include `awardAmount` or any private fields in JSON-LD
- ✗ Do not include `artistNote` or `practiceArcNote` in JSON-LD — these are internal artist notes, not public description
- ✗ Do not include `descriptionShort` in JSON-LD — use `descriptionLong` for `description`
- ✗ Do not hardcode the Megacities data — build the JSON-LD generically from field values
- ✗ Do not add `geo` block if `venueLatLng.lat` is null
- ✗ Do not add `organizer` block if `organiser` field is null
- ✗ Do not add `workFeatured` if `artworks[]` is empty

---

## Part 5 — Files to modify

| File | Change |
|---|---|
| `src/app/(site)/events/[slug]/page.tsx` (or equivalent) | Reorder sections per Part 1, add JSON-LD script tag per Part 4 |
| Installation images component | Switch to masonry + lightbox per Part 2 |
| Artworks shown section | Replace current render with existing artwork card component per Part 3 |

---

## Part 6 — Verification checklist

- [ ] Section order matches Part 1: installation photos → description → artworks → context → footer
- [ ] `descriptionShort` is not rendered anywhere
- [ ] `artistNote` renders as styled italic blockquote below `descriptionLong`, only when filled
- [ ] Installation images render in masonry, natural proportions, no crop, no fixed height
- [ ] Clicking an installation photo opens lightbox with full-size image and caption
- [ ] Artworks shown grid uses the real size-scaling artwork card component from the homepage grid
- [ ] `artworkPresentationNote` appears above the artworks grid when filled
- [ ] JSON-LD `<script>` tag present in `<head>` with correct `@type: ExhibitionEvent`
- [ ] JSON-LD `@id` uses the canonical URL with slug
- [ ] `performer` references `https://bernardbolter.com/bio#person`
- [ ] `workFeatured` includes all three artworks with their slugs as `@id`
- [ ] `sameAs` includes the Circylar URL
- [ ] `about` includes the conceptualKeywords as Thing objects
- [ ] `geo` block present with Circylar Gallery coordinates
- [ ] `startDate` and `endDate` are date-only strings, not ISO timestamps
- [ ] No phantom nav/header fix code added for the browser extension issue

---

*June 2026 · Layout redesign + JSON-LD for /events/[slug]*
*Read alongside: event-page-fixes-brief.md, design-system.md, artwork-page-directive.md*
