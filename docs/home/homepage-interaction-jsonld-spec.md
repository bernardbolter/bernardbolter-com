# Homepage — Interaction & JSON-LD Spec
## View persistence, drag surface, artwork JSON-LD addendum
*June 2026*

Read alongside: `artwork-page-directive.md`, `design-system.md`, `artism-vocabulary.md`

---

## Part 1 — View preference persistence

### 1.1 Behaviour

The timeline/grid toggle should persist across sessions. If a visitor switches to grid, returns tomorrow, they see grid. Default for new visitors: `timeline`.

### 1.2 Implementation

```ts
// src/hooks/useViewPreference.ts

const VIEW_KEY = 'bb-view-preference'

export function useViewPreference() {
  const [view, setViewState] = useState<'timeline' | 'grid'>(() => {
    if (typeof window === 'undefined') return 'timeline'
    return (localStorage.getItem(VIEW_KEY) as 'timeline' | 'grid') ?? 'timeline'
  })

  const setView = (v: 'timeline' | 'grid') => {
    setViewState(v)
    localStorage.setItem(VIEW_KEY, v)
  }

  return [view, setView] as const
}
```

Replace the existing toggle state with this hook. No server-side changes needed — this is purely client state.

---

## Part 2 — Timeline drag surface

### 2.1 Current state

The only drag input is the thin scrubber bar at the bottom. The artwork canvas itself is not draggable.

### 2.2 Change

Make the **entire artwork canvas** a horizontal drag surface for timeline navigation. The bottom scrubber remains as a visual position indicator but is no longer the primary drag target.

### 2.3 Implementation

Add drag tracking to the main canvas container:

```ts
const isDragging = useRef(false)
const dragStartX = useRef(0)
const dragStartPosition = useRef(0) // timeline position at drag start

const onMouseDown = (e: React.MouseEvent) => {
  isDragging.current = true
  dragStartX.current = e.clientX
  dragStartPosition.current = currentTimelinePosition
}

const onMouseMove = (e: React.MouseEvent) => {
  if (!isDragging.current) return
  const delta = e.clientX - dragStartX.current
  // Map pixel delta to timeline position delta
  // Tune the sensitivity constant (e.g. 2px per year unit) against real data
  const newPosition = dragStartPosition.current - (delta * DRAG_SENSITIVITY)
  setTimelinePosition(clamp(newPosition, MIN_POSITION, MAX_POSITION))
}

const onMouseUp = () => { isDragging.current = false }
const onMouseLeave = () => { isDragging.current = false }

// Touch equivalents
const onTouchStart = (e: React.TouchEvent) => {
  isDragging.current = true
  dragStartX.current = e.touches[0].clientX
  dragStartPosition.current = currentTimelinePosition
}

const onTouchMove = (e: React.TouchEvent) => {
  if (!isDragging.current) return
  const delta = e.touches[0].clientX - dragStartX.current
  setTimelinePosition(clamp(
    dragStartPosition.current - (delta * DRAG_SENSITIVITY),
    MIN_POSITION, MAX_POSITION
  ))
}

const onTouchEnd = () => { isDragging.current = false }
```

Apply to the canvas container:

```tsx
<div
  className="timeline-canvas"
  style={{ cursor: isDragging.current ? 'grabbing' : 'grab' }}
  onMouseDown={onMouseDown}
  onMouseMove={onMouseMove}
  onMouseUp={onMouseUp}
  onMouseLeave={onMouseLeave}
  onTouchStart={onTouchStart}
  onTouchMove={onTouchMove}
  onTouchEnd={onTouchEnd}
>
  {artworks}
</div>
```

`DRAG_SENSITIVITY` is a tuning constant — start at `0.5` and adjust in browser against real archive data.

### 2.4 Non-draggable artworks

Individual artwork elements must suppress browser native image/element drag so they don't interfere with the canvas drag:

```tsx
// On each artwork element
<div
  draggable={false}
  onDragStart={e => e.preventDefault()}
  onClick={() => router.push(`/${artwork.slug}`)}
  style={{ cursor: 'pointer' }}
>
  <img draggable={false} ... />
</div>
```

`cursor: pointer` on click areas, `cursor: grab`/`grabbing` on the canvas level — these should not conflict because the canvas cursor takes precedence during drag.

### 2.5 Scroll wheel

Also add wheel scroll support on the canvas for desktop users who prefer scroll to drag:

```ts
const onWheel = (e: React.WheelEvent) => {
  e.preventDefault()
  setTimelinePosition(prev =>
    clamp(prev + (e.deltaX || e.deltaY) * SCROLL_SENSITIVITY, MIN_POSITION, MAX_POSITION)
  )
}
```

Attach with `{ passive: false }` to allow `preventDefault()`.

---

## Part 3 — Homepage JSON-LD

The homepage is the root node of the entire graph. It establishes site identity and points to the `Person` entity. It intentionally stays lean — it does not enumerate artworks (that's the sitemap and individual pages).

```json
{
  "@context": {
    "@vocab": "https://schema.org/",
    "artism": "https://artism.org/schema/"
  },
  "@type": ["WebSite", "CollectionPage"],
  "@id": "https://bernardbolter.com",
  "name": "Bernard Bolter — Artist Archive",
  "alternateName": "bernardbolter.com",
  "url": "https://bernardbolter.com",
  "description": "The complete archive of Bernard Bolter's work — transfer paintings, satellite image collages, and thirty years of practice across Berlin and San Francisco.",
  "inLanguage": "en",

  "author": {
    "@type": "Person",
    "@id": "https://bernardbolter.com/bio#person",
    "name": "Bernard Bolter"
  },

  "about": {
    "@type": "Person",
    "@id": "https://bernardbolter.com/bio#person"
  },

  "hasPart": [
    { "@type": "WebPage", "name": "Bio", "url": "https://bernardbolter.com/bio" },
    { "@type": "WebPage", "name": "CV", "url": "https://bernardbolter.com/cv" },
    { "@type": "WebPage", "name": "Statement", "url": "https://bernardbolter.com/statement" },
    { "@type": "WebPage", "name": "Contact", "url": "https://bernardbolter.com/contact" }
  ],

  "artism:archiveVersion": "1.0",
  "artism:corpusEndpoint": "https://bernardbolter.com/api/corpus"
}
```

### 3.1 `artism:corpusEndpoint`

Declares the machine corpus export URL. Even if this endpoint doesn't exist yet, declaring it in the JSON-LD establishes the intent and gives AI systems a known URL to check. Build the actual endpoint later (see Part 5).

---

## Part 4 — Artwork page JSON-LD: complete field mapping

This addendum supersedes the JSON-LD section in `artwork-page-directive.md` verification checklist. It specifies every field from the actual Payload data and how it maps.

### 4.1 Standard schema.org fields

| JSON-LD field | Payload source | Notes |
|---|---|---|
| `@type` | Always `VisualArtwork` | |
| `@id` | `slug` | `https://bernardbolter.com/{slug}` |
| `name` | `title` | |
| `alternateName` | `altTitle` | Omit if null |
| `description` | `descriptionLong` (plain text) | Strip richtext; fallback to `descriptionShort` |
| `dateCreated` | `yearCreated` | String, e.g. `"2020"` |
| `artMedium` | `medium` + `mediumOther` | Human-readable string |
| `width` | `widthWhole` + `dimensionUnit` | `{ "@type": "QuantitativeValue", "value": 140, "unitCode": "CMT" }` |
| `height` | `heightWhole` + `dimensionUnit` | Same shape |
| `creator` | Always `{ "@id": "https://bernardbolter.com/bio#person" }` | Reference, not inline |
| `isPartOf` | `series.name` | `{ "@type": "CreativeWorkSeries", "name": "Megacities", "url": "https://bernardbolter.com/series/megacities" }` |
| `locationCreated` | `locationCreated.city` + `country` | `{ "@type": "Place", "name": "Berlin", "address": { "addressCountry": "DE" } }` |
| `keywords` | `conceptualKeywords[]` joined | Comma-separated |
| `genre` | `genreTags[].label` joined | |
| `about` | `subjectTags[]` | `[{ "@type": "Thing", "name": "Urban landscape" }, ...]` |
| `image` | `primaryImage.url` | Full R2 URL |
| `url` | `slug` | Canonical page URL |
| `sameAs` | `sameAsUrls[]` | Array of strings |
| `subjectOf` | `events[]` with `hasPage: true` | `[{ "@id": "https://bernardbolter.com/events/{slug}" }]` |
| `license` | `license` | If present |
| `creditText` | `creditText` | If present |

### 4.2 `artism:` namespace fields — all non-empty enrichment fields

```json
"additionalProperty": [
  {
    "@type": "PropertyValue",
    "propertyID": "artism:intent",
    "name": "Intent",
    "value": "[intent field value]"
  },
  {
    "@type": "PropertyValue",
    "propertyID": "artism:formalContributionAssessment",
    "name": "Formal Contribution Assessment",
    "value": "[formalContributionAssessment value]"
  },
  {
    "@type": "PropertyValue",
    "propertyID": "artism:consciousRejections",
    "name": "Conscious Rejections",
    "value": "[consciousRejections value]"
  },
  {
    "@type": "PropertyValue",
    "propertyID": "artism:encounterNote",
    "name": "Encounter Note",
    "value": "[encounterNote value]"
  },
  {
    "@type": "PropertyValue",
    "propertyID": "artism:intentVsOutcome",
    "name": "Intent vs Outcome",
    "value": "[intentVsOutcome value]"
  },
  {
    "@type": "PropertyValue",
    "propertyID": "artism:makingNote",
    "name": "Making Note",
    "value": "[makingNote value]"
  },
  {
    "@type": "PropertyValue",
    "propertyID": "artism:directInspiration",
    "name": "Direct Inspiration",
    "value": "[directInspiration value]"
  },
  {
    "@type": "PropertyValue",
    "propertyID": "artism:workContext",
    "name": "Work Context",
    "value": "[workContext value]"
  },
  {
    "@type": "PropertyValue",
    "propertyID": "artism:seriesContext",
    "name": "Series Context",
    "value": "[seriesContext value]"
  },
  {
    "@type": "PropertyValue",
    "propertyID": "artism:artHistoricalContext",
    "name": "Art Historical Context",
    "value": "[artHistoricalContext value]"
  },
  {
    "@type": "PropertyValue",
    "propertyID": "artism:compositionalNotes",
    "name": "Compositional Notes",
    "value": "[compositionalNotes value]"
  },
  {
    "@type": "PropertyValue",
    "propertyID": "artism:dominantColors",
    "name": "Dominant Colors",
    "value": "#6b6b5a, #4a5a3a, #8a8a7a"
  },
  {
    "@type": "PropertyValue",
    "propertyID": "artism:sizeTier",
    "name": "Size Tier",
    "value": "xl"
  },
  {
    "@type": "PropertyValue",
    "propertyID": "artism:orientation",
    "name": "Orientation",
    "value": "portrait"
  },
  {
    "@type": "PropertyValue",
    "propertyID": "artism:catalogueNumber",
    "name": "Catalogue Number",
    "value": "BB-MEG-2020-002"
  },
  {
    "@type": "PropertyValue",
    "propertyID": "artism:reasoningStatus",
    "name": "Reasoning Status",
    "value": "complete"
  },
  {
    "@type": "PropertyValue",
    "propertyID": "artism:clipEmbeddingEndpoint",
    "name": "CLIP Embedding Endpoint",
    "value": "https://bernardbolter.com/deutsche-stadt/embedding"
  }
]
```

### 4.3 Fields deliberately excluded from JSON-LD

| Field | Reason |
|---|---|
| `clipEmbedding` (768 floats) | Too large; exposed via `/[slug]/embedding` instead |
| `askingPrice`, `salesRecord`, `totalRevenue` | Private commercial data |
| `awardAmount` | Private |
| `ownershipHistory` private entries | Private |
| `provenanceConfidenceLayer` raw array | Private |
| `processNotes` (agent-authored, unreviewed) | Not artist-confirmed |
| All `dcs.*` sub-fields beyond catalogue number | Series-specific internal data, not standard |
| All `ach.*` sub-fields | Same |
| `fieldConfidenceMap` | Internal pipeline metadata |

### 4.4 `buildArtworkJsonLd()` utility

```ts
// src/utilities/buildArtworkJsonLd.ts

export function buildArtworkJsonLd(artwork: ArtworkRecord) {
  const additionalProperty = []

  // Helper: add only if non-null/non-empty
  const addProp = (id: string, name: string, value: any) => {
    if (!value) return
    const v = typeof value === 'object' ? JSON.stringify(value) : String(value)
    if (v.trim() === '' || v === 'null') return
    additionalProperty.push({ '@type': 'PropertyValue', propertyID: id, name, value: v })
  }

  addProp('artism:intent', 'Intent', artwork.intent)
  addProp('artism:formalContributionAssessment', 'Formal Contribution Assessment', artwork.formalContributionAssessment)
  addProp('artism:consciousRejections', 'Conscious Rejections', artwork.consciousRejections)
  addProp('artism:encounterNote', 'Encounter Note', artwork.encounterNote)
  addProp('artism:intentVsOutcome', 'Intent vs Outcome', artwork.intentVsOutcome)
  addProp('artism:makingNote', 'Making Note', artwork.makingNote)
  addProp('artism:directInspiration', 'Direct Inspiration', artwork.directInspiration)
  addProp('artism:workContext', 'Work Context', artwork.workContext)
  addProp('artism:seriesContext', 'Series Context', artwork.seriesContext)
  addProp('artism:artHistoricalContext', 'Art Historical Context', artwork.artHistoricalContext)
  addProp('artism:compositionalNotes', 'Compositional Notes', artwork.compositionalNotes)
  addProp('artism:sizeTier', 'Size Tier', artwork.sizeTier)
  addProp('artism:orientation', 'Orientation', artwork.orientation)
  addProp('artism:catalogueNumber', 'Catalogue Number', artwork.catalogueNumber)
  addProp('artism:reasoningStatus', 'Reasoning Status', artwork.reasoningStatus)

  if (artwork.dominantColors?.length) {
    addProp('artism:dominantColors', 'Dominant Colors',
      artwork.dominantColors.map(c => c.hex).join(', '))
  }

  if (artwork.clipEmbedding) {
    addProp('artism:clipEmbeddingEndpoint', 'CLIP Embedding Endpoint',
      `https://bernardbolter.com/${artwork.slug}/embedding`)
  }

  // Strip richtext to plain text
  const description = richtextToPlainText(artwork.descriptionLong)
    || artwork.descriptionShort
    || undefined

  return {
    '@context': {
      '@vocab': 'https://schema.org/',
      'artism': 'https://artism.org/schema/'
    },
    '@type': 'VisualArtwork',
    '@id': `https://bernardbolter.com/${artwork.slug}`,
    'name': artwork.title,
    ...(artwork.altTitle && { 'alternateName': artwork.altTitle }),
    ...(description && { 'description': description }),
    'dateCreated': String(artwork.yearCreated),
    ...(artwork.medium && { 'artMedium': artwork.medium }),
    ...(artwork.widthWhole && {
      'width': { '@type': 'QuantitativeValue', 'value': artwork.widthWhole, 'unitCode': 'CMT' }
    }),
    ...(artwork.heightWhole && {
      'height': { '@type': 'QuantitativeValue', 'value': artwork.heightWhole, 'unitCode': 'CMT' }
    }),
    'creator': { '@id': 'https://bernardbolter.com/bio#person' },
    ...(artwork.series && {
      'isPartOf': {
        '@type': 'CreativeWorkSeries',
        'name': artwork.series.name,
        'url': `https://bernardbolter.com/series/${artwork.series.slug}`
      }
    }),
    ...(artwork.locationCreated?.city && {
      'locationCreated': {
        '@type': 'Place',
        'name': artwork.locationCreated.city,
        'address': {
          '@type': 'PostalAddress',
          'addressLocality': artwork.locationCreated.city,
          'addressCountry': countryToIso(artwork.locationCreated.country)
        }
      }
    }),
    ...(artwork.conceptualKeywords?.length && {
      'keywords': artwork.conceptualKeywords.map(k => k.keyword).join(', ')
    }),
    ...(artwork.genreTags?.length && {
      'genre': artwork.genreTags.map(t => t.label).join(', ')
    }),
    ...(artwork.subjectTags?.length && {
      'about': artwork.subjectTags.map(t => ({ '@type': 'Thing', 'name': t.label }))
    }),
    'image': artwork.primaryImage?.url,
    'url': `https://bernardbolter.com/${artwork.slug}`,
    ...(artwork.sameAsUrls?.length && { 'sameAs': artwork.sameAsUrls }),
    ...(artwork.events?.docs?.length && {
      'subjectOf': artwork.events.docs
        .filter(e => typeof e === 'object' && e.hasPage)
        .map(e => ({ '@id': `https://bernardbolter.com/events/${e.slug}` }))
    }),
    ...(additionalProperty.length && { additionalProperty })
  }
}
```

---

## Part 5 — Corpus export endpoint (build later, declare now)

Add to the homepage JSON-LD now: `"artism:corpusEndpoint": "https://bernardbolter.com/api/corpus"`

Build later:

```
GET /api/corpus
→ Returns { "@context": ..., "@graph": [ ...all published artworks as VisualArtwork JSON-LD... ] }
```

This is the endpoint that makes the entire archive available in one request for corpus-level reasoning. Not built in this spec pass — but declare the URL now so it's findable.

---

## Part 6 — What NOT to do

- ✗ Do not include `clipEmbedding` float array in JSON-LD
- ✗ Do not include private commercial fields
- ✗ Do not hardcode any content in JSON-LD — all values from Payload
- ✗ Do not re-declare the `Person` entity on the homepage — reference via `@id` only
- ✗ Do not add drag handlers to individual artwork elements — they go on the canvas container
- ✗ Do not use `localStorage` on the server — guard with `typeof window === 'undefined'`

---

## Part 7 — Files to create or modify

| File | Action |
|---|---|
| `src/hooks/useViewPreference.ts` | Create — localStorage persistence hook |
| Homepage component | Wire `useViewPreference` to toggle; add canvas drag handlers |
| Individual artwork elements | Add `draggable={false}` + `onDragStart` suppress |
| `src/app/(public)/page.tsx` | Add homepage JSON-LD `<script>` tag |
| `src/utilities/buildArtworkJsonLd.ts` | Create — full artwork JSON-LD builder |
| `src/app/(public)/[slug]/page.tsx` | Replace existing JSON-LD with `buildArtworkJsonLd()` output |

---

## Part 8 — Verification checklist

- [ ] Grid/timeline toggle persists across page reloads and new sessions
- [ ] Default for new visitors is timeline view
- [ ] Dragging horizontally on the artwork canvas scrolls the timeline
- [ ] Touch drag works on mobile
- [ ] Scroll wheel moves the timeline on desktop
- [ ] Artwork images do not trigger browser native drag
- [ ] Clicking an artwork navigates to its page (not absorbed by drag handler)
- [ ] Canvas shows `grab` cursor normally and `grabbing` during drag
- [ ] Homepage `<head>` contains JSON-LD with `WebSite` + `CollectionPage` types
- [ ] Homepage JSON-LD references `bio#person` via `@id`, does not redeclare Person
- [ ] `artism:corpusEndpoint` present in homepage JSON-LD
- [ ] Artwork page JSON-LD built by `buildArtworkJsonLd()` utility
- [ ] `additionalProperty` array present for all non-empty `artism:` fields
- [ ] `clipEmbedding` floats NOT in JSON-LD; `/[slug]/embedding` endpoint present
- [ ] `dominantColors` present as comma-separated hex string
- [ ] `subjectOf` references event pages by `@id` only

---

*June 2026 · Read alongside: artwork-page-directive.md, artism-vocabulary.md, design-system.md*
