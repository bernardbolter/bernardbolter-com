# Artwork Page Directive
## bernardbolter.com · Single Artwork Page · Cursor Implementation Spec
*June 2026 · Bernard Bolter × Claude*

---

## Read first

Before writing any code, read:
- `artist-archive-schema-final.md` — all field definitions and types
- `design-system.md` — typography, spacing, colour tokens, z-index layers
- `art-official-handoff.md` — field philosophy and what Art/Official produces
- `system-philosophy-and-art-history.md` — the north star; informs what this page is for

---

## Overview

This is the single artwork page. It lives at `bernardbolter.com/[slug]` — no `/artworks/` prefix. It is the primary content unit of the entire archive.

The page has two simultaneous audiences:

**Human visitors** — a five-layer scrolling experience that moves from pure image through increasing depth of context and record.

**Machines** — a `<head>` containing a programmatically generated JSON-LD block using the `schema.org/VisualArtwork` type extended with `artism:` namespace terms. Every field with semantic value contributes to this output. The page is also the anchor point for the `/[slug]/embedding` route which exposes the CLIP vector for AI corpus traversal.

Both audiences matter equally. The human experience must not degrade the machine-readable output, and the machine-readable output must not deform the human experience.

---

## File structure

```
src/app/(public)/[slug]/
  page.tsx                        ← main page component; fetches artwork, renders all layers
  not-found.tsx                   ← 404 for unknown slugs
  embedding/
    route.ts                      ← GET /[slug]/embedding → JSON CLIP vector response

src/components/artwork/
  ArtworkPage.tsx                 ← top-level layout, receives full artwork object
  Layer0Image.tsx                 ← image/video display with size-tier logic
  SeriesCard.tsx                  ← series navigation card (sits between L0 and L1)
  Layer1ObjectRecord.tsx          ← clean catalogue entry
  Layer2WorldPresence.tsx         ← availability, editions, media, location, links
  Layer3ArtistAccount.tsx         ← intent fields, classification, art historical refs, similar works
  Layer4History.tsx               ← exhibition history, provenance record
  ClipEmbeddingNote.tsx           ← small machine-readability note with link
  ReasoningStatusBadge.tsx        ← quiet status indicator

src/utilities/
  generateArtworkJsonLd.ts        ← programmatic JSON-LD; takes full artwork + artist objects
  artworkSizeDisplay.ts           ← size-tier + orientation display logic (reusable)
```

---

## Route

**URL pattern:** `bernardbolter.com/[slug]`

- `slug` is the artwork's `slug` field — auto-generated, unique, never changes after first publication
- No `/artworks/` prefix at any point
- `not-found.tsx` handles unknown slugs gracefully
- Page is statically generated at build time via `generateStaticParams`; revalidates on Payload `afterChange` hook

---

## Data fetching

Fetch the full artwork record server-side in `page.tsx`. Include all relations: `series` (with `topLevelSeries`), `events` (with date, venue, type), `artHistoricalReferences`, all tag arrays, and the artist singleton. Exclude all private fields via Payload access control — this is enforced at the collection level and must not be bypassed.

The artist singleton is fetched once and passed down — do not fetch it independently per component.

---

## JSON-LD — `generateArtworkJsonLd.ts`

Generated programmatically. Never hardcoded. Injected via Next.js `generateMetadata` into `<head>` as a `<script type="application/ld+json">` block.

### Context declaration

```json
{
  "@context": {
    "@vocab": "https://schema.org/",
    "artism": "https://artism.org/schema/"
  }
}
```

The `artism:` namespace covers all intent, process, and assessment fields that have no schema.org equivalent. See `artism-vocabulary.md` for full term definitions.

### Full output shape

```json
{
  "@context": {
    "@vocab": "https://schema.org/",
    "artism": "https://artism.org/schema/"
  },
  "@type": "VisualArtwork",
  "name": "[title]",
  "alternateName": "[altTitle — if present]",
  "identifier": {
    "@type": "PropertyValue",
    "propertyID": "CatalogueNumber",
    "value": "[catalogueNumber]"
  },
  "url": "https://bernardbolter.com/[slug]",
  "sameAs": ["[all sameAs URIs from artwork.sameAs array]"],
  "inLanguage": "en",
  "creator": {
    "@type": "Person",
    "name": "Bernard Bolter",
    "identifier": [
      { "@type": "PropertyValue", "propertyID": "ULAN", "value": "[artist.ulanUri]" },
      { "@type": "PropertyValue", "propertyID": "Wikidata", "value": "[artist.wikidataUri]" }
    ]
  },
  "dateCreated": "[yearCreated]",
  "dateModified": "[yearCompleted — if different from yearCreated]",
  "artMedium": "[medium resolved label — as DefinedTerm if tag has aatUri]",
  "artworkSurface": "[support]",
  "artform": "[genreTags resolved labels]",
  "material": ["[material array derived from medium + support]"],
  "width": { "@type": "QuantitativeValue", "value": "[widthCm]", "unitCode": "CMT", "unitText": "cm" },
  "height": { "@type": "QuantitativeValue", "value": "[heightCm]", "unitCode": "CMT", "unitText": "cm" },
  "depth": { "@type": "QuantitativeValue", "value": "[depthCm]", "unitCode": "CMT", "unitText": "cm" },
  "locationCreated": {
    "@type": "Place",
    "name": "[city]",
    "address": { "@type": "PostalAddress", "addressLocality": "[city]", "addressCountry": "[countryCode]" },
    "sameAs": "[cityTgnUri]"
  },
  "isPartOf": {
    "@type": "Collection",
    "name": "[series.name]",
    "url": "https://bernardbolter.com/series/[series.slug]"
  },
  "keywords": ["[conceptualKeywords array]"],
  "about": ["[subjectTags labels]"],
  "mentions": ["[artHistoricalReferences — each as VisualArtwork or Person]"],
  "description": "[descriptionShort]",
  "image": {
    "@type": "ImageObject",
    "url": "[primaryImage.url]",
    "width": "[primaryImage.width]",
    "height": "[primaryImage.height]"
  },
  "copyrightHolder": { "@type": "Person", "name": "Bernard Bolter" },
  "copyrightYear": "[yearCreated]",
  "license": "[license URI from artwork.license]",
  "creditText": "[creditText]",
  "artism:intent": "[intent]",
  "artism:makingNote": "[makingNote]",
  "artism:directInspiration": "[directInspiration]",
  "artism:encounterNote": "[encounterNote]",
  "artism:workContext": "[workContext]",
  "artism:intentVsOutcome": "[intentVsOutcome]",
  "artism:consciousRejections": "[consciousRejections]",
  "artism:formalContributionAssessment": "[formalContributionAssessment]",
  "artism:seriesContext": "[seriesContext]",
  "artism:artHistoricalContext": "[artHistoricalContext]",
  "artism:processNotes": "[processNotes]",
  "artism:materialAndProcessMeaning": "[materialAndProcessMeaning]",
  "artism:sourceMaterials": "[sourceMaterials]",
  "artism:reasoningStatus": "[reasoningStatus — stub | partial | complete]",
  "artism:clipEmbeddingEndpoint": "https://bernardbolter.com/[slug]/embedding",
  "artism:dominantColours": ["[dominantColours hex array]"],
  "artism:provenanceConfidenceLevel": "[derived public summary — documented | partial | undocumented]",
  "artism:workState": "[workState]"
}
```

### JSON-LD constraints — do NOT violate

- `creator` must be a typed `Person` object with ULAN and Wikidata identifier URIs — never a plain name string
- `width` / `height` / `depth` must be `QuantitativeValue` objects with `unitCode` — never plain strings or `"120 × 90 cm"`
- `locationCreated` must be a typed `Place` object with TGN `sameAs` — never a plain string
- `artMedium` where tag has `aatUri`: output as `{ "@type": "DefinedTerm", "name": "...", "inDefinedTermSet": "http://vocab.getty.edu/aat/", "termCode": "..." }`
- All `artism:` fields must be omitted (not null, not empty string — omitted entirely) when the field is empty on the record
- `sameAs` must be a JSON array even when only one URI exists
- Never output private fields: `askingPrice`, `salesRecord`, `ownershipHistory`, `loanHistory`, `provenanceConfidenceLayer` raw data
- `artism:provenanceConfidenceLevel` is a derived summary string, not the raw `provenanceConfidenceLayer` array

---

## `/[slug]/embedding` route

**File:** `src/app/(public)/[slug]/embedding/route.ts`

**Method:** `GET`

**Returns:**

```json
{
  "artwork": "https://bernardbolter.com/[slug]",
  "sameAs": ["[artwork.sameAs URIs]"],
  "model": "openai/clip-vit-large-patch14",
  "dimensions": 1536,
  "embedding": [0.023, -0.441, ...]
}
```

**Rules:**
- Returns `404` if artwork does not exist or is not published
- Returns `503` with `{ "status": "pending", "message": "Embedding not yet generated" }` if `clipEmbedding` is null
- `model` field is always declared — never omit it. This allows external systems to correctly interpret the vector space
- `sameAs` is included so external systems can anchor this embedding to the entity without a separate lookup
- Response includes `Content-Type: application/json` and `Cache-Control: public, max-age=86400`

---

## Layer 0 — Image / media

**Component:** `Layer0Image.tsx`

Full-viewport image display. This is the old `ArtworkImage.tsx` logic ported to Tailwind. The size-tier and orientation display logic is the single most important visual constraint on the entire site — preserve it exactly.

### Size-tier display logic

Port from `useArtworkDimensions` hook. Logic must live in `artworkSizeDisplay.ts` as a reusable utility — not inline in this component, not duplicated in grid or timeline views.

- `sizeTier` and `orientation` both apply simultaneously — never one without the other
- Do NOT normalise to fill the viewport
- Do NOT use `object-cover` — use `object-contain`
- Landscape: constrain width
- Portrait: constrain height
- Square: middle ground between the two

### What is displayed

- Artwork image at correct size-tier dimensions, centred
- Series colour as background behind the image (from `series.colour` — not hardcoded)
- Multiple image slider if `alternateViewImages` or `detailImages` are present — timer + pause + counter as in old component
- Magnify mode on click: full-resolution image, draggable, mini-map when image exceeds viewport, same draggable logic as old component
- For `primaryMediaType: video`: video player at size-tier dimensions; poster image shown until play; documentation note if `documentationVideoUrl` is separate from the work itself
- For `primaryMediaType: image-and-video`: image is primary display; video accessible via toggle

### Wall label

Sits within the dark zone below the image, still within Layer 0's dark background:

- `h1`: artwork title
- `h2`: year (and year completed if different — "2018–2020")
- `h3`: medium resolved label (style if present, otherwise medium)
- Physical dimensions (from `ArtworkSize` component — port from old)

### Controls

- Close button (top left) — back to previous view or home
- Magnify toggle (top right)
- Image navigation (bottom right) — only if multiple images

### Do NOT

- Do not show any information below the wall label within Layer 0
- Do not add scroll indicators or down-arrows — the scroll invitation comes from the content stopping
- Do not modify the size-tier logic to make images fill more of the screen

---

## Series card — between Layer 0 and Layer 1

**Component:** `SeriesCard.tsx`

**Condition:** Render only if `artwork.series` is present (it always should be, but guard anyway).

**Always resolves to the top-level series.** If the artwork belongs to a sub-series (e.g. Gates of Perception inside A Colorful History), the card shows the top-level series name and links to the top-level series page. Sub-series detail belongs in Layer 3.

### Layout

```
[ colour swatch ]  Part of a series
                   [Series Name]                    ← 15px / 500
                   [series.description short]       ← 12px / secondary — one to two sentences max
                   [ AR pill — conditional ]
                   [ Go to [Series Name] → ]        ← CTA button
```

### Colour swatch

- 52×52px, `border-radius: var(--border-radius-md)`
- Background: `series.colour` token
- Text inside swatch: series name abbreviated to fit, white, small — purely decorative, not the primary name display

### AR pill

- Condition: render only if `artwork.arEnabled === true`
- Content: `◈ AR experience available on the series page`
- Styled as a small pill — `background: series.colour at 10% opacity`, `border: 0.5px solid series.colour at 30% opacity`, `color: series.colour dark variant`
- Purpose: signal that something richer exists; direct people to the series page to access it
- Do NOT link directly to the AR experience from here — it always routes through the series site

### CTA

- Text: `Go to [series.name] →`
- Links to `series.url` (the dedicated series site, not an internal series page)
- Opens in new tab

### Do NOT

- Do not show sub-series name in this card
- Do not attempt to explain what AR is in the pill — the wonder is the point
- Do not render this card if `artwork.series` is null

---

## Layer 1 — Object record

**Component:** `Layer1ObjectRecord.tsx`

The clean catalogue entry. Fast to read. No prose, no interpretation — just what the work is.

### Layout

Two-column grid of label / value rows. Each row: `border-bottom: 0.5px solid var(--color-border-tertiary)`. Last row no border.

Left column:
- Medium (resolved label)
- Support
- Dimensions (with cm/inches toggle — compute inches from stored mm values client-side)
- Scale (human-readable from `sizeTier`: sm → "Small", md → "Medium", lg → "Large", xl → "Large-scale")
- Framing (omit if `measurementType` includes only `digital`)

Right column:
- Year (and year completed if different)
- Series (colour pip + name — do NOT link here; the series card above is the navigation)
- Edition type
- Work state (value from `workState` — "Original", "Reworked", "Restored", "Damaged", "Lost")

### Do NOT

- Do not include any prose description here
- Do not include availability, price, or location in this layer — those belong in Layer 2
- Do not include tags — those belong in Layer 3
- Do not link to series from here — the series card handles navigation

---

## Layer 2 — World presence

**Component:** `Layer2WorldPresence.tsx`

Everything about the artwork's current relationship to the world — where it is, whether it can be acquired, what media exist about it. Present-tense and actionable.

Background: `var(--color-background-secondary)` to signal a different register from Layer 1.

### Availability block

Condition: always shown.

- Availability status as a coloured indicator: available (green), sold (muted), not-for-sale (muted), on-consignment (amber)
- If `availabilityStatus === 'available'`: show `askingPrice` + `listingCurrency`, EU shipping note, email CTA
- If `availabilityStatus === 'sold'`: show "This work has found a home" — no price, no CTA
- If `availabilityStatus === 'not-for-sale'`: show "Not available" — no price, no CTA
- If `availabilityStatus === 'on-consignment'`: show "Available via gallery" + `galleryReference` if public — email CTA

### Editions block

Condition: render only if `editions` array is non-empty.

- Section label: "Print editions"
- Grid of edition cards — one per entry in `editions` array
- Each card: `formatLabel`, dimensions, substrate, `pricePerPrint` + currency, `remaining` of `totalEditionSize`
- `editionNotes` as prose below the grid if present

### Documentation and media block

Condition: render only if any of the following are present: `documentationVideoUrl`, `arEnabled`, `installationShots`.

- Section label: "Documentation & media"
- `documentationVideoUrl` → video card with play icon and label "Documentation video"
- `arEnabled` → media card with AR icon and label "AR experience — available on the series page" (links to series site)
- `installationShots` → if present, a small row of installation shot thumbnails (these are distinct from the primary artwork images in Layer 0)

### Location block

Condition: render only if `currentLocation` has a public-displayable value.

- `currentLocation === "artist's studio"` → "Currently in artist's studio, Berlin"
- `currentLocation === "private collection"` → "Private collection"
- `currentLocation === "institution"` → institution name from `locationDetail`
- `currentLocation === "on loan"` → "Currently on loan"
- If `ownershipHistory` contains an entry with `claimStatus: 'unclaimed'` for the most recent transfer — show the unknown-owner appeal: "If you own this work, get in touch. I'll add you to the record and officially connect you to its history."

### External links block

Condition: render only if `sameAs` array is non-empty or `artist.otherLinks` contains relevant entries.

- Small pill-style links for each `sameAs` URI — label derived from domain (artsy.net → "Artsy", artnet.com → "Artnet", wikidata.org → "Wikidata")
- These are the same URIs that appear in the JSON-LD `sameAs` array — they are entity resolution anchors, not decorative buttons
- Open in new tab

### Do NOT

- Do not show private fields: `askingPrice` is conditionally public (shown when available) but `salesRecord`, `ownershipHistory` detail, `provenanceConfidenceLayer` raw data are never shown
- Do not show price when `availabilityStatus` is anything other than `available`
- Do not show the AR media card if `arEnabled` is false

---

## Layer 3 — Artist's account

**Component:** `Layer3ArtistAccount.tsx`

The interpretive and semantic layer. The most important layer for the corpus vision. Typography and breathing room matter here — this reads like an artist's notebook, not a database.

All fields in this layer are conditionally rendered — omit the entire field block if the field is empty. A partial record simply has fewer blocks. Do not show empty field labels.

### Formal contribution — top of Layer 3, typographically prominent

`formalContributionAssessment` sits at the very top of Layer 3, before any other field. It is the artist's account of what this work does that hasn't been done before. It receives the most visual weight of any text field in this layer.

- Label: "Contribution" — small, uppercase, tertiary colour
- Text: larger than the other intent fields — 15px vs 14px — same weight
- If empty: this entire block is omitted silently

Rationale: this field is the most direct answer to the north star question — what work being made now will matter in retrospect. It deserves prominence.

### Intent fields block

In this order, each conditionally rendered:

1. `descriptionShort` / `descriptionLong` — label: "About the work"
2. `intent` — label: "Intent"
3. `directInspiration` — label: "Direct inspiration"
4. `makingNote` — label: "Making"
5. `encounterNote` — label: "Context of making"
6. `intentVsOutcome` — label: "Where it went"
7. `workContext` — label: "In the practice"
8. `processNotes` — label: "Process" (agent-authored, artist-reviewed — render at slightly lower visual weight: `color: var(--color-text-secondary)`)
9. `materialAndProcessMeaning` — label: "Why these materials"
10. `consciousRejections` — label: "What this isn't"
11. `seriesContext` — label: "In the series"
12. `sourceMaterials` — label: "Source material" (if present)

### Classification block

Horizontal divider above this block.

- Tags rendered as coloured chips grouped by type: movement (purple), style (teal), subject (amber), genre (gray), period (gray)
- `conceptualKeywords` rendered as slightly larger chips in the series colour — these are the primary driver of AI similarity queries and should read as more significant than the taxonomy tags
- Tags that carry `aatUri` render with a small external link icon — clicking opens the Getty AAT page for that term

### Art historical connections block

Horizontal divider above.

- Each `artHistoricalReference` as a row: artist name + work title + year, with `notes` field as prose below
- `artHistoricalContext` as a prose block above the individual reference rows — this is the agent-reasoned, artist-confirmed explanation of why these connections exist
- `referenceUrl` on each entry renders as a small external link

### Similar works block

Horizontal divider above.

- Label: "Similar works" with sub-label "via visual similarity"
- Four thumbnail row, each linking to that artwork's page
- Derived from nearest-neighbour CLIP query at render time (or cached — see implementation notes)
- Fallback: omit this block entirely if CLIP embedding is null (stub record)

### CLIP embedding note

**Component:** `ClipEmbeddingNote.tsx`

Sits at the bottom of the similar works block, or at the bottom of Layer 3 if similar works are absent.

This is a small, quiet note — not a feature callout. It exists to be honest with visitors about what the archive is doing technically, and to provide a hook for technically curious visitors and AI systems reading the page.

Content (approximate — finalise copy with artist):

> This work has a machine-readable visual fingerprint — a CLIP embedding — that AI systems use to find visually and conceptually related work across the archive. [What is a CLIP embedding? ↗] [View this work's embedding →]

- "What is a CLIP embedding?" links externally to `https://huggingface.co/openai/clip-vit-large-patch14` — accessible plain-language context
- "View this work's embedding" links to `/[slug]/embedding`
- Condition: render only if `clipEmbedding` is not null
- If `clipEmbedding` is null (stub record): render a quieter version — "Visual similarity data not yet generated for this work."

### Reasoning status badge

**Component:** `ReasoningStatusBadge.tsx`

Very small. Bottom of Layer 3. Not a prominent feature — a quiet honest signal.

- `reasoningStatus: 'complete'` → "Record fully catalogued via Art/Official" — small, tertiary colour
- `reasoningStatus: 'partial'` → "Record partially catalogued" — small, tertiary colour
- `reasoningStatus: 'stub'` → "Record not yet fully catalogued" — small, tertiary colour
- Do not show a percentage, a progress bar, or any gamified completion indicator
- Do not make this visually prominent — it should be readable only if you're looking for it

### Do NOT

- Do not show empty field labels — if the field is empty, the entire block is omitted
- Do not render `formalContributionAssessment` in the middle of the intent fields — it always leads Layer 3
- Do not style intent fields like form fields or database entries — they are prose, they breathe
- Do not make the CLIP note prominent — it is a footnote, not a feature

---

## Layer 4 — History

**Component:** `Layer4History.tsx`

The record of how this work has moved through the world. Past-tense. Background: `var(--color-background-secondary)`.

### Exhibition history

- Chronological list (most recent first) of `events` where `eventType` is `exhibition`, `fair`, or `screening`
- Each entry: year, event title (linked to `/events/[slug]` if the event has a page), venue name, city
- Condition: render only if `events` array is non-empty with qualifying event types

### Full provenance record

This is the public-facing provenance section. It shows the epistemic status of the record, not the private transaction data.

**Provenance confidence statement** — always shown when provenance data exists:

- Derived from `provenanceConfidenceLayer` entries: if all entries are `documented-fact` → "Provenance: fully documented". If mix → "Provenance: partially documented". If `provenanceOriginKnown === false` → "Provenance: origin undocumented".
- This is honest about uncertainty — it does not pretend the record is complete when it isn't
- A one-line note: "Ownership history is held privately. This statement reflects the level of documentation on record."

**Ownership timeline** (public portion):

- From `ownershipHistory` entries where `collectorVisible === true`: show `displayName` (defaults to "Private collection"), city, date range
- Never show `ownerPrivate`, never show sale price, never show `transactionId`
- If no entries are `collectorVisible: true`: show only the provenance confidence statement

**Loan history** (public):

- From `loanHistory`: institution name, date range, linked to event if `eventId` is present
- Condition: render only if `loanHistory` is non-empty

### Work state record

- Current `workState` value and `workStateDate`
- `stateVersions` array if present — each entry as a dated note
- Condition: always show if `workState` is anything other than `original`, or if `stateVersions` is non-empty

### Do NOT

- Do not show `askingPrice`, `salesRecord`, `ownershipHistory` private detail, `provenanceConfidenceLayer` raw array — ever
- Do not show a provenance timeline that looks complete when `provenanceOriginKnown === false`
- Do not omit the provenance confidence statement — uncertainty must be visible

---

## Design constraints

These apply across all layers:

- Do not normalise image display — `sizeTier` and `orientation` apply simultaneously, always
- Do not use `object-cover` for artwork images — use `object-contain`
- Layer 0 background is always dark (`#1a1a1a`) — never white, never transparent
- Series colour is always derived from `series.colour` token — never hardcoded
- All prose fields in Layer 3 use generous line-height (`1.7`) and are never truncated
- No infinite scroll — the page ends at Layer 4
- No sidebar — single column with two-column grids within layers where noted
- Responsive: layers stack naturally; two-column grids in L1 and L4 collapse to single column below `s:` breakpoint
- All external links open in new tab with `rel="noopener noreferrer"`

---

## Fixture record

A complete styling fixture lives at `src/seed/artworkFixture.ts`. It is a TypeScript seed file that upserts a single draft artwork record via the Payload local API. It has `status: 'draft'` and `slug: '__fixture-gates-iii'`. It must never be published. See `artwork-fixture-seed.ts` for the full record.

Run it with: `npx payload run src/seed/artworkFixture.ts`

---

## Verification checklist

Before marking this page complete:

- [ ] Artwork loads at `bernardbolter.com/[slug]` with no `/artworks/` prefix
- [ ] Size-tier + orientation display logic produces visually correct output for sm/md/lg/xl × landscape/portrait/square combinations
- [ ] Magnify mode works: full-res image, draggable, mini-map appears when image exceeds viewport
- [ ] Series card renders correctly, AR pill appears only when `arEnabled: true`
- [ ] Layer 1 shows no prose, no price, no tags
- [ ] Layer 2 availability block correctly handles all four `availabilityStatus` values
- [ ] Editions grid renders correctly from `editions` array
- [ ] `formalContributionAssessment` is the first field visible in Layer 3
- [ ] Empty intent fields produce no visible label or empty space
- [ ] CLIP note renders with correct links; omitted when embedding is null
- [ ] Reasoning status badge is visible but small
- [ ] Layer 4 provenance confidence statement is always shown; private fields never shown
- [ ] `GET /[slug]/embedding` returns correct JSON shape with model declared
- [ ] `GET /[slug]/embedding` returns 404 for unpublished artwork
- [ ] JSON-LD in `<head>` includes all `artism:` fields that are non-empty
- [ ] JSON-LD `creator` is a typed Person object with ULAN + Wikidata — not a plain string
- [ ] JSON-LD `width`/`height` are QuantitativeValue objects — not strings
- [ ] JSON-LD `sameAs` is an array
- [ ] JSON-LD `artism:clipEmbeddingEndpoint` is present
- [ ] Fixture record loads with all layers fully populated
- [ ] Fixture record has `status: draft` and cannot be published via the UI

---

*Artwork Page Directive · June 2026*
*Read alongside: artist-archive-schema-final.md, design-system.md, artism-vocabulary.md*
