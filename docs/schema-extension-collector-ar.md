# Schema Extension — Collector Layer + AR + Record Origin
## Artworks Collection · Addendum to master-schema-spec.md
*May 2026 · Bernard Bolter × Claude*

This document specifies the fields to be added to the existing Artworks collection and Sessions collection to support the collector use case, AR placement, and record origin tracking. All fields are additive — nothing in the existing schema changes. The agent is the filter; dormant fields are silently skipped in dialogue based on session type.

---

## 1. Record Origin

The single most important new field. Set once at record creation, never changed. Makes the provenance of the record itself explicit without querying the Sessions collection.

**Add to Artworks collection:**

| Field | Type | Default | Notes |
|---|---|---|---|
| `recordOrigin` | select | `artist-catalogued` | `artist-catalogued` / `collector-catalogued` / `migrated` / `enrichment-agent` |

**Rules:**
- `artist-catalogued` — record created via Art/Official `artwork-cataloguing` session. Artist is cataloguing their own work.
- `collector-catalogued` — record created via Art/Official `collector-cataloguing` session. Collector is cataloguing an acquired work.
- `migrated` — record imported from an existing system (Artbutler, spreadsheet, CSV). No session transcript exists. Fields populated manually or via import script.
- `enrichment-agent` — stub record created by background enrichment process from public sources. No human session. All values `confidence: inferred`.

**Distinguishing artist vs collector records without this field** — possible by querying the linked session's `sessionType`, but requires a join. `recordOrigin` makes it a first-class field on the record itself, available without traversal. Both mechanisms coexist.

---

## 2. Sessions Collection — New Session Type

**Add to `sessionType` select field:**

```
'collector-cataloguing'
```

Full updated select options:
`artwork-cataloguing` | `collector-cataloguing` | `artist-statement` | `biography` | `onboarding`

**Add to Sessions collection identity fields:**

| Field | Type | Notes |
|---|---|---|
| `collectorId` | relation → Collector | Populated when `sessionType: collector-cataloguing`. Null for all other session types. Mirrors `artistId`. |

---

## 3. Collector Layer Fields — Artworks Collection

These fields are dormant in `artwork-cataloguing` sessions. They are active only in `collector-cataloguing` sessions. The agent silently skips them when cataloguing an artist's own work.

### 3.1 Provenance — acquisition context

| Field | Type | Notes |
|---|---|---|
| `acquisitionYear` | integer | Year work entered this collection. Core corpus field — positions the acquisition on the artist's recognition curve. |
| `acquisitionChannel` | select | `direct-from-artist` / `dealer` / `auction` / `art-fair` / `gift` / `estate` / `other` |
| `dealerSource` | text | Name of dealer, gallery, or auction house. Structured text, not a relation — dealers are not always on the platform. |
| `dealerLocation` | text | City / country of dealer. Geographic distribution data for corpus. |
| `priorOwner` | text | Previous owner if known. 'Private collection' acceptable. Part of provenance chain. |
| `acquisitionPrice` | decimal | Private. Optional. Never surfaces in public record. Insurance and estate use only. |
| `acquisitionCurrency` | select | EUR / GBP / USD / other. |
| `certificationDocs` | text | What documentation exists: COA, receipt, invoice, correspondence. Free text list. |
| `saleHandoffReceived` | boolean | Was an Art/Official record received from the artist at point of sale? Default false. Future field — enables automatic import when both parties are on platform. |

### 3.2 Corpus layer — recognition signal

These are the fields that make the collector record meaningful for the three-signal corpus. All populated through collector session dialogue — never form-filled. The agent draws them out conversationally.

| Field | Type | Notes |
|---|---|---|
| `artistRecognitionAtAcquisition` | select | `unknown` / `local-known` / `nationally-known` / `internationally-known` / `institutionally-validated`. State of artist's visibility at the moment of acquisition. Combined with `acquisitionYear` this is the core corpus signal. |
| `priorExhibitionAtAcquisition` | text | Had the work been exhibited before this acquisition? Where? Calibrates recognition curve position. Drawn out conversationally. |
| `encounterContext` | select | `studio-visit` / `dealer-recommendation` / `art-fair` / `online` / `gift` / `other`. How the collector encountered this specific work. |
| `whyThisWork` | longText | The collector's unmediated recognition account. The most valuable field in the corpus layer. Drawn out through dialogue only — never asked directly, never form-filled. Equivalent to `intent` on the artist side. |
| `collectorArtistRelationship` | select | `none` / `aware-of-practice` / `personal-relationship`. Indicates degree of mediation in the acquisition. |
| `documentationPhotoContext` | text | Note if primary image is an in-situ snapshot. Treated as provenance data, not documentation failure. Note EXIF data availability (location, timestamp). |

### 3.3 Linked records

| Field | Type | Notes |
|---|---|---|
| `linkedArtistRecord` | relation → Artworks | Points to the artist's own Art/Official record for this work, if they are on the platform. Enables corpus connection across the two accounts of the same object. Populated manually or via sale handoff. |
| `linkedCollectorId` | relation → Collector | Which collector holds this work. Populated automatically in collector session. |

---

## 4. Provenance — Existing Field Extension

The existing `ownershipHistory` field starts from studio origin in artist sessions. For collector sessions cataloguing a work where studio provenance is unknown, the first entry should be marked explicitly rather than left empty.

**Add a `provenanceOriginKnown` boolean field:**

| Field | Type | Default | Notes |
|---|---|---|---|
| `provenanceOriginKnown` | boolean | true | Set to false when studio-to-collector chain is not traceable. Makes uncertainty explicit rather than leaving `ownershipHistory` with a misleading first entry. Works with existing `provenanceConfidenceLayer`. |

---

## 5. AR Layer Fields — Artworks Collection

Added to both artist and collector records. The AR model is generated server-side from the artwork image and physical dimensions. No 3D modelling required for flat works on paper or canvas.

### 5.1 AR configuration

| Field | Type | Default | Notes |
|---|---|---|---|
| `arEnabled` | boolean | false | Opt-in per record. Requires accurate dimensions and at least one high-quality image. |
| `arWidthM` | decimal | null | Width in metres for AR model. Computed from `widthCm` / 100. Override available if framed vs unframed measurement differs. |
| `arHeightM` | decimal | null | Height in metres. Computed from `heightCm` / 100. |
| `arDepthM` | decimal | null | Depth in metres. Relevant for framed works — affects wall projection offset. |
| `arModelUrl` | text | null | URL to generated `.usdz` file in object storage. Generated server-side on demand. Regenerated when image or dimensions change. |
| `arModelGlbUrl` | text | null | URL to `.glb` file for Android Scene Viewer. Generated alongside USDZ. |
| `arAllowScaling` | boolean | true | Whether viewer can resize the AR model. Set false for works where correct scale is important to the experience. Passed as `allowsContentScaling` fragment param to iOS Quick Look. |
| `arLastGenerated` | date | null | Timestamp of last USDZ/GLB generation. Used to detect stale models when image or dimensions update. |

### 5.2 AR generation logic (implementation note for Cursor)

The USDZ generation process runs as a background job triggered when `arEnabled` is set to true and both `primaryImage` and physical dimensions are present.

**Generation inputs:**
- `primaryImage` — the artwork's main image, fetched from Payload media
- `arWidthM`, `arHeightM`, `arDepthM` — dimensions in metres
- Artist name and title — embedded as metadata in the USDZ

**Generation output:**
- A flat rectangular plane mesh, textured with the artwork image, dimensioned in real-world metres
- For framed works with `arDepthM > 0`, a simple box geometry with the image on the front face
- Saved to S3 (or equivalent object storage) and URL written to `arModelUrl`
- GLB equivalent generated for Android, URL written to `arModelGlbUrl`

**Web implementation (HTML):**

iOS Quick Look requires this exact structure — `rel="ar"` on the anchor, image tag as first child:

```html
<a rel="ar" href="/media/ar/artwork-slug.usdz#allowsContentScaling=0&canonicalWebPageURL=https://site.com/works/slug">
  <img src="/media/artwork-preview.jpg" alt="View in AR">
</a>
```

For cross-platform support use `<model-viewer>` web component:

```html
<model-viewer
  src="/media/ar/artwork-slug.glb"
  ios-src="/media/ar/artwork-slug.usdz"
  ar
  ar-modes="webxr scene-viewer quick-look"
  camera-controls
  alt="Artwork title — view in your space">
</model-viewer>
```

**MIME type requirement:** USDZ files must be served with `Content-Type: model/vnd.usdz+zip`. Set on S3 object metadata or via server config.

**Gotchas:**
- Quick Look only launches from Safari and SFSafariViewController. Facebook/Instagram in-app browsers use their own WKWebView and will not trigger it.
- The anchor must be tapped directly by the user — Quick Look cannot be triggered programmatically except via a tap event handler.
- On desktop, Safari downloads the USDZ file. Serve a QR code fallback for desktop visitors.
- `allowsContentScaling=0` disables pinch-to-resize. Recommended for works where scale matters.

---

## 6. New Collections Required

### 6.1 Collector collection

Mirrors the Artist singleton. One record per collector account on the platform.

| Field | Type | Notes |
|---|---|---|
| `collectorId` | text | Auto-generated UUID. |
| `name` | text | Collector or collection name. |
| `collectionName` | text | Named collection if different from collector name. e.g. 'The Berlin Collection'. |
| `collectionFocus` | text | What the collection concentrates on — medium, period, geography, movement. Populated via onboarding session. |
| `dealerRelationships` | text | Key dealer relationships. Relevant for encounter context across the collection. |
| `acquisitionContext` | text | General context for how works enter the collection — art fair circuit, studio relationships, etc. |
| `platformRelationship` | select | `artist-also` / `collector-only`. Whether this account holder is also an artist on the platform. |
| `collectionKnowledgeBase` | relation → CollectionKnowledge | Links to the knowledge base documents used to brief the Art/Official collector session. |

### 6.2 CollectionKnowledge collection

Mirrors PracticeKnowledge. Documents that brief the Art/Official agent at the start of a collector session. Same structure — slug, section label, content, status, order.

| Slug | Section label | Content |
|---|---|---|
| `collector-biography` | COLLECTION KNOWLEDGE — COLLECTOR | Who the collector is, their background, relationship to art |
| `collection-focus` | COLLECTION KNOWLEDGE — FOCUS | What the collection concentrates on, how it developed |
| `dealer-relationships` | COLLECTION KNOWLEDGE — DEALERS | Key dealers, galleries, advisors the collector works with |
| `acquisition-context` | COLLECTION KNOWLEDGE — ACQUISITION | How works typically enter the collection, the collector's process |
| `collection-overview` | COLLECTION KNOWLEDGE — OVERVIEW | Current state of the collection — scale, medium mix, geographic spread |

---

## 7. Session Type Routing Logic

The `sessionType` field on Sessions determines which knowledge base is loaded and which field roadmap is active. This lives entirely in the API route — no schema changes beyond the new session type value.

| sessionType | Knowledge base loaded | Field roadmap | Artist-layer fields |
|---|---|---|---|
| `artwork-cataloguing` | PracticeKnowledge | Artist full roadmap (Tier 1–3) | Active |
| `collector-cataloguing` | CollectionKnowledge | Collector roadmap | Dormant — never asked |
| `artist-statement` | PracticeKnowledge | Statement only | Active |
| `biography` | PracticeKnowledge | Biography only | Active |
| `onboarding` | None (building it) | Onboarding protocol | Active |

**Collector roadmap field sequence (approximate):**

1. Image upload + basic identity (artist, title, year, series, edition)
2. Physical (medium, support, dimensions — confirm or correct from image analysis)
3. Provenance (acquisition year, channel, dealer — practical questions, quick)
4. Encounter context (how did you come across this — drawn out conversationally)
5. Recognition context (what was the artist's situation at the time — indirect approach)
6. Why this work (the core signal — never asked directly, emerges from the conversation)
7. Condition and location (practical close)
8. AR enablement prompt (do you want to view this in your space?)
9. Confirmation

The agent never mentions corpus signals, recognition data, or the system's larger purpose. The micro is: catalogue your collection, it's not boring, the photograph problem is handled. The macro is present but never foregrounded.

---

## 8. Summary — What Changes Where

**Artworks collection — new fields:**
`recordOrigin`, `acquisitionYear`, `acquisitionChannel`, `dealerSource`, `dealerLocation`, `priorOwner`, `acquisitionPrice`, `acquisitionCurrency`, `certificationDocs`, `saleHandoffReceived`, `artistRecognitionAtAcquisition`, `priorExhibitionAtAcquisition`, `encounterContext`, `whyThisWork`, `collectorArtistRelationship`, `documentationPhotoContext`, `linkedArtistRecord`, `linkedCollectorId`, `provenanceOriginKnown`, `arEnabled`, `arWidthM`, `arHeightM`, `arDepthM`, `arModelUrl`, `arModelGlbUrl`, `arAllowScaling`, `arLastGenerated`

**Sessions collection — changes:**
`sessionType` select gets new value `collector-cataloguing`. New `collectorId` relation field added.

**New collections:**
`Collector`, `CollectionKnowledge`

**No changes to:**
Physical fields (dimensions, medium, support, framing, condition), classification fields, intent/artist-layer fields, tier system, provenance confidence layer, image analysis pipeline, CLIP embeddings, existing session types, existing knowledge base architecture.

---

*Schema Extension v1.0 — May 2026*
*To be implemented after existing Artworks and Sessions collections are stable.*
*Read alongside master-schema-spec.md and art-official-dialogue-spec.md.*
