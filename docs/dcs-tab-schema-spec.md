# DCS Tab — Schema Specification
## Digital City Series Extension · Artworks Collection · DCSCapturePhotos Sub-Collection
*May 2026 · Developed in dialogue: Bernard Bolter × Claude*

This document specifies the Digital City Series (DCS) extension to the Artworks collection in Payload CMS, and the companion `DCSCapturePhotos` sub-collection. Read the master schema spec (`master-schema-spec.md`) in full before implementing anything here. This document follows the same conventions for Layer, Field Type, and Status.

The DCS tab is conditionally visible in the Payload admin only when `series.slug === 'digital-city-series'`. All fields in this document are `NEW` unless otherwise noted.

---

## Layer and field type key

**Layer:**
- `artist` — entered by Bernard; must be confirmed before record is committed
- `agent` — filled computationally or by inference; shown for artist review
- `private` — role-restricted to artist and admin; never returned in public API responses
- `system` — infrastructure; not displayed in public UI

**Field Type:**
- `CORE` — foundational identity and descriptive data
- `INTENT` — artist-authored, unmediated
- `RELATIONAL` — connections across works, collections, and external records
- `COMPUTED` — maintained programmatically; never entered manually
- `TEMPORAL` — time-aware; holds change over time
- `SYSTEM` — infrastructure for sync, webhooks, and external integrations

---

## 0. Implementation Notes for Cursor Agents

Read before writing any collection config.

### 0.1 Tab visibility

The DCS tab must be conditionally rendered using Payload's `admin.condition` on the tab:

```typescript
{
  label: 'Digital City Series',
  admin: {
    condition: (data) => data?.series?.slug === 'digital-city-series'
  },
  fields: [ /* all DCS fields */ ]
}
```

If `series` is not yet populated on a new record, the tab should not appear.

### 0.2 Implementation order

| Phase | Task |
|---|---|
| 1 | Create `DCSCapturePhotos` collection (no dependencies beyond Artworks) |
| 2 | Add DCS tab to Artworks collection with all field groups below |
| 3 | Add `capturePhotos` relation field to the DCS tab (after DCSCapturePhotos exists) |
| 4 | Add Vendure sync fields (see separate Vendure sync spec — deferred) |

### 0.3 Constraints

- ✗ Do not add DCS fields to the base Artworks schema — they belong only in this tab
- ✗ Do not make `editionsRemaining` manually editable — it is webhook-maintained (see section 4)
- ✗ Do not duplicate fields that already exist in the base schema (`city`, `country`, `primaryImage`, `captureYear` maps to `yearCreated`) — reference them, don't repeat them
- ✗ Do not store pricing or inventory as the source of truth — Vendure owns that; the archive holds reference data and a synced remaining count only
- ✗ `vendureProductId` fields are the foreign keys between systems — treat them as immutable once set

### 0.4 Expected file changes

```
src/collections/Artworks.ts         ← add DCS tab
src/collections/DCSCapturePhotos.ts ← new sub-collection
src/hooks/vendureSync.ts            ← webhook handler (deferred — see separate spec)
```

---

## 1. DCS Tab — Field Groups

The tab is divided into six logical groups, each implemented as a Payload `collapsible` row group in the admin UI.

---

### 1.1 Capture & Journey

Fields documenting the physical skate mission that generated the source material for this city.

> Note: `city` and `yearCreated` from the base Artworks schema serve as the capture city and year. Do not duplicate them here.

| Field | Type | Layer | Field Type | Definition |
|---|---|---|---|---|
| `captureDistanceKm` | number | artist | CORE | Total distance skated during the capture mission in kilometres. Storytelling detail — surfaces on the public artwork page. |
| `captureDays` | number | artist | CORE | Number of days spent on the ground capturing this city. |
| `captureImageCount` | number | artist | CORE | Total number of raw photographs taken during the mission. Underscores the scope of the data harvest. |
| `captureRouteGpx` | upload | artist | CORE | Raw GPX file exported from GPS tracker. Powers the animated route map on the web and provides the coordinate data for photo georeferencing. |
| `captureRouteMapUrl` | text (URL) | artist | CORE | Fallback embed URL (Google Maps, Felt, or similar) if GPX is unavailable or not yet processed. |
| `captureAmbientAudioUrl` | text (URL) | artist | CORE | Link to ambient audio recorded during the mission. Hosted externally (SoundCloud, direct file). |
| `captureBRollVideoUrl` | text (URL) | artist | CORE | Link to street video B-roll footage from the mission. Used in web experience and process documentation. |
| `captureJourneyNote` | longText | artist | INTENT | Artist's account of the mission — what the city felt like to skate, what was unexpected, what shaped the eventual composition choices. First-person, informal. |
| `capturePhotos` | relation[] → DCSCapturePhotos | artist | RELATIONAL | All individual street photographs taken during the mission for this city. Reverse side of `DCSCapturePhotos.parentArtwork`. Add after DCSCapturePhotos collection exists. |

---

### 1.2 Composition

Fields documenting the Smoothist composition process — how the raw capture data was synthesized into the final artwork.

> Note: `primaryImage` in the base schema serves as the main Smoothist composition image (what the business plan calls the "Meso"). Do not duplicate it here.

| Field | Type | Layer | Field Type | Definition |
|---|---|---|---|---|
| `streetPhotoImage` | upload | artist | CORE | The selected decisive-moment street photograph. One image chosen from the full capture set of up to 40. This is what the business plan calls the "Micro." |
| `streetPhotoCaption` | text | artist | CORE | Where and when this moment was captured, and why it was selected. |
| `satelliteViewImage` | upload | artist | CORE | The satellite or aerial image of the city providing geographic context and grand scale. This is what the business plan calls the "Macro." |
| `satelliteViewAltText` | text | agent | CORE | Accessible alt text for the satellite image. Agent drafts; artist confirms. |
| `sceneCount` | number | artist | CORE | Number of panoramic scenes blended into the final Smoothist composition. Between 2 and 4 per the process description. |
| `compositionNarrative` | longText | artist | INTENT | Artist's account of which scenes were chosen for blending and why — the curatorial reasoning behind the final composition. Drawn out through Art/Official dialogue. |
| `homieAIPhaseUsed` | select | artist | CORE | Which phase of the Homie AI was active during this composition. Values: `manual-only` \| `phase-1-sorting` \| `phase-2-curation` \| `phase-3-blending`. Documents the AI development arc across the body of work. |
| `compositionProcessVideoUrl` | text (URL) | artist | CORE | Screen recording or timelapse of the composition session in Photoshop. Used on the web artwork page to show process. Also the content served by the composition-layer AR on the physical print. |
| `compositionAudioCommentaryUrl` | text (URL) | artist | INTENT | Narrated audio of the composition decisions recorded during the session. Primary training data for future Homie AI phases. Also usable as an audio guide on the web. |

---

### 1.3 City Context

Contextual fields that give each city its own voice on the artwork page — turning the work from a print into a portrait.

| Field | Type | Layer | Field Type | Definition |
|---|---|---|---|---|
| `cityPortraitEN` | longText | artist | INTENT | A short piece of writing about this city's character — what it felt like, what was distinctive, what the skateboard revealed that a tourist wouldn't see. English. |
| `cityPortraitDE` | longText | artist | INTENT | German translation of `cityPortraitEN`. |
| `cityWikidataUri` | text (URI) | agent | SYSTEM | Wikidata entity URI for the city. Agent suggests. Extends `cityTgnUri` from the base schema for richer linked data output. |
| `cityPopulation` | number | agent | CORE | City population at time of capture. Adds scale context to the satellite view. Agent fills from Wikidata; artist confirms. |
| `capturedNeighborhoods` | text[] | artist | CORE | Neighbourhoods that appear in the composition or feature prominently in the capture set. Searchable and displayable as tags on the city page. |

---

### 1.4 Edition Tiers

Each DCS artwork has up to four distinct edition tiers. Each tier is a separate Vendure product. This array is the archival record of what exists — Vendure is the source of truth for pricing, variants, and checkout.

`editionTiers` is an **array of objects**. Each object represents one edition tier for this artwork.

#### editionTiers array — object shape

| Field | Type | Layer | Field Type | Definition |
|---|---|---|---|---|
| `tierName` | select | artist | CORE | Values: `small-print` \| `collectors-print` \| `monumental` \| `oil-painting`. |
| `totalEditionSize` | number | artist | CORE | The fixed, permanent edition size. Never changes after publication. Small print: 200. Collectors: 6. Monumental: 3. Oil painting: 1 (unique). |
| `printSubstrate` | select | artist | CORE | Values: `paper` \| `aluminum-mount` \| `canvas` \| `oil-on-canvas`. Archival record of physical format. |
| `includesSupportingPrints` | boolean | artist | CORE | Whether this tier ships with the two supporting prints (street photo + satellite view). Per the business plan, the small print does. |
| `vendureProductId` | text | system | SYSTEM | The Vendure product ID for this tier. Foreign key linking the archive to the shop. Set once when the Vendure product is created. Immutable after that. |
| `editionsRemaining` | number | system | COMPUTED | Current remaining stock. Maintained exclusively by the Vendure webhook sync — never edited manually. Initialised to `totalEditionSize` when the Vendure product is first linked. |
| `editionsRemainingUpdatedAt` | date | system | COMPUTED | Timestamp of the last successful webhook sync for this tier. Allows monitoring of webhook health. |
| `tierAvailabilityStatus` | select | system | COMPUTED | Values: `available` \| `sold-out` \| `not-yet-listed` \| `not-for-sale`. Auto-updated by webhook when `editionsRemaining` reaches 0. Can be manually set to `not-yet-listed` or `not-for-sale` before Vendure product exists. |

#### Admin UI note

Render `editionsRemaining`, `editionsRemainingUpdatedAt`, and `tierAvailabilityStatus` as read-only in the Payload admin. These fields are webhook-maintained and must not be manually editable. Use `admin.readOnly: true` on these fields within the array.

#### Example editionTiers structure

```json
[
  {
    "tierName": "small-print",
    "totalEditionSize": 200,
    "printSubstrate": "paper",
    "includesSupportingPrints": true,
    "vendureProductId": "prod_abc123",
    "editionsRemaining": 187,
    "editionsRemainingUpdatedAt": "2026-05-17T09:00:00Z",
    "tierAvailabilityStatus": "available"
  },
  {
    "tierName": "collectors-print",
    "totalEditionSize": 6,
    "printSubstrate": "aluminum-mount",
    "includesSupportingPrints": true,
    "vendureProductId": "prod_def456",
    "editionsRemaining": 4,
    "editionsRemainingUpdatedAt": "2026-05-17T09:00:00Z",
    "tierAvailabilityStatus": "available"
  },
  {
    "tierName": "monumental",
    "totalEditionSize": 3,
    "printSubstrate": "aluminum-mount",
    "includesSupportingPrints": true,
    "vendureProductId": "prod_ghi789",
    "editionsRemaining": 3,
    "editionsRemainingUpdatedAt": "2026-05-17T09:00:00Z",
    "tierAvailabilityStatus": "available"
  }
]
```

---

### 1.5 Oil Painting Collaboration

Oil paintings are unique works with their own commercial and relational structure, separate from the print editions. Each is a collaboration with a Da Fen artist.

| Field | Type | Layer | Field Type | Definition |
|---|---|---|---|---|
| `hasOilPainting` | boolean | artist | CORE | Whether an oil painting collaboration exists for this city. Gates visibility of the remaining fields in this group in the admin UI. |
| `oilPaintingArtistName` | text | artist | CORE | The collaborating Da Fen artist's name. |
| `oilPaintingArtistBio` | richText | artist | CORE | Short biography of the collaborating artist. Surfaces on the dedicated artist section of the DCS site. |
| `oilPaintingArtistUrl` | text (URL) | artist | CORE | Link to the collaborating artist's gallery, website, or Instagram. |
| `oilPaintingImage` | upload | artist | CORE | Photograph of the finished painting. |
| `oilPaintingDimensionsCm` | text | artist | CORE | Dimensions as a display string, e.g. `'100 × 100 cm'`. |
| `oilPaintingCollaborationStory` | longText | artist | INTENT | The story of how this specific collaboration came about. The Da Fen narrative layer — what was discussed, what interpretive decisions the artist made, what surprised you. First-person. |
| `oilPaintingVendureProductId` | text | system | SYSTEM | Vendure product ID for the oil painting if listed for sale. Separate from the `editionTiers` array since paintings are unique works, not editions. |
| `oilPaintingAvailabilityStatus` | select | artist | CORE | Values: `available` \| `sold` \| `in-progress` \| `not-for-sale`. Manually maintained — not webhook-driven, since edition size is 1. |

---

### 1.6 DCS100 Subscription

Fields tracking each artwork's relationship to the DCS100 monthly subscription programme.

| Field | Type | Layer | Field Type | Definition |
|---|---|---|---|---|
| `dcs100MonthYear` | text | artist | CORE | The monthly drop this artwork is attached to. Format: `YYYY-MM`, e.g. `'2025-03'`. Used to group and sequence the subscription archive. |
| `dcs100IsDelivered` | boolean | artist | CORE | Whether this month's shipment has been dispatched to subscribers. |
| `dcs100TierAvailability` | multi-select | artist | CORE | Which subscription tiers received this work. Values: `cornerstone` \| `arch-stone` \| `capstone`. |
| `zineEditionSize` | number | artist | CORE | Edition size of the city zine. Default 30 per the "30 for 30" release strategy. |
| `zineAvailable` | boolean | artist | CORE | Whether the zine is currently available as a newsletter lead magnet. |
| `zineVendureProductId` | text | system | SYSTEM | Vendure product ID for the zine if listed. |

---

### 1.7 Digital Certificate & DAAAH

Fields supporting the Digital Archive and Auction House resale platform. The certificate is issued at first sale; DAAAH fields track resale market activity.

| Field | Type | Layer | Field Type | Definition |
|---|---|---|---|---|
| `certificateId` | text | system | SYSTEM | Unique certificate identifier. Auto-generated on first publication. Format: `DCS-[CITY-CODE]-[EDITION-TIER]-[SEQUENCE]`, e.g. `DCS-BER-SP-042`. |
| `certificateRegistryUrl` | text (URL) | system | COMPUTED | Public URL where ownership of this specific work can be verified. Generated from `certificateId`. |
| `daaahListingStatus` | select | artist | CORE | Values: `not-listed` \| `active-listing` \| `sold-on-daaah` \| `reserved`. Tracks this work's presence on the DAAAH resale platform. |
| `daaahListingPriceEur` | number | artist | CORE | Asking price if currently listed on DAAAH. In EUR. |
| `daaahSaleHistory` | array of objects | system | TEMPORAL | Resale transaction log. Each: `{ date, salePriceEur, buyerCity }`. Builds the public price history that drives future valuation signals. |

---

## 2. DCSCapturePhotos — Sub-Collection

Each DCS artwork has up to 40 individual street photographs taken during the skate mission. These are the raw evidence of the journey. The Micro (street photo) selected for the composition is one of these — flagged by `isMicroSelection`. This collection lives separately from the Artwork record to keep the parent record clean and to allow each photo to carry its own metadata.

### 2.1 Identity

| Field | Type | Layer | Field Type | Definition |
|---|---|---|---|---|
| `parentArtwork` | relation → Artworks | artist | RELATIONAL | The DCS city composition this photo belongs to. Required. |
| `image` | upload | artist | CORE | The photograph itself. High-res archival upload. |
| `captureSequenceNumber` | number | artist | CORE | Position in the journey sequence, 1–40. Preserves the order the photos were taken. |
| `isMicroSelection` | boolean | artist | CORE | Whether this is the photograph selected as the Micro street photo for the final composition. Only one photo per parentArtwork should have this set to true. |
| `status` | select | artist | SYSTEM | Values: `draft` \| `published`. Default: draft. |

### 2.2 Location & Time

| Field | Type | Layer | Field Type | Definition |
|---|---|---|---|---|
| `captureTimestamp` | dateTime | artist | CORE | Exact date and time the photo was taken. Enables syncing the photo to its position on the animated route timeline on the web. |
| `gpsLat` | number | artist | CORE | Latitude where the photo was taken. Drawn from EXIF data or GPS tracker log. |
| `gpsLng` | number | artist | CORE | Longitude where the photo was taken. |
| `neighborhood` | text | artist | CORE | Which neighbourhood or district of the city this photo was taken in. |

### 2.3 Description & Context

| Field | Type | Layer | Field Type | Definition |
|---|---|---|---|---|
| `captureNote` | text | artist | INTENT | Artist's note on this moment — what was happening, why the shot was taken, what it captures about the city. Short, informal. |
| `altText` | text | agent | CORE | Accessible alt text. Agent drafts from image analysis; artist confirms. |

### 2.4 AR Moment Reconstruction (Deferred)

These fields support the planned AR feature: homing in on the exact GPS point and timestamp of the Micro photo and reconstructing 2 seconds before and after using AI. Stubbed here for future implementation — do not build now.

| Field | Type | Layer | Field Type | Status | Definition |
|---|---|---|---|---|---|
| `arReconstructionBefore` | upload or URL | agent | COMPUTED | DEFERRED | AI-generated frame representing approximately 2 seconds before this moment. |
| `arReconstructionAfter` | upload or URL | agent | COMPUTED | DEFERRED | AI-generated frame representing approximately 2 seconds after this moment. |
| `arReconstructionVideoUrl` | text (URL) | agent | COMPUTED | DEFERRED | Short video clip if the reconstruction is rendered as motion rather than stills. |
| `arReconstructionStatus` | select | system | SYSTEM | DEFERRED | Values: `pending` \| `in-progress` \| `complete`. Tracks AI reconstruction pipeline progress per photo. |

---

## 3. Admin UI Notes

### 3.1 DCS tab field group order

Implement the six groups in this order within the tab, each as a collapsible Payload row group:

1. Capture & Journey
2. Composition
3. City Context
4. Edition Tiers
5. Oil Painting Collaboration (conditionally collapsed if `hasOilPainting` is false)
6. DCS100 Subscription
7. Digital Certificate & DAAAH

### 3.2 Read-only computed fields

The following fields must be rendered as `admin.readOnly: true`. They are maintained by webhooks or system processes and must never be manually editable:

- `editionTiers[].editionsRemaining`
- `editionTiers[].editionsRemainingUpdatedAt`
- `editionTiers[].tierAvailabilityStatus`
- `certificateId`
- `certificateRegistryUrl`
- `daaahSaleHistory`

### 3.3 Conditional visibility

| Condition | Fields to show/hide |
|---|---|
| `hasOilPainting === false` | Collapse the entire Oil Painting Collaboration group |
| `editionTiers[].tierName === 'oil-painting'` | Hide `includesSupportingPrints` (not applicable) |
| `daaahListingStatus !== 'active-listing'` | Hide `daaahListingPriceEur` |

---

## 4. Vendure Webhook Sync — Overview (Implementation Deferred)

Full spec in separate document: `dcs-vendure-sync-spec.md` (to be written).

Summary for context: when an order completes in Vendure, a webhook fires to a Payload API endpoint. The handler finds the matching artwork by `vendureProductId` within the `editionTiers` array, decrements `editionsRemaining` by the quantity sold, updates `editionsRemainingUpdatedAt`, and sets `tierAvailabilityStatus` to `sold-out` if remaining reaches 0.

The endpoint will live at: `POST /api/dcs/vendure-sync`

Do not implement this now. Stub the endpoint file only if needed for type safety.

---

## 5. Verify Checklist

After implementation, verify the following before committing:

- [ ] DCS tab is invisible on artworks where `series.slug !== 'digital-city-series'`
- [ ] DCS tab appears correctly on a DCS artwork record
- [ ] `editionTiers` array accepts multiple entries with different `tierName` values
- [ ] `editionsRemaining`, `editionsRemainingUpdatedAt`, and `tierAvailabilityStatus` are read-only in the admin UI
- [ ] `DCSCapturePhotos` collection is visible in the admin
- [ ] A capture photo record can be created and linked to a parent DCS artwork
- [ ] `isMicroSelection` can be set on one photo record
- [ ] `capturePhotos` relation on the DCS tab shows linked photos for a given city
- [ ] Oil Painting group collapses when `hasOilPainting` is false
- [ ] `GET /api/artworks/[slug]` as unauthenticated request does not expose `vendureProductId` fields (set appropriate access control)
- [ ] AR reconstruction fields in DCSCapturePhotos are present in the schema but not rendered in the admin UI (deferred)

---

*DCS Tab Schema Specification · bernardbolter.com · May 2026 · Developed in dialogue: Bernard Bolter × Claude*
