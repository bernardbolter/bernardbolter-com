# Cursor Implementation Plan — v2
## bernardbolter.com · Full Schema + Art/Official Build
*May 2026 · Updated to include Collector, Gallery, Event, AR, and Entity Resolution layers*

---

## How to use this document

This is a two-pass document. Pass it to a high-level model first (Opus or similar) to break each phase into atomic tasks. Then hand each atomic task to the auto model for implementation. Every phase has a clear completion test so the auto model knows when a step is done before moving to the next.

Read the full document before starting. The phases are ordered by dependency — each one assumes the previous is complete and stable.

**Reference documents (all in the bernardbolter project):**
- `master-schema-spec.md` — canonical field names, types, access control
- `art-official-dialogue-spec.md` — full Art/Official agent specification
- `art-official-handoff.md` — architectural overview and stack
- `schema-extension-collector-ar.md` — collector layer, AR fields, record origin
- `cursor-implementation-plan-v2.md` — this document

---

## Phase 1 — Foundation Collections

The irreducible base. Nothing else can be built until these exist and are stable.

### Step 1 — Artist collection

Single-record collection. One instance per platform account in the artist role.

Fields:
- `name` text, required
- `slug` text, auto-generated, unique
- `careerStage` select — `studio` | `market` | `institutional`, default `studio`
- `primaryActorType` select — `artist` | `collector` | `gallery` | `artist-collector` | `artist-gallery` | `artist-collector-gallery`
- `actorRoles` multi-select — `artist` | `collector` | `gallery` (all active roles)
- `platformJoinDate` date, auto-set on creation
- `externalIdentifiers` array of `{ type: select, value: text, verified: boolean }`
  - type options: `website` | `instagram` | `artnet` | `wikidata` | `json-ld` | `google-knowledge-graph`

✓ Completion test: Create one Artist record in admin. Verify all fields save correctly. Verify `careerStage` defaults to `studio`.

---

### Step 2 — PracticeKnowledge collection

Documents that brief the Art/Official agent at session start. Six initial records seeded.

Fields:
- `slug` text, unique — `biography` | `artist-statement` | `series` | `visual-vocabulary` | `art-historical-touchstones` | `preferred-vocabulary`
- `sectionLabel` text — display name used as heading in system prompt
- `content` richText
- `status` select — `active` | `draft`, default `active`
- `order` integer — controls assembly sequence in system prompt

✓ Completion test: Seed all six slug records. Verify the API route can query `practice-knowledge` collection filtered by `status: active`, sorted by `order`, and assemble the result as a string block.

---

### Step 3 — Artworks collection (core fields only)

Identity, physical, classification. No collector fields, no AR fields, no gallery fields yet — those come in later phases. Get the core stable first.

**Identity fields:**
- `title` text
- `slug` text, auto-generated from title + year
- `yearCreated` integer
- `yearRange` text (for approximate dates)
- `series` text
- `city` text
- `edition` text
- `editionSize` integer
- `recordOrigin` select — `artist-catalogued` | `collector-catalogued` | `migrated` | `enrichment-agent`, default `artist-catalogued`
- `platformFirstMentionDate` date (auto-set when record is first created or referenced)

**Physical fields:**
- `medium` text
- `support` text
- `widthCm` decimal
- `heightCm` decimal
- `depthCm` decimal
- `sizeTier` select — `XS` | `S` | `M` | `L` | `XL` (computed from dimensions on save)
- `framed` boolean
- `signed` text
- `inscribed` text

**Condition fields:**
- `condition` select — `Excellent` | `Good` | `Fair` | `Poor` | `Damaged`
- `conditionNotes` longText
- `conditionDate` date

**Artist-layer fields (intent):**
- `intent` longText
- `makingNote` longText
- `directInspiration` longText
- `encounterNote` longText
- `formalContributionAssessment` longText
- `artHistoricalReferences` array of text

**Classification fields:**
- `descriptionShort` text
- `descriptionLong` longText
- `conceptualKeywords` array of text
- `dominantColours` array of text (computed by image analysis)
- `tags` array of text

**Commercial fields:**
- `availabilityStatus` select — `available` | `sold` | `not-for-sale` | `on-consignment`
- `askingPrice` decimal
- `listingCurrency` select

**Provenance — artist origin:**
- `currentLocation` text
- `ownershipHistory` array of `{ owner: text, startDate: date, endDate: date, confidence: select, source: text }`
- `provenanceOriginKnown` boolean, default `true`
- `provenanceConfidenceLayer` array of `{ field: text, evidenceBasis: text, confidenceLevel: select }`

**Media:**
- `primaryImage` upload → media collection
- `additionalImages` array of uploads

**Relation to Artist:**
- `artist` relation → Artist, required

✓ Completion test: Create three Artwork records with varying field completeness. Verify `sizeTier` computes correctly. Verify `recordOrigin` defaults to `artist-catalogued`. Verify relation to Artist saves.

---

### Step 4 — Sessions collection

Every Art/Official session writes here. The working record behind every confirmed artwork.

Fields:
- `sessionId` text, auto-generated UUID
- `sessionType` select — `artwork-cataloguing` | `collector-cataloguing` | `artist-statement` | `biography` | `onboarding`
- `status` select — `in-progress` | `completed` | `abandoned`
- `artistId` relation → Artist
- `collectorId` relation → Collector (null until Collector collection exists — add as nullable)
- `artworkRecord` relation → Artworks (null until confirmation commit)
- `createdAt` date, auto
- `completedAt` date
- `messages` JSON (full Anthropic message array — opaque, not validated at Payload level)
- `firstImpression` longText
- `secondDescription` longText
- `fieldUpdateTimeline` JSON array of `{ field, value, confidence, source, timestamp }`
- `agentDraftDescriptionShort` text
- `agentDraftDescriptionLong` longText
- `agentDraftConceptualKeywords` array of text
- `agentDraftFormalContributionAssessment` longText
- `sessionNotes` longText
- `weakPhases` multi-select — `pre-upload` | `identity` | `intent` | `art-historical` | `classification` | `confirmation`
- `blindDescriptionUseful` boolean
- `formalContributionAccuracy` select — `accurate` | `partial` | `missed`
- `dialogueRefinementFlag` boolean, default false
- `refinementNotes` longText

Admin view: show session type, status, linked artwork, created date, `dialogueRefinementFlag` as prominent indicator. Sessions flagged for refinement visually distinct in list. No public API exposure.

✓ Completion test: Create a test session record manually. Verify `artworkRecord` relation links to an Artwork. Verify the collection does not appear in any public API response.

---

## Phase 2 — Art/Official Agent

The conversational cataloguing agent. Runs inside the Payload admin as a custom React view. Read `art-official-dialogue-spec.md` in full before implementing any part of this phase.

### Step 5 — API route

`/api/art-official/chat` — server-side route. Never exposes API key to browser.

- Reads `careerStage` from Artist singleton at session start
- Queries PracticeKnowledge collection filtered by `status: active`, sorted by `order`
- Assembles system prompt in the exact order specified in dialogue spec Section 1.1
- Handles tool calls: `update_field`, `store_session_field`, `trigger_image_analysis`, `generate_confirmation_draft`
- Writes field updates to Sessions `fieldUpdateTimeline` on every `update_field` call
- Commits to Artworks collection only at confirmation step

✓ Completion test: POST a test message to the route. Verify system prompt assembles correctly with all six PracticeKnowledge sections. Verify `update_field` tool call writes to `fieldUpdateTimeline`. Verify no API key in browser network tab.

---

### Step 6 — Custom admin view

React component registered with Payload at `/admin/cataloguing`.

- Pre-upload phase: instructions, image upload area
- Conversation pane: chat interface, scrollable message history
- Sidebar: live field population panel — fields appear as confirmed, colour-coded by confidence
- Confirmation step: full assembled record, artist-editable draft fields, commit button
- Connects to `/api/art-official/chat` route

✓ Completion test: Complete one full cataloguing session end-to-end. Verify sidebar updates in real time on `update_field` calls. Verify confirmation step shows all populated fields. Verify committed record appears correctly in Artworks collection.

---

### Step 7 — Image analysis pipeline

Triggered silently by `trigger_image_analysis` tool call immediately after image upload. Runs in parallel with conversation.

- CLIP embeddings generated and stored on Artwork record
- Dominant colours extracted → `dominantColours` field
- `sizeTier` computed from dimensions if provided
- Results returned as agent context — agent uses them to inform questions, not to announce them

✓ Completion test: Upload an artwork image. Verify CLIP embeddings are generated and stored. Verify `dominantColours` populates. Verify analysis does not block or delay the conversation.

---

## Phase 3 — Collector Layer

Extend the schema for the collector use case. Read `schema-extension-collector-ar.md` before implementing.

### Step 8 — Collector collection

New collection. Mirrors Artist structure.

Fields:
- `collectorId` text, auto-generated UUID
- `name` text
- `collectionName` text
- `collectionFocus` text
- `dealerRelationships` text
- `acquisitionContext` text
- `platformRelationship` select — `artist-also` | `collector-only`
- `platformJoinDate` date
- `firstMentionDate` date
- `externalIdentifiers` array of `{ type: select, value: text, verified: boolean }`
- `collectionKnowledgeBase` relation → CollectionKnowledge

✓ Completion test: Create one Collector record. Verify all fields save. Verify relation to CollectionKnowledge works.

---

### Step 9 — CollectionKnowledge collection

Mirrors PracticeKnowledge. Five initial slug records seeded.

Slugs: `collector-biography` | `collection-focus` | `dealer-relationships` | `acquisition-context` | `collection-overview`

Same field structure as PracticeKnowledge: `slug`, `sectionLabel`, `content`, `status`, `order`.

✓ Completion test: Seed all five records. Verify API route can load CollectionKnowledge the same way it loads PracticeKnowledge, switching by session type.

---

### Step 10 — Collector fields on Artworks

Add to the existing Artworks collection. All dormant in `artwork-cataloguing` sessions.

**Acquisition context:**
- `acquisitionYear` integer
- `acquisitionChannel` select — `direct-from-artist` | `dealer` | `auction` | `art-fair` | `gift` | `estate` | `other`
- `dealerSource` text
- `dealerLocation` text
- `priorOwner` text
- `acquisitionPrice` decimal (private — never in public API)
- `acquisitionCurrency` select
- `certificationDocs` text
- `saleHandoffReceived` boolean, default false

**Corpus layer (dialogue-only — never form-filled):**
- `artistRecognitionAtAcquisition` select — `unknown` | `local-known` | `nationally-known` | `internationally-known` | `institutionally-validated`
- `priorExhibitionAtAcquisition` text
- `encounterContext` select — `studio-visit` | `dealer-recommendation` | `art-fair` | `online` | `gift` | `other`
- `whyThisWork` longText
- `collectorArtistRelationship` select — `none` | `aware-of-practice` | `personal-relationship`
- `documentationPhotoContext` text

**Relations:**
- `linkedArtistRecord` relation → Artworks (nullable — links collector record to artist's own record for same work)
- `linkedCollectorId` relation → Collector

✓ Completion test: Create one Artwork with `recordOrigin: collector-catalogued`. Verify all collector fields save. Verify `linkedArtistRecord` relation works. Verify `acquisitionPrice` is excluded from public API response.

---

## Phase 4 — AR Layer

Add AR capability to both artist and collector artwork records.

### Step 11 — AR fields on Artworks

- `arEnabled` boolean, default false
- `arWidthM` decimal (computed from `widthCm` / 100 on save — override available)
- `arHeightM` decimal (computed from `heightCm` / 100)
- `arDepthM` decimal
- `arModelUrl` text (URL to generated .usdz file)
- `arModelGlbUrl` text (URL to generated .glb file for Android)
- `arAllowScaling` boolean, default true
- `arLastGenerated` date

✓ Completion test: Set `arEnabled: true` on an Artwork with dimensions. Verify `arWidthM` and `arHeightM` compute correctly. Verify fields save without triggering generation job yet (job comes next step).

---

### Step 12 — USDZ generation background job

Triggered when `arEnabled` is set to true and `primaryImage` and dimensions are present.

- Fetches `primaryImage` from Payload media
- Generates flat rectangular plane mesh sized to `arWidthM` × `arHeightM` in metres, textured with artwork image
- For works with `arDepthM > 0`: simple box geometry, image on front face
- Saves .usdz to object storage, writes URL to `arModelUrl`
- Generates .glb equivalent, writes URL to `arModelGlbUrl`
- Sets `arLastGenerated` timestamp
- Re-runs when `primaryImage` or dimensions change and `arEnabled` is true

MIME type: serve .usdz with `Content-Type: model/vnd.usdz+zip`

**Web implementation for public artwork pages:**
```html
<!-- iOS Quick Look -->
<a rel="ar" href="/media/ar/[slug].usdz#allowsContentScaling=0&canonicalWebPageURL=[page-url]">
  <img src="/media/[artwork-preview].jpg" alt="View in AR">
</a>

<!-- Cross-platform via model-viewer -->
<model-viewer
  src="/media/ar/[slug].glb"
  ios-src="/media/ar/[slug].usdz"
  ar
  ar-modes="webxr scene-viewer quick-look"
  camera-controls>
</model-viewer>
```

✓ Completion test: Set `arEnabled: true` on a test Artwork with image and dimensions. Verify .usdz is generated and stored. Verify file is accessible at the generated URL with correct MIME type. Verify the iOS Quick Look link triggers correctly in Safari mobile.

---

## Phase 5 — Gallery Layer

### Step 13 — Gallery collection + GalleryKnowledge collection

**Gallery collection:**
- `name` text
- `slug` text, auto-generated
- `programmeFocus` text
- `location` text
- `foundingYear` integer
- `platformJoinDate` date
- `firstMentionDate` date
- `externalIdentifiers` array (same structure as Artist)
- `representedArtists` array of `{ artistId: relation → Artist, status: select, startDate: date, endDate: date }`
  - status: `active` | `historical`
- `galleryKnowledgeBase` relation → GalleryKnowledge

**GalleryKnowledge collection:**
Slugs: `gallery-biography` | `programme-focus` | `represented-artists` | `exhibition-history` | `curatorial-position`

✓ Completion test: Create one Gallery record with two represented artists (one active, one historical). Verify status and date fields on the relation. Verify GalleryKnowledge loads correctly for a gallery session.

---

### Step 14 — Gallery fields on Artworks

- `consignedTo` relation → Gallery (current consignment — nullable)
- `consignmentHistory` array of `{ galleryId: relation → Gallery, status: select, dateIn: date, dateOut: date, outcome: select }`
  - status: `active` | `completed`
  - outcome: `sold` | `returned` | `transferred`
- `galleryReference` text (gallery's own inventory number)
- `galleryText` longText (wall text or press release produced by gallery for this work — provenance record)
- `placedBy` relation → Gallery (if collector record — which gallery brokered the sale)

✓ Completion test: Add a consignment record to an Artwork. Verify history array saves correctly. Verify `galleryText` field is included in provenance layer but not in artist-layer fields.

---

## Phase 6 — Event Collection + Entity Resolution

The most complex phase. Build Event first, then the resolution layer.

### Step 15 — Event collection

First-class collection. Replaces text-based exhibition history across all records.

Fields:
- `eventId` text, auto-generated UUID
- `title` text
- `eventType` select — `exhibition` | `art-fair` | `auction` | `sale` | `studio-visit` | `residency` | `award` | `publication`
- `startDate` date
- `endDate` date
- `venue` text
- `venueCity` text
- `galleryId` relation → Gallery (nullable — for gallery-organised events)
- `institutionName` text (for institutional events not on platform)
- `artists` array of `{ artistId: relation → Artist, cvVisible: boolean, cvOrder: integer }`
- `artworks` array of `{ artworkId: relation → Artworks }`
- `collectors` array of `{ collectorId: relation → Collector }` (optional — for acquisition events)
- `description` text
- `pressRelease` longText
- `externalUrl` text (link to original source — exhibition page, auction record, etc.)

**Source and merge tracking:**
- `sourceHistory` array of `{ source: select, actorId: text, addedAt: date, fieldsContributed: array of text }`
  - source: `artist-archive` | `gallery-import` | `collector-session` | `enrichment-agent` | `json-ld-scrape` | `manual`
- `completenessScore` integer (0–100, computed)
- `mergeStatus` select — `stub` | `partial` | `confirmed` | `disputed`
- `mergeLog` array of `{ event: select, actorId: text, timestamp: date, note: text }`
  - event: `entity-linked` | `field-updated` | `merge-proposed` | `merge-confirmed` | `merge-declined`
- `canonicalSource` text (actorId of the record's authoritative source)

**Replace exhibitionHistory text fields on Artworks with:**
- `exhibitionHistory` array of `{ eventId: relation → Event, workIncluded: boolean, notes: text }`

✓ Completion test: Create two Event records. Link one to a Gallery, one to an Artist directly. Verify artworks array relations save. Verify the exhibitionHistory relation on Artworks links correctly to Event records. Verify the old text-based exhibition fields are migrated or removed.

---

### Step 16 — Entity resolution layer

The mechanism that links records across actors when the same real-world entity appears in multiple contexts. Enables historical merging and the pre-platform recognition trail.

**Add to Artist, Collector, and Gallery collections:**
- `firstMentionDate` date (when this entity was first referenced in any record — may predate `platformJoinDate`)
- `mergeCandidates` array of `{ candidateType: select, candidateId: text, matchConfidence: select, matchBasis: text, status: select }`
  - candidateType: `artist` | `collector` | `gallery` | `event`
  - matchConfidence: `high` | `medium` | `low`
  - matchBasis: e.g. `website-url-match` | `name-city-match` | `wikidata-id-match` | `json-ld-scrape`
  - status: `pending` | `confirmed` | `declined`

**Background enrichment agent (stub — full implementation deferred):**

When a new entity joins the platform, the enrichment agent:
1. Reads `externalIdentifiers` from the new record
2. Queries existing records across Artist, Collector, Gallery, and Event collections for matches
3. Checks name + city combinations as lower-confidence fallback
4. For any match above `low` confidence: creates a `mergeCandidates` entry on both records and sets status to `pending`
5. Does not merge automatically — proposes only

Art/Official surfaces pending merge candidates conversationally at the start of the next session:
*"I found records that may relate to your exhibition history — a show in [city] in [year] is referenced in another artist's archive. Do you want to connect your record to it?"*

Confirmation from the artist writes the `Event` relation and updates `mergeLog` on both records. `firstMentionDate` on the newly joined entity is back-filled to the date of the earliest reference found.

**JSON-LD scraping for your own site:**

Your exhibition pages output JSON-LD. The enrichment agent reads this at a URL stored in `externalIdentifiers` (type: `json-ld`) and creates or enriches Event records from the structured data. This is the mechanism by which your existing site's exhibition history enters the corpus before other actors join the platform.

✓ Completion test: Manually create a merge candidate between two Artist records. Verify the `mergeCandidates` array saves on both. Simulate a confirmation — verify `mergeLog` updates and the Event relation is written. Verify `firstMentionDate` back-fills correctly.

---

## Phase 7 — Session Type Routing (collector + gallery)

### Step 17 — Collector and gallery session types

Update the `/api/art-official/chat` route to handle the new session types.

Session type routing table:

| sessionType | Knowledge base | Field roadmap | Artist-layer fields |
|---|---|---|---|
| `artwork-cataloguing` | PracticeKnowledge | Artist full roadmap (Tier 1–3) | Active |
| `collector-cataloguing` | CollectionKnowledge | Collector roadmap | Dormant |
| `gallery-cataloguing` | GalleryKnowledge | Gallery roadmap | Dormant |
| `artist-statement` | PracticeKnowledge | Statement only | Active |
| `biography` | PracticeKnowledge | Biography only | Active |
| `onboarding` | None (building it) | Onboarding protocol | Active |

Collector session field sequence (approximate):
1. Image upload + basic identity
2. Physical (medium, support, dimensions — confirm or correct from image analysis)
3. Provenance (acquisition year, channel, dealer — practical, quick)
4. Encounter context (how did you come across this)
5. Recognition context (what was the artist's situation at the time — indirect)
6. Why this work (never asked directly — emerges from conversation)
7. Condition and location
8. AR enablement prompt
9. Confirmation

Gallery session field sequence (approximate):
1. Which artist is this work by — confirm relation
2. Physical and identity
3. Consignment context (how did this work come to the gallery, from whom)
4. Curatorial position (why this work in the programme — the gallery's recognition account)
5. Exhibition history for this work through the gallery
6. Commercial status
7. Confirmation

✓ Completion test: Run a collector session end-to-end. Verify CollectionKnowledge loads instead of PracticeKnowledge. Verify artist-layer fields (`intent`, `makingNote` etc.) are never asked. Verify `recordOrigin` is set to `collector-catalogued` on the committed record.

---

## Phase 8 — CV Assembly + Multi-frontend

### Step 18 — CV assembly query

The artist's CV is a query result, not a manually maintained document.

Build a Payload API endpoint: `/api/cv/[artistSlug]`

Returns:
- Artist biography (from PracticeKnowledge `biography` slug)
- Solo exhibitions — Events where `eventType: exhibition`, artist is in `artists` array, `cvVisible: true`, sorted by `startDate` desc
- Group exhibitions — same filter, flagged as group by number of artists in Event
- Art fairs — Events where `eventType: art-fair`
- Awards and residencies — Events of those types
- Selected works — Artworks where `recordOrigin: artist-catalogued`, `availabilityStatus: sold | not-for-sale` (optional filter)
- Publications — Events where `eventType: publication`

Output format: JSON for API consumers, HTML for direct rendering, PDF generation endpoint for download.

✓ Completion test: Add five Event records covering different event types for one artist. Query `/api/cv/[slug]`. Verify output groups correctly by event type, sorts by date, and excludes events where `cvVisible: false`.

---

### Step 19 — Multi-frontend API access control

The same Payload instance serves multiple frontends. Access control by role and record type.

Rules:
- Artist archive frontend (`bernardbolter.com`): reads Artworks where `recordOrigin: artist-catalogued`, Artist record, Events where the artist is in the `artists` array. No write access.
- Gallery frontend (future domain): reads Gallery record, represented Artists, Events linked to Gallery, consigned Artworks. No access to collector records or artist `acquisitionPrice` fields.
- Collector interface: reads only — Artworks where `linkedCollectorId` matches authenticated collector. Never exposes `acquisitionPrice` to any external consumer.
- Admin (Payload admin): full access, authenticated.

Implement using Payload's collection-level and field-level access control functions. `acquisitionPrice` gets an explicit `read: () => false` for all non-admin roles.

✓ Completion test: Query the Artworks API as an unauthenticated request. Verify `acquisitionPrice` is absent from the response. Verify only `artist-catalogued` records are returned without authentication. Verify collector records require authentication.

---

## Build notes for Cursor

**Dependency order is strict.** Steps 1–4 must be complete before Step 5. Steps 8–10 before Step 17. Step 15 before Step 16. Do not reorder.

**Schema changes to existing collections** (Steps 10, 11, 14) should be done in a single migration pass per collection — add all new fields at once rather than one at a time.

**The agent is the filter — not the schema.** All fields exist on the Artworks collection regardless of session type. The session routing logic in the API route determines which fields are asked about. Do not create separate collections for artist-works versus collector-works.

**Dormant fields are not empty.** They are waiting. The admin shows all fields regardless of career stage or session type — the tier and session logic is a dialogue-layer filter only.

**Never expose `acquisitionPrice` in any public or external API response.** This is load-bearing for collector trust. Implement the access control rule in Step 19 even if the gallery and collector frontends are not yet built.

**Test each step with real data before moving to the next.** The completion tests are not optional. A schema error at Step 3 will propagate through every subsequent step.

---

*Cursor Implementation Plan v2 — May 2026*
*Covers: original 16-step schema + Collector layer + AR + Gallery layer + Event collection + Entity resolution + CV assembly + Multi-frontend access control*
*Read alongside: master-schema-spec.md, art-official-dialogue-spec.md, schema-extension-collector-ar.md*
