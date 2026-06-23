# CV Page — Full Spec
## Visual design, print stylesheet, and JSON-LD
*June 2026 · Supersedes cv-page-redesign-spec.md*

Read alongside: `design-system.md`, `events-intake-spec.md`, `artist-archive-schema-final.md`

---

## Part 1 — Data & query

### 1.1 Query

```
GET events
WHERE status = 'published' AND excludeFromCv = false
GROUP BY cvSection
SORT (within group) yearStart DESC, cvPriority ASC
```

### 1.2 Section order

```
education → solo-exhibitions → group-exhibitions → art-fairs → awards-prizes →
residencies → public-commissions → publications → bibliography →
selected-collections → talks-panels → screenings → performances → other
```

### 1.3 `selected-collections`

Sourced from the Artist singleton, not Events. Rendered in the same position above, same row style, but no year column and no arrow (no `hasPage` concept for this section).

### 1.4 Empty sections

If a `cvSection` has zero matching published non-excluded entries, render nothing — no header, no placeholder.

---

## Part 2 — Polymorphic row renderer

One row component switching on `cvSection`. Surrounding row chrome (year column, arrow, hover) is shared.

| `cvSection` | Row content |
|---|---|
| `education` | `Degree, Subject — Institution, City` · year column: `YEAR–YEAR` or `YEAR–ongoing` |
| `solo-exhibitions`, `group-exhibitions`, `art-fairs`, `talks-panels`, `screenings`, `performances`, `residencies`, `public-commissions` | `Title — Venue, City` |
| `publications` | `'Article Title' in Publication Name` |
| `bibliography` | `Author, 'Title', Publication Name` |
| `awards-prizes` | `Award Name, Organisation` + outcome in muted text if not winner |
| `selected-collections` | `Institution Name, City` — no year, no arrow |
| `other` | `Title — Venue, City` (fallback) |

### 2.1 Publications bug fix

The current page renders "2013 Digital City Series - the book Digital City Series - the book" — title is repeating. The `publications` row renderer is incorrectly concatenating `title` and another field that contains the same value. Fix by rendering only `title` (or `publicationTitle` if that field exists) — do not concatenate duplicate content.

---

## Part 3 — Visual design

### 3.1 Section headers

- Font: **Staatliches**, ~28–32px, `letter-spacing: 0.04em`
- `border-top: 1px solid` using the site's low-opacity line token (`--color-border-tertiary` or equivalent)
- Generous top margin above the border (~2.5rem), small gap between border and header text
- This replaces the current plain bold treatment

### 3.2 Year column

- Fixed-width left column, right-aligned, ~56px wide
- Font: **Barlow Condensed**, weight 700, ~14px
- Color: `--color-text-primary` (dark, strong)
- Education rows: `YEAR–YEAR` or `YEAR–ongoing` (monospace-style rendering already working for SFMOMA entry — apply same treatment)

### 3.3 Title

- Font: **Barlow Condensed**, weight 700, ~15px
- `hasPage: false` → `--color-text-primary`, no underline, no cursor change
- `hasPage: true` → link-blue color, `cursor: pointer`; wraps in `<a href="/events/[slug]">`

### 3.4 Venue / city

- Inline after the title, small left margin
- Font: Barlow or Barlow Condensed, regular weight, ~13px
- Color: `--color-text-tertiary` (muted) — quietest element in the row

### 3.5 Arrow icon

- Render `ti-arrow-up-right` **only when `hasPage === true`**
- Size: ~13px, color: muted grey (not link-blue)
- Positioned immediately after title text, before venue/city
- `selected-collections` rows: never show arrow

### 3.6 Layout

- CSS grid: fixed year-column + flexible content column, consistent row gap
- No card/box chrome — sections separated by the header rule only
- Background: site base `#FDFEFF`

---

## Part 4 — Print stylesheet

### 4.1 Print-only name header

Add a block to the CV page markup that is **hidden in normal view** and **visible only in print**:

```tsx
{/* Print-only header — hidden on screen, renders at top of printed CV */}
<div className="cv-print-header">
  <div className="cv-print-name">Bernard Bolter</div>
  <div className="cv-print-meta">b. San Francisco, 1974</div>
  <div className="cv-print-meta">Lives and works Berlin and San Francisco</div>
</div>
```

```css
.cv-print-header {
  display: none;
}

@media print {
  .cv-print-header {
    display: block;
    margin-bottom: 2rem;
  }
  .cv-print-name {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 18pt;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    color: #000;
  }
  .cv-print-meta {
    font-size: 9pt;
    color: #000;
    margin-top: 2pt;
  }
}
```

The name and bio lines should be sourced from the Artist singleton (`creator.name`, `creator.birthCity`, `creator.birthYear`, `creator.workCity1`, `creator.workCity2`) — not hardcoded — so they stay accurate if the singleton is updated.

### 4.2 Hide in print

```css
@media print {
  /* Site chrome */
  nav,
  header,
  .site-header,
  .hamburger,
  .floating-icons,
  .print-cv-button,
  .cv-close-button,

  /* Any element with these roles */
  [data-print-hide],
  button { display: none !important; }
}
```

### 4.3 Strip from content

```css
@media print {
  /* Remove link-blue from linked titles */
  .cv-row a,
  .cv-row a:visited {
    color: #000 !important;
    text-decoration: none !important;
  }

  /* Hide arrow icons */
  .ti-arrow-up-right {
    display: none !important;
  }
}
```

### 4.4 Layout for print

```css
@media print {
  body {
    background: #fff;
    color: #000;
  }

  .cv-content {
    max-width: 100%;
    padding: 0;
    margin: 0;
  }

  /* Prevent rows splitting across page breaks */
  .cv-row {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  /* Prevent section header landing alone at bottom of page */
  .cv-section-header {
    page-break-after: avoid;
    break-after: avoid;
  }
}
```

### 4.5 Print button

Wire the existing "Print CV" button to `window.print()`. Confirm it has an `onClick` handler — if it's missing one, add:

```tsx
<button onClick={() => window.print()}>Print CV</button>
```

---

## Part 5 — JSON-LD

Add a `<script type="application/ld+json">` block to the CV page `<head>`. Build server-side from Payload data.

### 5.1 Full structure

```json
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Curriculum Vitae — Bernard Bolter",
  "url": "https://bernardbolter.com/cv",
  "about": {
    "@type": "Person",
    "@id": "https://bernardbolter.com/bio#person",
    "name": "Bernard John Bolter IV",

    "alumniOf": [
      {
        "@type": "EducationalOrganization",
        "name": "Gerrit Rietveld Akademie",
        "sameAs": "https://www.wikidata.org/entity/Q182210",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "Amsterdam",
          "addressCountry": "NL"
        }
      },
      {
        "@type": "EducationalOrganization",
        "name": "Hoge School voor de Kunsten",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "Utrecht",
          "addressCountry": "NL"
        }
      }
    ],

    "performerIn": [
      // For each event with hasPage: true — reference only
      { "@id": "https://bernardbolter.com/events/megacities-2020" },

      // For each event with hasPage: false — inline minimal object
      {
        "@type": "ExhibitionEvent",
        "name": "Herbstsalon, Komm ins Offene!",
        "startDate": "2023",
        "location": {
          "@type": "Place",
          "name": "Pallaseum",
          "address": {
            "@type": "PostalAddress",
            "addressLocality": "Berlin",
            "addressCountry": "DE"
          }
        }
      }
    ]
  }
}
```

### 5.2 `alumniOf` — build from education events

Query events where `cvSection === 'education'`. For each:

| JSON-LD field | Source |
|---|---|
| `name` | `venueName` (institution name) |
| `sameAs` | `venueWikidataUri` if present |
| `address.addressLocality` | `venueCity` |
| `address.addressCountry` | `venueCountry` → ISO 3166-1 alpha-2 |

### 5.3 `performerIn` — build from all CV-visible events

Query all events where `status === 'published'` AND `excludeFromCv === false`.

**Rule:**
- `hasPage === true` → `{ "@id": "https://bernardbolter.com/events/{slug}" }` only — the full JSON-LD lives on the event page itself
- `hasPage === false` → inline minimal `ExhibitionEvent` or `Event` object:

```ts
{
  "@type": eventTypeToSchemaType(event.eventType), // use mapping from event-page brief
  "name": event.cvDisplayTitle || event.title,
  "startDate": String(event.yearStart),
  "location": event.venueName ? {
    "@type": "Place",
    "name": event.venueName,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": event.venueCity,
      "addressCountry": countryToIso(event.venueCountry)
    }
  } : undefined
}
```

Omit education events from `performerIn` — they already appear in `alumniOf`.

### 5.4 What NOT to include in CV JSON-LD

- ✗ Do not re-declare the full `Person` entity here — the bio page owns that. This page references it via `@id`
- ✗ Do not include artworks — those belong on the artwork pages and the bio `Person` node
- ✗ Do not include private fields (`awardAmount`, `commissionBudget`, etc.)
- ✗ Do not include `selected-collections` (from Artist singleton) in `performerIn` — that's ownership/collection data, not event data

---

## Part 6 — What NOT to do

- ✗ Do not use one generic row template — `cvSection` drives the content format
- ✗ Do not render a header for an empty section
- ✗ Do not show the arrow on `hasPage: false` rows or `selected-collections` rows
- ✗ Do not let the Publications row render the title twice
- ✗ Do not build a sticky jump nav
- ✗ Do not hardcode the print header name — source from Artist singleton
- ✗ Do not let print output show nav, floating icons, print button, or arrow icons
- ✗ Do not re-declare the full `Person` schema.org entity on this page

---

## Part 7 — Files to create or modify

| File | Action |
|---|---|
| `src/app/(site)/cv/page.tsx` | Query + section grouping, JSON-LD script tag, print-only name header markup |
| `src/components/cv/CvSection.tsx` | Staatliches header with border-top rule |
| `src/components/cv/CvRow.tsx` | Polymorphic renderer per Part 2, Publications bug fix |
| Print stylesheet (global or CV-scoped) | Full `@media print` block per Part 4 |
| Print button component | Wire `onClick={() => window.print()}` |
| `src/utilities/buildCvJsonLd.ts` | Create — server-side JSON-LD builder per Part 5 |

---

## Part 8 — Verification checklist

- [ ] Section headers use Staatliches with top border rule
- [ ] Year column is right-aligned Barlow Condensed bold, fixed width
- [ ] Linked titles (hasPage: true) show arrow icon + link-blue; unlinked titles are plain dark text
- [ ] City/venue renders muted and smaller than title
- [ ] Publications row renders title only once
- [ ] Education rows show `YEAR–YEAR` format
- [ ] Empty sections produce no header
- [ ] Print: artist name + bio lines appear at top of printed output
- [ ] Print: nav, floating icons, print button, arrows all hidden
- [ ] Print: all titles render in black regardless of link state
- [ ] Print: no row splits across a page break
- [ ] Print button calls `window.print()`
- [ ] JSON-LD present in `<head>` as `WebPage` containing `Person` reference
- [ ] `alumniOf` contains both education institutions with Rietveld Wikidata URI
- [ ] `performerIn` references hasPage events by `@id` only
- [ ] `performerIn` inlines minimal objects for stub events
- [ ] Education events excluded from `performerIn`

---

*June 2026 · Supersedes cv-page-redesign-spec.md*
*Read alongside: design-system.md, events-intake-spec.md, event-page-layout-jsonld-brief.md*
