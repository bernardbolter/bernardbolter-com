# Artist Archive — Master Schema Specification
## bernardbolter.com · Artworks Collection · Events Collection · Artist Singleton · Data Relations · Payload Implementation
*May 2026 · Developed in dialogue: Bernard Bolter × Claude*
*Final version — supersedes master-schema-spec.md, art-archive-schema-v01.md, art-archive-schema-v02.md, artwork-schema-spec.docx, schema-extension-collector-ar.md*

---

## How to read this document

This is the single authoritative reference for implementing the bernardbolter.com data model in Payload CMS. It is scoped to the **Artist Archive module only** — the schema for the Gallery and Collector modules are specified in separate documents.

Read the entire document before writing any collection config. Every section is load-bearing. The implementation guide in Section 5 references section numbers throughout — know where everything is before starting.

**Related documents (read alongside this one):**
- `art-official-dialogue-spec.md` — full Art/Official agent specification, dialogue protocol, tool calls
- `cursor-implementation-plan-final.md` — step-by-step build sequence for Cursor
- `system-philosophy-and-art-history.md` — the north star; read once, reference always

---

## Schema-wide rules

These rules apply to every collection in this document without exception. They are not repeated per field — they apply globally.

**Localisation.** All multilingual content uses Payload's built-in localisation (`localized: true` on the field). There are no language-suffix duplicate fields anywhere in this schema — no `bioDE`, no `descriptionDE`, no `historicalContextEN`. If a field needs to exist in multiple languages, it has `localized: true`. Adding a new locale is a config change, not a schema change.

**No free text where a structured type exists.** Medium, series, city, support, condition, tags — all must be select or relation fields. Free text is only used where no structured type can capture the full range of values, and always has an explicit note explaining why.

**No language-suffix variants.** `✗ bioDE` `✗ statementDE` `✗ descriptionDE` `✗ historicalContextDE`. All wrong. Use `localized: true` instead.

**Private fields.** Fields marked `private` in the Layer column must have Payload access control functions applied: `read: artistOrAdmin`. They must never appear in any public API response. This is not optional.

**No auto-publish.** No record in any collection is ever published without explicit artist confirmation. Default status is always `draft`.

**No hardcoded JSON-LD.** All JSON-LD is generated programmatically at render time from stored field values. Never hardcoded in component files.

**Payload v3 only.** All collection configs use Payload v3 (Next.js App Router) syntax. No v2 patterns.

---

## Layer and field type key

**Layer** — who fills this field and how:
- `artist` — entered through Art/Official dialogue; artist confirms before record commits
- `agent` — filled computationally by image analysis or inference; shown for artist review
- `private` — role-restricted to artist and admin; never in public API responses

**Field Type** — philosophical role in the schema:
- `CORE` — foundational identity and descriptive data
- `INTENT` — artist-authored, unmediated; fills the intent gap
- `RELATIONAL` — non-hierarchical connections across works and time
- `COMPUTED` — machine-generated from other fields
- `TEMPORAL` — time-aware, holds non-linear change
- `GAP FILLER` — makes visible what current records suppress
- `SYSTEM` — infrastructure for AI reasoning and the cataloguing agent

**Status:**
- `EXISTING` — already in the Payload collection config
- `NEW` — needs implementing
- `DEFERRED` — belongs to a future node; field noted here for architectural awareness

---

## 0. Collection overview and data relationships

The Artist Archive data model consists of two primary collections and five dependent collections.

| Collection | Type | Purpose |
|---|---|---|
| **Artworks** | Primary | Core content unit. Every artwork in the practice. Drives timeline, grid, individual artwork pages. |
| **Events** | Primary | All professional events — exhibitions, fairs, prizes, residencies, publications, commissions, talks, screenings. Drives CV page and exhibition history on artwork pages. |
| Tags | Dependent | Classification vocabulary for Artworks and Events. Typed by category. Carries optional authority URIs. |
| Series | Dependent | Practice series. Each artwork belongs to exactly one series. |
| SeriesEditionTiers | Dependent | Series-level edition tier definitions (size, substrate, counts). Referenced by artwork `ownershipRegistry`. |
| ArtHistoricalReferences | Dependent | Structured records for artworks and artists the practice is in dialogue with. |
| Artist | Singleton | The single artist record. Holds all biographical, statement, contact, and identity fields. |

### 0a. Relationship map

All relations are bidirectional in Payload — populating one side automatically updates the other.

| Relation | Description |
|---|---|
| `Artworks ↔ Events` | Many-to-many. Authority side: `Events.artworks`. Adding a work to an event auto-populates `Artworks.events`. |
| `Artworks → Series` | Many-to-one. Every artwork belongs to exactly one series. Authority: `Artworks.series`. |
| `Artworks → Tags` | Many-to-many across five tag arrays. Authority: Artworks. |
| `Artworks → ArtHistoricalReferences` | Many-to-many. Authority: `Artworks.artHistoricalReferences`. |
| `Artworks → Artist` | Many-to-one. Artist record referenced in JSON-LD output. |
| `Events → Tags` | Many-to-many for event classification. Authority: Events. |
| `Events → Artist` | Many-to-one. Referenced in JSON-LD performer output. |
| `Tags → (AAT / Iconclass / LCSH)` | One-to-external. Authority URIs stored as text fields on Tag — no Payload relation. |
| `Artworks.ownershipHistory ↔ Artworks.salesRecord` | One-to-one within the same record via shared `transactionId` UUID. Enforced by application logic. |

### 0b. Cross-module linked records pattern

The Artist Archive is one of three modules (Artist Archive, Gallery, Collector). They share a common data vocabulary and connect through explicit links — not a shared database.

When the same physical artwork exists across modules, each module holds its own record layer. Links between layers are explicit relations, never implicit.

```
Artist record     recordOrigin: artist-catalogued
                  linkedArtistId → Artist (this module)
                  The canonical record. Artist owns and controls it.

Gallery record    recordOrigin: gallery-catalogued
(Gallery module)  managedBy → Gallery
                  linkedArtistRecord → Artworks (artist-catalogued, this module)
                  Null if artist not on platform.

Collector record  recordOrigin: collector-catalogued
(Collector module) linkedCollectorId → Collector
                  linkedArtistRecord → Artworks (artist-catalogued, this module)
                  Null if artist record unknown.
```

**Rules:**
- The artist-catalogued record is always canonical. Never modified by gallery or collector actions.
- `linkedArtistRecord` is always nullable. Absence means the link is unknown, not that it doesn't exist.
- When an artist joins the platform and an existing gallery or collector record links to their work, `linkedArtistRecord` is updated. Nothing else on the artist record changes.

**The Artist Archive query never includes gallery or collector records:**
```
recordOrigin: artist-catalogued
linkedArtistId: [artist.id]
```

---

## 1. Artworks collection

The Artwork record is the core content unit. Every painting, photograph, video, digital work, and installation in the practice lives here.

### 1.1 Identity

| Field | Type | Layer | Field Type | Status | Definition |
|---|---|---|---|---|---|
| `title` | text | artist | CORE | EXISTING | Required. The artwork title as confirmed by the artist. Never auto-generated. |
| `altTitle` | text, localized | artist | CORE | NEW | Optional alternate title — for works known differently in another language, or retitled works. |
| `slug` | text | agent | COMPUTED | EXISTING | Auto-generated from title + yearCreated + catalogue sequence number. Unique. Never changes after first publication. |
| `yearCreated` | number | artist | CORE | EXISTING | Year the work was begun. Four-digit integer. Required. |
| `yearCompleted` | number | artist | CORE | EXISTING | Year finished, if different from yearCreated. For multi-year works. Optional. |
| `status` | select | artist | SYSTEM | EXISTING | Values: `draft` \| `published`. Default: `draft`. Never published without explicit artist confirmation. |
| `recordOrigin` | select | agent | SYSTEM | NEW | Values: `artist-catalogued` \| `gallery-catalogued` \| `collector-catalogued` \| `migrated` \| `enrichment-agent`. Default: `artist-catalogued`. Set once at record creation, never changed. |

### 1.2 Physical fields

#### Medium and support

| Field | Type | Layer | Field Type | Status | Definition |
|---|---|---|---|---|---|
| `medium` | select + text override | artist | CORE | EXISTING | Structured select: `acrylic photo transfer on canvas` \| `acrylic on canvas` \| `mixed media on canvas` \| `photo collage` \| `video` \| `digital` \| `other`. Override text for edge cases. |
| `measurementType` | select (multi) | artist | CORE | EXISTING | Values: `physical` \| `digital` \| `time-based`. Multiple allowed. Gates which dimension fields are shown in admin. |
| `support` | select | artist | CORE | EXISTING | Values: `canvas` \| `paper` \| `board` \| `screen` \| `file` \| `other`. |
| `framing` | select | artist | CORE | EXISTING | Values: `framed` \| `unframed` \| `artist framed`. Omit for digital-only. |
| `weight` | number | artist | CORE | EXISTING | Weight in kilograms. Optional. Physical works only. |

#### Physical dimensions

Width, height, and depth stored as whole number + fractional string + unit. Normalised mm values computed server-side on every save via Payload `beforeChange` hook — never at render time.

| Field | Type | Layer | Field Type | Status | Definition |
|---|---|---|---|---|---|
| `dimensionUnit` | select | artist | CORE | EXISTING | Values: `cm` \| `in`. Applies to all physical dimension fields on this record. |
| `widthWhole` | number | artist | CORE | EXISTING | Whole-number part of width. |
| `widthFraction` | text | artist | CORE | EXISTING | Optional fractional part as string: `'3/16'`, `'1/2'`. |
| `heightWhole` | number | artist | CORE | EXISTING | Whole-number part of height. |
| `heightFraction` | text | artist | CORE | EXISTING | Optional fractional part of height. |
| `depthWhole` | number | artist | CORE | EXISTING | Whole-number part of depth. Omit for flat works. |
| `depthFraction` | text | artist | CORE | EXISTING | Optional fractional part of depth. |
| `widthMm` | number | agent | COMPUTED | EXISTING | Computed by `beforeChange` hook. Never entered manually. |
| `heightMm` | number | agent | COMPUTED | EXISTING | Computed. Height normalised to mm. |
| `depthMm` | number | agent | COMPUTED | EXISTING | Computed. Null for flat works. |
| `dimensionsDisplay` | text | agent | COMPUTED | EXISTING | Computed display string: `'120 × 90 cm'`. Generated by hook. |

#### Digital dimensions

| Field | Type | Layer | Field Type | Status | Definition |
|---|---|---|---|---|---|
| `widthPx` | number | artist | CORE | EXISTING | Width in pixels. |
| `heightPx` | number | artist | CORE | EXISTING | Height in pixels. |
| `resolutionDpi` | number | artist | CORE | EXISTING | DPI. |
| `fileFormat` | text | artist | CORE | EXISTING | Native file format: TIFF, PSD, MP4, MOV, PDF. Not the archive image format — the format of the work itself. |
| `fileSize` | number | artist | CORE | EXISTING | File size in megabytes. Optional archival reference. |
| `colorSpace` | select | artist | CORE | EXISTING | Values: `sRGB` \| `Adobe RGB` \| `P3` \| `CMYK` \| `other`. |

#### Time-based dimensions

| Field | Type | Layer | Field Type | Status | Definition |
|---|---|---|---|---|---|
| `duration` | text | artist | CORE | EXISTING | Formatted string: `'HH:MM:SS'` or prose for open-duration works. |
| `durationSeconds` | number | agent | COMPUTED | EXISTING | Computed from duration for video/audio. Null for open-duration. |
| `looped` | boolean | artist | CORE | EXISTING | Whether the work loops in exhibition. |
| `soundDesign` | select | artist | CORE | EXISTING | Values: `sound` \| `silent` \| `ambient` \| `variable`. |

#### Condition and state

| Field | Type | Layer | Field Type | Status | Definition |
|---|---|---|---|---|---|
| `condition` | select | artist | TEMPORAL | EXISTING | Values: `excellent` \| `good` \| `fair` \| `poor`. |
| `conditionNotes` | text | artist | TEMPORAL | EXISTING | Free text. Optional. |
| `workState` | select | artist | TEMPORAL | EXISTING | Values: `original` \| `reworked` \| `restored` \| `damaged` \| `lost`. |
| `workStateNotes` | text | private | TEMPORAL | EXISTING | Prose notes on workState. Private. |
| `workStateDate` | date | artist | TEMPORAL | EXISTING | Date the current workState was recorded. |
| `materialAndProcessMeaning` | longText | artist | INTENT | NEW | Why these materials. What process decisions carry semantic weight. Drawn out obliquely in Art/Official dialogue. |
| `stateVersions` | array of objects | artist | TEMPORAL | NEW | Timestamped physical change records. Each: `{ date, description, type: restoration\|rework\|damage\|relining\|other }`. |

### 1.3 Size and orientation

These three fields drive the physical-scale display logic on the public site. Artworks are displayed at a size that visually represents their real-world physical scale — not normalised to fill a grid cell.

| Field | Type | Layer | Field Type | Status | Definition |
|---|---|---|---|---|---|
| `sizeTier` | select | artist | CORE | EXISTING | Values: `sm` \| `md` \| `lg` \| `xl`. Agent suggests based on longest dimension (< 300mm = sm, 300–800mm = md, 800–2000mm = lg, > 2000mm = xl). Artist confirms or overrides. |
| `orientation` | select | artist | CORE | EXISTING | Values: `landscape` \| `portrait` \| `square`. Determines which dimension is constrained in layout. |
| `aspectRatio` | number | agent | COMPUTED | EXISTING | `widthMm ÷ heightMm`. Stored float. Computed by `beforeChange` hook. For video-only works, computed from posterImage pixel dimensions. |

**Display constraint — agents must not violate this:** Do not normalise image display to fill grid cells uniformly. `sizeTier` and `orientation` must both apply simultaneously. Never override with `object-cover` or uniform grid sizing. This logic belongs in a reusable component — not duplicated per view.

### 1.4 Classification

| Field | Type | Layer | Field Type | Status | Definition |
|---|---|---|---|---|---|
| `series` | relation → Series | artist | CORE | EXISTING | Every artwork belongs to exactly one series. Required. Not a text field. |
| `city` | text (controlled) | artist | CORE | EXISTING | City where the work was made. Controlled vocabulary. |
| `country` | text (controlled) | artist | CORE | EXISTING | Country. Controlled vocabulary. |
| `cityTgnUri` | text (URI) | agent | SYSTEM | NEW | Getty TGN URI for the city. Used in JSON-LD `locationCreated`. |
| `movementTags` | relation[] → Tags | artist | RELATIONAL | EXISTING | Art historical movement tags. Agent suggests; artist confirms. |
| `styleTags` | relation[] → Tags | artist | RELATIONAL | EXISTING | Formal style tags. |
| `subjectTags` | relation[] → Tags | artist | RELATIONAL | EXISTING | Iconographic subject tags. |
| `genreTags` | relation[] → Tags | artist | RELATIONAL | NEW | Genre tags (portrait, landscape, abstraction, installation). |
| `periodTags` | relation[] → Tags | artist | RELATIONAL | NEW | Art-historical period tags (Contemporary, 21st century). |
| `conceptualKeywords` | text[] | agent | INTENT | EXISTING | Abstract conceptual terms: memory \| erasure \| mediation. Generated from full session context. Artist confirms or edits. Primary driver of cross-corpus similarity queries. |
| `events` | relation[] → Events | artist | RELATIONAL | NEW | Events in which this artwork has appeared. Reverse side of `Events.artworks` — bidirectional. |
| `artHistoricalReferences` | relation[] → ArtHistoricalReferences | agent | RELATIONAL | EXISTING | Suggested by agent; confirmed by artist. |
| `artHistoricalContext` | longText | artist | RELATIONAL | EXISTING | Prose note on art historical connections. Agent drafts; artist confirms or rewrites. |
| `seriesContext` | longText | artist | RELATIONAL | NEW | Artist's account of where this work sits in the practice arc. |
| `consciousRejections` | longText | artist | INTENT | NEW | What was being pushed against. Never asked directly — drawn out in dialogue. |
| `formalContributionAssessment` | longText | artist | INTENT | NEW | What this work does that hasn't been done before. Agent drafts from dialogue; artist confirms. |
| `sourceMaterials` | text | artist | INTENT | NEW | Plain-language description of photographic, archival, or found-image source material. Left blank for works with no incorporated source imagery. |

#### Tags collection — authority URI fields

| Field | Type | Layer | Status | Definition |
|---|---|---|---|---|
| `label` | text | artist | EXISTING | Display label. |
| `type` | select | artist | EXISTING | Values: `movement` \| `style` \| `subject` \| `genre` \| `period`. |
| `aatUri` | text (URI) | agent | NEW | Getty AAT URI. Agent suggests at tag creation; artist confirms. |
| `iconclassNotation` | text | agent | NEW | Iconclass notation for subject tags. |
| `lcshUri` | text (URI) | agent | NEW | Library of Congress URI. Secondary to AAT. Optional. |
| `description` | text | artist | EXISTING | How this tag is used in this archive specifically. |

### 1.5 Media fields

| Field | Type | Layer | Field Type | Status | Definition |
|---|---|---|---|---|---|
| `primaryMediaType` | select | artist | CORE | EXISTING | Values: `image` \| `video` \| `image-and-video`. |
| `primaryImage` | upload | artist | CORE | EXISTING | High-res canonical image. Required for image-based works. |
| `primaryImageAltText` | text, localized | agent | CORE | NEW | Alt text. Agent drafts; artist confirms. Required for accessibility. |
| `posterImage` | upload | artist | CORE | EXISTING | Featured image in all display contexts. Required when `primaryMediaType` is `video`. |
| `posterImageAltText` | text, localized | agent | CORE | NEW | Alt text for poster image. |
| `alternateViewImages` | upload[] with metadata | artist | CORE | EXISTING | Different vantage points — verso, raking light. Each: `{ caption, altText, aspectRatio }`. |
| `detailImages` | upload[] with metadata | artist | CORE | EXISTING | Surface detail crops. Each: `{ caption, altText, aspectRatio }`. |
| `installationShots` | upload[] with metadata | artist | CORE | EXISTING | Work installed in gallery context. Each: `{ venue, date, altText, aspectRatio }`. |
| `videoFile` | upload | artist | CORE | EXISTING | Direct video upload. Takes precedence over `videoUrl` if both present. |
| `videoUrl` | text (URL) | artist | CORE | EXISTING | External video URL (Vimeo, YouTube). Mutually exclusive with `videoFile`. |
| `videoCaptions` | upload | artist | CORE | EXISTING | VTT caption file. |
| `documentationVideoUrl` | text (URL) | artist | CORE | EXISTING | Video documenting a physical work — not the work itself. |

### 1.6 Intent fields

These are the fields that cannot be automated. They require genuine artist input through Art/Official dialogue. The agent may draft or suggest; the artist must confirm in their own words. Never generate these from AI inference alone.

| Field | Type | Layer | Field Type | Status | Definition |
|---|---|---|---|---|---|
| `intent` | longText | artist | INTENT | EXISTING | The artist's own words about what the work means, what drove the decisions, what it is doing. First-person. Distinct from description. |
| `intentVsOutcome` | longText | artist | INTENT | NEW | Where the work went somewhere the artist did not plan. The gap between intention and result. |
| `makingNote` | longText | artist | INTENT | EXISTING | Notes on the process of making — specific decisions, sequence, what was tried and abandoned. |
| `directInspiration` | text | artist | INTENT | EXISTING | The direct trigger for this work, if there was one. |
| `encounterNote` | longText | artist | INTENT | EXISTING | Where the artist was when they made this. The physical and mental context of making. |
| `workContext` | text | artist | INTENT | EXISTING | Brief contextual note for this work's position in the practice at the time of making. |

### 1.7 Agent analysis fields

Filled silently by image analysis during the Art/Official session. Shown for artist review at the confirmation step.

| Field | Type | Layer | Field Type | Status | Definition |
|---|---|---|---|---|---|
| `dominantColours` | text[] (hex) | agent | COMPUTED | EXISTING | Dominant colours extracted by image analysis. Array of hex values. |
| `overlayColors` | text[] (hex) | agent | COMPUTED | EXISTING | Hex values for the A Colorful History hover interaction. Agent suggests from painted field positions; artist confirms. |
| `overlayRects` | array of objects | agent | COMPUTED | EXISTING | `{ color, x, y, w, h }` — all values as percentage of image dimensions. Resolution-independent. Agent suggests; artist confirms. |
| `descriptionShort` | text, localized | agent | CORE | EXISTING | 1–3 sentences. Agent drafts from full session context; artist confirms. Maps to schema.org `description`. |
| `descriptionLong` | richText, localized | agent | CORE | NEW | Extended description. Agent drafts; artist confirms or rewrites. |
| `processNotes` | text | agent | INTENT | EXISTING | Agent's structural reading of the process as visible in the work. For artist review. |
| `clipEmbedding` | vector(1536) | agent | COMPUTED | EXISTING | CLIP embedding stored via pgvector on Neon. Generated after image upload. Not displayed in UI. Powers nearest-neighbour similarity queries. |

### 1.8 Commercial fields

| Field | Type | Layer | Field Type | Status | Definition |
|---|---|---|---|---|---|
| `availabilityStatus` | select | artist | CORE | EXISTING | Values: `available` \| `sold` \| `not-for-sale` \| `on-consignment`. |
| `askingPrice` | number | private | CORE | EXISTING | Current asking price in `listingCurrency`. Private. |
| `listingCurrency` | select | private | CORE | EXISTING | Values: `EUR` \| `GBP` \| `USD` \| `other`. |
| `originalAskingPrice` | number | private | CORE | EXISTING | First listed price. Preserved even after asking price changes. Private. |
| `priceNotes` | text | private | CORE | EXISTING | Notes on pricing history. Private. |
| `insuranceValue` | number | private | CORE | EXISTING | Insured value in `listingCurrency`. Private. |
| `insuranceValueDate` | date | private | CORE | EXISTING | Date current insurance valuation was established. Private. |
| `galleryReference` | text | private | CORE | NEW | Gallery's own inventory number. Private. |
| `salesRecord` | array of objects | private | TEMPORAL | EXISTING | Transaction log. Each: `{ transactionId (UUID), saleDate, salePrice, saleCurrency, exchangeRateToEur, buyerPrivate, buyerCity, channel, galleryName, auctionHouse, invoiceReference, commissionRate, netToArtist (computed), vatApplicable, vatRate, editionNumber, notes }`. Private. |
| `totalRevenue` | computed number | private | COMPUTED | EXISTING | Sum of all `salesRecord.netToArtist` values normalised to EUR. Management convenience only. Private. |
| `editionType` | select | artist | CORE | EXISTING | Values: `unique` \| `limited-edition` \| `open-edition` \| `artist-proof-only`. |
| `editions` | array of objects | artist | CORE | EXISTING | Each: `{ formatLabel, widthCm, heightCm, substrate, printTechnique, totalEditionSize, artistProofs, remaining, pricePerPrint, currency, certificate, signature, notes }`. Public. |
| `editionNotes` | text, localized | artist | CORE | EXISTING | Public notes on the edition programme. |

### 1.9 Provenance and location

All fields in this section are private and role-restricted. Never visible to editor roles or the public.

| Field | Type | Layer | Field Type | Status | Definition |
|---|---|---|---|---|---|
| `currentLocation` | select + text | private | TEMPORAL | EXISTING | Values: `artist's studio` \| `private collection` \| `institution` \| `on loan`. `locationDetail` text holds specific address. |
| `ownershipHistory` | array of objects | private | TEMPORAL | EXISTING | Each: `{ transactionId (links to salesRecord), ownerPrivate, displayName, city, dateAcquired, dateRelinquished, claimStatus (unclaimed\|claimed-pending\|claimed-confirmed), collectorVisible (boolean), notes }`. `displayName` defaults to `'Private collection'`. Sale price never publicly displayed. |
| `loanHistory` | array of objects | private | TEMPORAL | EXISTING | Each: `{ institution, dateOut, dateReturned, eventId (relation → Events, optional), notes }`. |
| `provenanceOriginKnown` | boolean | private | TEMPORAL | NEW | Default `true`. Set `false` when studio-to-first-owner chain is not traceable. Makes uncertainty explicit. |
| `provenanceConfidenceLayer` | array of objects | private | GAP FILLER | NEW | Evidence basis for provenance claims. Each: `{ claim, evidenceBasis, confidenceLevel (documented-fact\|credible-inference\|institutional-assertion\|speculation) }`. |
| `hasEditions` | select | artist | CORE | NEW | Values: `none` \| `limited` \| `open`. Whether this work has tracked edition tiers in `ownershipRegistry`. |
| `ownershipRegistry` | array of objects | mixed | NEW | Per-copy ownership claims by edition tier. Each tier: `{ seriesEditionTier (relation → SeriesEditionTiers, optional), tierLabel, tierOrder, editionSize, apCount, isOriginalTier (inline fallback when no relation), copies[] }`. Use `seriesEditionTier` for series-structured works; inline fields for non-series-structured works (e.g. giclée tiers on A Colorful History). Each copy: `{ copyNumber, isArtistProof, owner (private unless collectorVisible), claimStatus, collectorVisible, dateAcquired, claimedCopyNumberKnown, notes (private) }`. |
| `untrackedEditionsNote` | text, localized | artist | NEW | Artwork-level prose for informal/unnumbered print runs not tracked in `ownershipRegistry`. |
| `componentCount` | number | artist | NEW | Physical components sold as one unit (e.g. triptych). Descriptive only. |
| `provenanceAndExhibitionTimeline` | computed display | agent | TEMPORAL | NEW | Timeline assembled from `ownershipHistory` + `loanHistory` + `events`. Computed presentation — not a stored field. |

### 1.10 Schema.org / JSON-LD

All JSON-LD generated programmatically at render time. Never hardcoded. Schema.org type: `VisualArtwork`.

The full JSON-LD reference output:

```json
{
  "@context": "https://schema.org",
  "@type": "VisualArtwork",
  "name": "Artwork Title",
  "identifier": { "@type": "PropertyValue", "propertyID": "CatalogueNumber", "value": "BB-2021-012" },
  "url": "https://bernardbolter.com/artworks/slug-here",
  "sameAs": ["https://www.wikidata.org/entity/QXXXXX"],
  "creator": {
    "@type": "Person",
    "name": "Bernard Bolter",
    "identifier": [
      { "@type": "PropertyValue", "propertyID": "ULAN", "value": "http://vocab.getty.edu/ulan/500XXXXXX" },
      { "@type": "PropertyValue", "propertyID": "Wikidata", "value": "https://www.wikidata.org/entity/QXXXXXX" }
    ]
  },
  "dateCreated": "2021",
  "artMedium": "Acrylic photo transfer on canvas",
  "artworkSurface": "Canvas",
  "artform": "Painting",
  "material": ["Acrylic", "Photographic transfer", "Canvas"],
  "width": { "@type": "QuantitativeValue", "value": 90, "unitCode": "CMT", "unitText": "cm" },
  "height": { "@type": "QuantitativeValue", "value": 120, "unitCode": "CMT", "unitText": "cm" },
  "locationCreated": {
    "@type": "Place",
    "name": "Berlin",
    "address": { "@type": "PostalAddress", "addressLocality": "Berlin", "addressCountry": "DE" },
    "sameAs": "http://vocab.getty.edu/tgn/7003712"
  },
  "isPartOf": { "@type": "Collection", "name": "Mediums of Perception", "url": "https://bernardbolter.com/series/mediums-of-perception" },
  "depicts": [{ "@type": "DefinedTerm", "name": "Architectural facade", "inDefinedTermSet": "https://iconclass.org/", "termCode": "48C" }],
  "about": ["memory", "mediation", "the photographic index"],
  "description": "Short description.",
  "image": { "@type": "ImageObject", "url": "https://bernardbolter.com/media/image.jpg" },
  "copyrightHolder": { "@type": "Person", "name": "Bernard Bolter" },
  "copyrightYear": 2021,
  "license": "https://rightsstatements.org/vocab/InC/1.0/",
  "creditText": "Bernard Bolter, Mediums of Perception No. 12, 2021. Courtesy the artist."
}
```

**JSON-LD field constraints — agents must not violate these:**
- `creator` must be a typed Person object with ULAN and Wikidata identifier URIs — not a plain name string
- `width` / `height` / `depth` must be `QuantitativeValue` objects with `unitCode` — not plain strings
- `locationCreated` must be a typed `Place` object with `address` and TGN `sameAs` — not a plain string
- `artMedium` where tag has AAT URI: output as `DefinedTerm` object

### 1.11 AR fields

Added to artwork records where `arEnabled` is true. Works for both flat and framed physical works.

| Field | Type | Layer | Status | Definition |
|---|---|---|---|---|
| `arEnabled` | boolean | artist | NEW | Default `false`. Opt-in per record. Requires accurate dimensions and at least one high-quality image. |
| `arWidthM` | decimal | agent | NEW | Width in metres. Computed from `widthMm ÷ 1000`. Override available for framed vs unframed difference. |
| `arHeightM` | decimal | agent | NEW | Height in metres. Computed from `heightMm ÷ 1000`. |
| `arDepthM` | decimal | artist | NEW | Depth in metres. Relevant for framed works — affects wall projection offset. |
| `arModelUrl` | text | agent | NEW | URL to generated `.usdz` file. Generated server-side when `arEnabled` is set true. |
| `arModelGlbUrl` | text | agent | NEW | URL to `.glb` file for Android Scene Viewer. |
| `arAllowScaling` | boolean | artist | NEW | Default `true`. Set `false` for works where correct physical scale is important to the experience. |
| `arLastGenerated` | date | agent | NEW | Timestamp of last USDZ/GLB generation. Used to detect stale models when image or dimensions update. |

**AR generation — implementation notes for Cursor:**
- USDZ generation runs as a background job triggered when `arEnabled: true` and both `primaryImage` and dimensions are present
- Output: flat rectangular plane mesh textured with artwork image, dimensioned in real-world metres
- For framed works with `arDepthM > 0`: simple box geometry with image on front face
- Serve `.usdz` with `Content-Type: model/vnd.usdz+zip`
- iOS Quick Look requires `rel="ar"` on the anchor with image tag as first child
- Quick Look only launches from Safari — not from Facebook/Instagram in-app browsers
- `allowsContentScaling=0` disables pinch-to-resize — recommended for works where scale matters

### 1.12 Series extension tabs

Series-specific fields live in separate Payload tabs — not in the base schema. Adding a new series means adding a new tab config only. Base fields are never modified.

#### Mediums of Perception tab

| Field | Type | Layer | Status | Definition |
|---|---|---|---|---|
| `sourcePhotographDetails` | text | artist | EXISTING | Detailed description of source photograph. |
| `imageCaptureType` | select | artist | EXISTING | Values: `daguerreotype` \| `ambrotype` \| `lithograph` \| `aerial` \| `satellite` \| `digital`. |
| `historicalContext` | richText, localized | artist | EXISTING | Historical context copy. Replaces the old `historicalContextEN` + `historicalContextDE` pattern — use `localized: true` instead. |
| `triptychPosition` | select | artist | EXISTING | Values: `panel 1` \| `panel 2` \| `panel 3` \| `standalone`. |
| `triptychGroup` | relation → TriptychGroups | artist | EXISTING | Groups three panels of a triptych. |
| `arVideoUrl` | text | artist | EXISTING | AR video layer URL for mind.js. |
| `arRapScript` | text | artist | EXISTING | Rap script text for AR audio layer. |
| `lat` | number | artist | EXISTING | Map pin latitude. |
| `lng` | number | artist | EXISTING | Map pin longitude. |

#### A Colorful History tab

| Field | Type | Layer | Status | Definition |
|---|---|---|---|---|
| `overlayColors` | text[] | agent | EXISTING | Hex array for coloured rectangle hover interaction. (Also in base schema — series tab provides admin UI context.) |
| `overlayRects` | array of objects | agent | EXISTING | `{ color, x, y, w, h }` as percentage of image dimensions. |

### 1.13 Deferred — future nodes

| Field | Source | Status | Description |
|---|---|---|---|
| `swipeResponse` | Artism viewer | DEFERRED | Four-directional viewer response mechanic. |
| `uncertaintyDialogue` | Artism viewer | DEFERRED | Viewer articulates why they are unsure. Most valuable signal in the system. |
| `enthusiasmDialogue` | Artism viewer | DEFERRED | Viewer articulates why they are moved. |
| `intentResponseDelta` | Computed | DEFERRED | Where viewer response consistently diverges from artist intent. |
| `formalContributionConvergence` | Computed | DEFERRED | Where artist assessment and viewer uncertainty independently point at the same quality. |
| `visualSimilarity` | Computed | DEFERRED | CLIP-based similarity across corpus. Powered by `clipEmbedding`. |

---

## 2. Events collection

Every professional event in the practice lives here. Drives the CV page, exhibition history on artwork pages, and the Art/Official knowledge pool briefing.

### 2.1 Event types and schema.org mapping

| eventType value | schema.org @type | Used for |
|---|---|---|
| `solo-exhibition` | `ExhibitionEvent` | Solo shows |
| `group-exhibition` | `ExhibitionEvent` | Group shows |
| `art-fair` | `Event` | Fair participation |
| `residency` | `Event` | Residency programmes |
| `award` | `Event` | Awards, prizes, nominations |
| `publication` | `PublicationEvent` | Press, catalogue essays, books |
| `bibliography` | `PublicationEvent` | Writing about Bernard by others — reviews, critical essays, catalogue texts. Distinct from `publication` which is Bernard contributing. |
| `public-commission` | `Event` | Site-specific or permanent commission |
| `talk-panel` | `Event` | Artist talks, panels, lectures |
| `screening` | `ScreeningEvent` | Film festivals, video art programmes |
| `performance` | `Event` | Live performance or durational work |
| `education` | `Event` | Degrees, diplomas, programmes. Rendered as the Education section of the CV. |
| `other` | `Event` | `eventTypeCustom` text field describes the type |

### 2.2 Identity and type

| Field | Type | Layer | Status | Definition |
|---|---|---|---|---|
| `title` | text | artist | NEW | Full event title as it appears on a CV. Required. |
| `slug` | text | agent | NEW | Auto-generated from title + yearStart. Unique. |
| `eventType` | select | artist | NEW | See type table above. Determines schema.org `@type`, CV grouping, and which field sections are shown. |
| `eventTypeCustom` | text | artist | NEW | Free-text label when `eventType` is `other`. |
| `status` | select | artist | NEW | Values: `draft` \| `published`. Default: `draft`. |
| `featured` | boolean | artist | NEW | Whether this event is highlighted on the exhibitions page. |

### 2.3 Dates

| Field | Type | Layer | Status | Definition |
|---|---|---|---|---|
| `startDate` | date | artist | NEW | Opening, start, or publication date. Required. |
| `endDate` | date | artist | NEW | Closing or end date. Null when `isOngoing` is true. |
| `isOngoing` | boolean | artist | NEW | Work is permanent or event still active. CV displays 'ongoing'. |
| `openingDate` | date | artist | NEW | Vernissage date if different from `startDate`. Optional. |
| `yearStart` | number | agent | NEW | Four-digit year computed from `startDate`. Used for CV grouping and fast year-based queries. |

### 2.4 Venue and location

| Field | Type | Layer | Status | Definition |
|---|---|---|---|---|
| `venueName` | text | artist | NEW | Gallery, museum, institution, or fair venue name. |
| `venueCity` | text (controlled) | artist | NEW | City. |
| `venueCountry` | text (controlled) | artist | NEW | Country. |
| `venueTgnUri` | text (URI) | agent | NEW | Getty TGN URI for venue city. |
| `venueUrl` | text (URL) | artist | NEW | Venue website or exhibition page. |
| `venueWikidataUri` | text (URI) | agent | NEW | Wikidata URI for venue institution. |
| `isOnline` | boolean | artist | NEW | Online-only or online component. |
| `onlineEventUrl` | text (URL) | artist | NEW | Online exhibition URL. |
| `additionalVenues` | array of objects | artist | NEW | Touring exhibition legs. Each: `{ venueName, venueCity, venueCountry, startDate, endDate, venueUrl }`. |

### 2.5 Event context

| Field | Type | Layer | Status | Definition |
|---|---|---|---|---|
| `organiser` | text | artist | NEW | Institution or body that organised the event. May differ from venue. |
| `curator` | text | artist | NEW | Curator name. Optional. |
| `role` | select | artist | NEW | Values: `solo` \| `group` \| `duo` \| `invited-artist` \| `artist-in-residence` \| `awardee` \| `speaker` \| `panellist` \| `screened-artist` \| `commissioned-artist`. |
| `coExhibitors` | text[] | artist | NEW | Other artist names in group/duo shows. |
| `catalogue` | boolean | artist | NEW | Whether a catalogue was produced. |
| `catalogueUrl` | text (URL) | artist | NEW | Optional URL to catalogue. |
| `pressUrl` | text (URL) | artist | NEW | Optional URL to press release or review. |
| `recordingUrl` | text (URL) | artist | NEW | Optional URL to recording. For talks, panels, performances. |

### 2.6 Artworks in this event

| Field | Type | Layer | Status | Definition |
|---|---|---|---|---|
| `artworks` | relation[] → Artworks | artist | NEW | Artworks included in or produced for this event. Authority side of the bidirectional relation with `Artworks.events`. |
| `artworkPresentationNote` | text | artist | NEW | How works were presented: `'shown as a triptych'`, `'large-scale projection'`. |

### 2.7 Description and public text

| Field | Type | Layer | Status | Definition |
|---|---|---|---|---|
| `descriptionShort` | text, localized | artist | NEW | 1–2 sentences. The CV line — factual, neutral. May be blank for simple entries. |
| `descriptionLong` | richText, localized | artist | NEW | Extended description for events with their own page. |
| `artistNote` | longText | artist | NEW | Artist's personal account of this event. First-person, informal. Feeds Art/Official knowledge pool. |
| `pressQuote` | text | artist | NEW | Significant press quote with attribution. |

### 2.8 Type-specific fields

Admin UI gates these on `eventType`.

**Publications** (`eventType: publication`)

| Field | Layer | Status | Definition |
|---|---|---|---|
| `publicationTitle` | artist | NEW | Publication title — distinct from event title (which may be the article title). |
| `publicationAuthor` | artist | NEW | Author if not Bernard. |
| `publicationIssn` | artist | NEW | ISSN for periodicals. |
| `publicationIsbn` | artist | NEW | ISBN for books. |
| `publicationPages` | artist | NEW | Pages: `'pp. 34–36'`. |

**Bibliography** (`eventType: bibliography`)

| Field | Layer | Status | Definition |
|---|---|---|---|
| `bibliographyAuthor` | artist | NEW | Author of the critical text. Required for bibliography entries. |
| `publicationTitle` | artist | NEW | Publication name. |
| `publicationPages` | artist | NEW | Pages. |
| `publicationUrl` | artist | NEW | URL to the text if available online. |

**Awards** (`eventType: award`)

| Field | Layer | Status | Definition |
|---|---|---|---|
| `awardGrantingOrganisation` | artist | NEW | The body granting the award. |
| `awardAmount` | private | NEW | Prize value. Private. |
| `awardAmountCurrency` | private | NEW | Values: `EUR` \| `USD` \| `GBP` \| `CHF` \| `other`. Private. |
| `awardOutcome` | artist | NEW | Values: `winner` \| `shortlisted` \| `nominated` \| `honourable-mention`. |

**Residencies** (`eventType: residency`)

| Field | Layer | Status | Definition |
|---|---|---|---|
| `residencyOrganisation` | artist | NEW | Institution or programme organising the residency. |
| `residencyType` | artist | NEW | Values: `studio` \| `live-work` \| `research` \| `production` \| `international`. |
| `residencyWorksProduced` | artist | NEW | Short note on what was produced. Not a formal artworks relation. |

**Education** (`eventType: education`)

| Field | Layer | Status | Definition |
|---|---|---|---|
| `institution` | artist | NEW | School, college, university name. Required. |
| `degree` | artist | NEW | Degree or qualification title: `MFA`, `BFA`, `Foundation Diploma`. |
| `subject` | artist | NEW | Subject studied: `Fine Art`, `Painting`. Optional. |
| `cvVisible` | artist | NEW | Default `true`. Set `false` to keep in records but exclude from public CV. |

**Public commissions** (`eventType: public-commission`)

| Field | Layer | Status | Definition |
|---|---|---|---|
| `commissionClient` | artist | NEW | Commissioning body. |
| `commissionSite` | artist | NEW | Site or building. |
| `commissionBudget` | private | NEW | Commission value in EUR. Private. |

### 2.9 CV configuration

| Field | Type | Layer | Status | Definition |
|---|---|---|---|---|
| `cvSection` | select | artist | NEW | Values: `solo-exhibitions` \| `group-exhibitions` \| `art-fairs` \| `awards-prizes` \| `residencies` \| `public-commissions` \| `publications` \| `bibliography` \| `talks-panels` \| `screenings` \| `performances` \| `education` \| `other`. Default computed from `eventType`. |
| `cvDisplayTitle` | text | artist | NEW | Display title on the CV line, if different from `title`. |
| `cvPriority` | number | artist | NEW | 1–10. Higher = more prominent within CV section. Default 5. |
| `excludeFromCv` | boolean | artist | NEW | Exclude from public CV page. Data kept in records. |

### 2.10 CV page generation

Query: all Events where `status: published` and `excludeFromCv: false`. Sorted by `yearStart` descending within each `cvSection` group.

**Standard CV section display order:**
`education` → `solo-exhibitions` → `group-exhibitions` → `art-fairs` → `awards-prizes` → `residencies` → `public-commissions` → `publications` → `bibliography` → `selected-collections` → `talks-panels` → `screenings` → `performances` → `other`

Education at top (standard CV convention). Selected collections near bottom (contextual, not chronological — derived from Artist singleton `selectedCollections` array, not from Events).

**CV line formats:**
```
Education:       YEAR–YEAR   Degree, Subject   Institution, City
Exhibitions:     YEAR        Title             Venue Name, City
Publications:    YEAR        'Article Title' in Publication Name, pp. XX–XX
Bibliography:    YEAR        Author, 'Title', Publication Name
Awards:          YEAR        Award Name, Organisation (outcome if not winner)
Residencies:     YEAR        Programme Name, Organisation, City
```

**Agent briefing format** — compressed for Art/Official system prompt:
```
EXHIBITION HISTORY:
Solo: [Title], [Venue] [City] [Year].
Group: [Title], [Venue] [City] [Year].
Fairs: [Name] [Year].
Prizes: [Name], [Org], [Year, outcome].
Residencies: [Name], [Org], [City] [Year].
Education: [Degree], [Institution] [City] [Year].
```
Agent receives 10 most recent events per section. Older events summarised as a count.

---

## 3. Dependent collections

### 3.1 Series

| Field | Type | Layer | Status | Definition |
|---|---|---|---|---|
| `name` | text | artist | NEW | Full series name. Required. |
| `slug` | text | agent | NEW | URL-safe. Keys series extension tab visibility in Artworks. |
| `description` | richText, localized | artist | NEW | Series description for the public series page. |
| `yearStart` | number | artist | NEW | Year the series began. |
| `yearEnd` | number | artist | NEW | Year concluded. Null if ongoing. |
| `city` | text | artist | NEW | Primary city associated with the series. |
| `country` | text | artist | NEW | Primary country. |
| `coverImage` | upload | artist | NEW | Series cover image. |
| `status` | select | artist | NEW | Values: `draft` \| `published`. |
| `seriesUntrackedEditionsNote` | text, localized | artist | NEW | Series-level prose for informal or unnumbered print runs not tracked per artwork in `ownershipRegistry`. |

### 3.2 SeriesEditionTiers

| Field | Type | Layer | Status | Definition |
|---|---|---|---|---|
| `series` | relation → Series | artist | NEW | Required. Top-level series or sub-series this tier belongs to. |
| `tierName` | text | artist | NEW | Display label, e.g. "Original edition", "Collectors print". |
| `tierOrder` | number | artist | NEW | Display order (1 = most exclusive). |
| `isOriginalTier` | checkbox | artist | NEW | True when this tier IS the original artwork (e.g. DCS monumental 3+1AP), not a print of it. |
| `editionSize` | number | artist | NEW | Numbered copies only — excludes AP count. |
| `apCount` | number | artist | NEW | Artist's proof count. Default 0. |
| `widthCm` | number | artist | NEW | Print width in centimetres. |
| `heightCm` | number | artist | NEW | Print height in centimetres. |
| `substrate` | text | artist | NEW | Physical support, e.g. Aluminium dibond. |
| `printTechnique` | select | artist | NEW | Values: `giclee` \| `screenprint` \| `lithograph` \| `etching` \| `other`. |
| `notes` | textarea | artist | NEW | Notes on this tier definition. |

### 3.3 Tags

| Field | Type | Layer | Status | Definition |
|---|---|---|---|---|
| `label` | text | artist | EXISTING | Display label. |
| `type` | select | artist | EXISTING | Values: `movement` \| `style` \| `subject` \| `genre` \| `period`. |
| `aatUri` | text (URI) | agent | NEW | Getty AAT URI. |
| `iconclassNotation` | text | agent | NEW | Iconclass notation for iconographic subject tags. |
| `lcshUri` | text (URI) | agent | NEW | Library of Congress URI. |
| `description` | text | artist | EXISTING | How this tag is used in this archive. |

### 3.4 ArtHistoricalReferences

| Field | Type | Layer | Status | Definition |
|---|---|---|---|---|
| `artworkTitle` | text | artist | NEW | Title of the referenced artwork. Required. |
| `artistName` | text | artist | NEW | Name of the artist who made the referenced work. Required. |
| `yearCreated` | number | artist | NEW | Year the referenced work was made. |
| `medium` | text | artist | NEW | Medium of the referenced work. |
| `institution` | text | artist | NEW | Institution where the work is held, if known. |
| `referenceUrl` | text (URL) | artist | NEW | URL to museum page, Wikidata entry, or authoritative record. |
| `wikidataUri` | text (URI) | agent | NEW | Wikidata URI for the referenced artwork. |
| `notes` | text | artist | NEW | Why this work is referenced — the specific connection to the practice. |

---

## 4. Artist singleton

One record. The complete identity, biographical, and contact record for Bernard Bolter. All multilingual fields use `localized: true` — no language-suffix variants anywhere.

### 4.1 Identity and external URIs

| Field | Type | Layer | Status | Definition |
|---|---|---|---|---|
| `name` | text | artist | EXISTING | Full name. Required. |
| `slug` | text | agent | NEW | URL-safe. Auto-generated. Used in JSON-LD and CV endpoint. |
| `ulanUri` | text (URI) | artist | EXISTING | Getty ULAN URI. Required for rich JSON-LD output. |
| `wikidataUri` | text (URI) | artist | EXISTING | Wikidata entity URI. |
| `careerStage` | select | artist | NEW | Values: `studio` \| `market` \| `institutional`. Default: `studio`. Gates tier visibility in Art/Official dialogue. |
| `primaryActorType` | select | artist | NEW | Values: `artist` \| `collector` \| `gallery` \| `artist-collector` \| `artist-gallery` \| `artist-collector-gallery`. |
| `actorRoles` | multi-select | artist | NEW | Values: `artist` \| `collector` \| `gallery`. All currently active roles. |

### 4.2 Biography variants

All richText (except `bioShort`), all `localized: true`. All drafted and maintained through Art/Official biography session.

| Field | Type | Layer | Status | Definition |
|---|---|---|---|---|
| `bioFull` | richText, localized | artist | NEW | Full biography. Public bio page, press kit, catalogue. |
| `bioMedium` | richText, localized | artist | NEW | Medium-length. Exhibition notes, about page, gallery submissions. |
| `bioShort` | text, localized | artist | NEW | Single sentence, third-person. Social profiles, fair listings. Plain text — not richText. |

### 4.3 Statement variants

All `localized: true`. Drafted and maintained through Art/Official statement session.

| Field | Type | Layer | Status | Definition |
|---|---|---|---|---|
| `statementFull` | richText, localized | artist | NEW | Full artist statement. Public statement page, press kit. |
| `statementMedium` | richText, localized | artist | NEW | Medium-length. Grant applications, exhibition proposals. |
| `statementShort` | text, localized | artist | NEW | One to two sentences. Fair listings, catalogue entries. Plain text. |

### 4.4 Practice note

| Field | Type | Layer | Status | Definition |
|---|---|---|---|---|
| `practiceNote` | richText, localized | artist | NEW | The *how* of making — materials, process, decisions that carry semantic weight. Starts empty. Populated gradually through Art/Official cataloguing sessions as it surfaces. Not prompted during biography or statement sessions — prompted after artwork upload when patterns in the work suggest something worth articulating. Feeds Art/Official knowledge pool. |

### 4.5 Credit and attribution

| Field | Type | Layer | Status | Definition |
|---|---|---|---|---|
| `creditLine` | text, localized | artist | NEW | Canonical attribution string: "Bernard Bolter, born [city], [year]. Lives and works in [city] and [city]." Reused across fair listings, catalogue entries, loan agreements. Art/Official drafts; rarely changes. |

### 4.6 Locations

Array. Holds the full geographic history of the practice. Replaces any single `studioCity` / `studioCountry` fields.

Each entry:
```
{
  city        text, required
  country     text, required
  type        select — studio | residence | live-work
  primary     boolean, default false
  current     boolean, default true
  startYear   number — optional, when this base was established
}
```

The "lives and works in" CV line is computed from entries where `current: true`, ordered with `primary: true` first. Supports multiple simultaneous locations: "Lives and works in Berlin and San Francisco."

JSON-LD `locationCreated` defaults to the primary current location when an artwork has no city of its own.

### 4.7 Contact

| Field | Type | Layer | Status | Definition |
|---|---|---|---|---|
| `publicEmail` | text | private | NEW | Contact form destination. Never rendered as raw text on public site — always behind a form. Private. |
| `website` | text | artist | NEW | Primary website URL. |
| `instagramUrl` | text | artist | NEW | Instagram profile URL. |
| `otherLinks` | array of `{ label: text, url: text }` | artist | NEW | Additional public links — Artsy, Artnet, Vimeo, etc. |

Studio street address is not stored on the Artist singleton. "Lives and works in [city]" is sufficient for all public-facing uses. Logistics addresses are handled privately outside this schema.

### 4.8 Education

Array. Ordered by `yearStart` descending on CV. Populated through Art/Official biography/onboarding session.

Each entry:
```
{
  institution   text, required
  degree        text — "MFA", "BFA", "Foundation Diploma"
  subject       text — "Fine Art", "Painting" — optional
  yearStart     number
  yearEnd       number — null if single year or ongoing
  city          text
  country       text
  cvVisible     boolean, default true
}
```

`cvVisible: false` keeps the entry in records but excludes it from the public CV. Useful for incomplete programmes or entries Bernard no longer wishes to show.

### 4.9 Selected collections

Array of institutional holdings for the CV selected collections section. Manually maintained. Separate from and simpler than the full `ownershipHistory` provenance chain on Artworks.

Each entry:
```
{
  institutionName   text, required
  city              text
  country           text
  acquisitionYear   number — optional
  cvVisible         boolean, default true
  sourceOfTruth     select — manual | derived, default manual
  linkedArtworkId   relation → Artworks — optional, for future derivation
}
```

**Current source of truth: `manual`.** Future state — when an `ownershipHistory` record on an Artwork has a confirmed institutional holding with `collectorVisible: true`, a background process can propose a `selectedCollections` entry and set `sourceOfTruth: derived`. The manual array remains authoritative for display until that derivation is confirmed. Both coexist — derivation never overwrites manual entries.

### 4.10 External identifiers

| Field | Type | Layer | Status | Definition |
|---|---|---|---|---|
| `externalIdentifiers` | array of objects | artist | NEW | Each: `{ type: select, value: text, verified: boolean }`. Type values: `website` \| `instagram` \| `artnet` \| `artsy` \| `wikidata` \| `ulan` \| `json-ld` \| `google-knowledge-graph`. Used for entity resolution across modules. |

---

## 5. Payload CMS implementation guide

### 5.1 Implementation order

Dependency order is strict. Do not reorder.

| Phase | Collection / Task | Why this order |
|---|---|---|
| 1 | **Artist singleton** | No dependencies. Required by JSON-LD in every other collection. |
| 1 | **Tags** | No dependencies. Required by Artworks classification fields. |
| 1 | **Series** | No dependencies. Required by `Artworks.series` relation. |
| 1 | **ArtHistoricalReferences** | No dependencies. Required by `Artworks.artHistoricalReferences`. |
| 2 | **Events (without artworks relation)** | Depends on Tags and Artist. Add `artworks` relation after Artworks exists. |
| 3 | **Artworks** | Depends on Tags, Series, ArtHistoricalReferences, Events, Artist. |
| 4 | **Add Events.artworks relation** | Now that Artworks exists, add the bidirectional relation. |
| 5 | **beforeChange hooks** | Dimension normalisation + computed fields on Artworks. |
| 6 | **Access control functions** | Field-level access control on private fields. |
| 7 | **JSON-LD generation** | Utility functions called in Next.js page components. |
| 8 | **AR background job** | USDZ/GLB generation triggered by `arEnabled`. |
| 9 | **pgvector + CLIP embeddings** | `CREATE EXTENSION IF NOT EXISTS vector` in Neon, then afterChange hook. |
| 10 | **CV page query** | `/api/cv/[artistSlug]` endpoint + `cv/page.tsx`. |
| 11 | **Art/Official stub** | Custom Payload admin view registered at `/admin/art-official`. Placeholder only — full implementation per `art-official-dialogue-spec.md`. |

### 5.2 What NOT to do

These constraints apply to every agent working on this implementation.

- `✗` Do not use free text fields where a structured type exists. Medium, series, city, support, condition, tags — all must be select or relation fields.
- `✗` Do not use language-suffix field variants anywhere. No `bioDE`, `descriptionDE`, `historicalContextEN`, or any variant of this pattern. All multilingual content uses `localized: true` on the field.
- `✗` Do not implement Artworks before Tags, Series, and Events collections exist.
- `✗` Do not add `Events.artworks` relation before Artworks collection exists.
- `✗` Do not compute `widthMm` / `heightMm` / `aspectRatio` at render time. Must be stored values computed by `beforeChange` hook on every save.
- `✗` Do not hardcode JSON-LD. All JSON-LD generated programmatically from stored fields.
- `✗` Do not output `creator` as a plain name string in JSON-LD. Must be a typed Person object with ULAN and Wikidata identifier URIs.
- `✗` Do not output `width` / `height` / `depth` as plain strings in JSON-LD. Must be `QuantitativeValue` objects with `unitCode`.
- `✗` Do not output `locationCreated` as a plain string. Must be a typed `Place` object with TGN `sameAs`.
- `✗` Do not store the Anthropic API key in the browser or in collection config. All Anthropic API calls happen server-side via Next.js API routes.
- `✗` Do not commit any artwork record without explicit artist confirmation.
- `✗` Do not generate `intent`, `makingNote`, `directInspiration`, `encounterNote`, `consciousRejections`, `formalContributionAssessment`, or `intentVsOutcome` from AI inference. These require genuine artist input.
- `✗` Do not make private fields readable by the public API. `askingPrice`, `salesRecord`, `ownershipHistory`, `loanHistory`, `priceNotes`, `provenanceConfidenceLayer` must always be role-restricted.
- `✗` Do not normalise image display. `sizeTier` and `orientation` must both apply simultaneously. Never override with uniform grid sizing or `object-cover`.
- `✗` Do not use Payload v2 collection config syntax. All collections must use v3 (Next.js App Router) config patterns.

### 5.3 Cursor prompt template

Use this structure when assigning each implementation step:

```
CURSOR AGENT PROMPT — STEP [N]: [Task name]

Read first:
- Section [X.Y] of artist-archive-schema-final.md — [relevant section title]
- Section 5.1 implementation order — do not create dependencies out of order
- art-official-dialogue-spec.md — for Art/Official steps only

Task:
Implement [specific scope]. Create or modify only the files listed below.
Do not touch other collections or utility files unless explicitly listed.

Files to create or modify:
- src/collections/[CollectionName].ts

Constraints:
- Use Payload v3 collection config syntax (not v2)
- All select field values must match exactly the values in the schema
- Private fields must have access: { read: artistOrAdmin } functions
- Multilingual fields must use localized: true — no language-suffix variants
- Do not store API keys in collection config — use process.env
- Relation fields must use the collection slug string, not a hardcoded import

Done when:
[Copy the completion test from cursor-implementation-plan-final.md Step [N]]
```

### 5.4 Expected file structure

```
src/
  collections/
    Artist.ts                     ← singleton
    Tags.ts                       ← dependent
    Series.ts                     ← dependent
    ArtHistoricalReferences.ts    ← dependent
    Events.ts                     ← primary
    Artworks.ts                   ← primary
    PracticeKnowledge.ts          ← Art/Official knowledge base
    Sessions.ts                   ← Art/Official session records
  hooks/
    artworkBeforeChange.ts        ← dimension normalisation + computed fields
    artworkAfterChange.ts         ← CLIP embedding generation (async)
    arGenerationJob.ts            ← USDZ/GLB generation background job
  utilities/
    generateArtworkJsonLd.ts
    generateEventJsonLd.ts
    generateClipEmbedding.ts
    accessControl.ts              ← artistOrAdmin + isPublished helpers
    fractionToDecimal.ts          ← parses '3/16' → 0.1875
    cvQuery.ts                    ← CV assembly query utility
  app/
    (admin)/
      art-official/               ← custom Payload admin view
    (public)/
      artworks/[slug]/page.tsx
      events/[slug]/page.tsx
      cv/page.tsx
  payload.config.ts
```

---

*Artist Archive Schema — Final Version · May 2026*
*Developed in dialogue: Bernard Bolter × Claude*
*Supersedes: master-schema-spec.md, art-archive-schema-v01.md, art-archive-schema-v02.md, artwork-schema-spec.docx, schema-extension-collector-ar.md*
*Read alongside: art-official-dialogue-spec.md, cursor-implementation-plan-final.md, system-philosophy-and-art-history.md*
