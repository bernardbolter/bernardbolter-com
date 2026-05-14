# Cursor Implementation Plan — Artist Archive
## bernardbolter.com · Schema Build Sequence
*May 2026 · Final version — supersedes cursor-implementation-plan-v2.md (Artist Archive phases only)*

---

## How to use this document

This document is scoped to the **Artist Archive module only**. Gallery and Collector modules are specified in separate documents.

Pass this to a high-level model (Opus or similar) to break each step into atomic tasks. Hand each atomic task to the auto model for implementation. Every step has a clear completion test — the agent must verify against it before moving to the next step.

**Read before starting:**
- `artist-archive-schema-final.md` — canonical field names, types, access control. Read in full before writing any collection config.
- `art-official-dialogue-spec.md` — full Art/Official agent spec. Read before implementing Phase 3.
- `system-philosophy-and-art-history.md` — the north star. Read once.

**Dependency order is strict.** Steps are ordered by dependency. Do not reorder. A schema error at Step 1 propagates through every subsequent step. Test each step with real data before moving on.

---

## Phase 1 — Foundation Collections

The irreducible base. Nothing else can be built until these exist and are stable.

---

### Step 1 — Artist singleton

Read: Section 4 of `artist-archive-schema-final.md`

Create `src/collections/Artist.ts`. Use Payload's singleton pattern — exactly one record, no list view.

Fields to implement:
- `name` text, required
- `slug` text, auto-generated, unique
- `ulanUri` text
- `wikidataUri` text
- `careerStage` select — `studio` | `market` | `institutional`, default `studio`
- `primaryActorType` select — `artist` | `collector` | `gallery` | `artist-collector` | `artist-gallery` | `artist-collector-gallery`
- `actorRoles` multi-select — `artist` | `collector` | `gallery`
- `bioFull` richText, `localized: true`
- `bioMedium` richText, `localized: true`
- `bioShort` text, `localized: true`
- `statementFull` richText, `localized: true`
- `statementMedium` richText, `localized: true`
- `statementShort` text, `localized: true`
- `practiceNote` richText, `localized: true`
- `creditLine` text, `localized: true`
- `locations` array of `{ city: text, country: text, type: select(studio|residence|live-work), primary: boolean, current: boolean, startYear: number }`
- `publicEmail` text, access: `{ read: artistOrAdmin }`
- `website` text
- `instagramUrl` text
- `otherLinks` array of `{ label: text, url: text }`
- `education` array of `{ institution: text, degree: text, subject: text, yearStart: number, yearEnd: number, city: text, country: text, cvVisible: boolean(default true) }`
- `selectedCollections` array of `{ institutionName: text, city: text, country: text, acquisitionYear: number, cvVisible: boolean(default true), sourceOfTruth: select(manual|derived)(default manual), linkedArtworkId: relation → Artworks(nullable) }`
- `externalIdentifiers` array of `{ type: select(website|instagram|artnet|artsy|wikidata|ulan|json-ld|google-knowledge-graph), value: text, verified: boolean }`

Localisation config: enable `en` and `de` locales in `payload.config.ts` before creating this collection.

✓ Completion test: Create one Artist record in admin. Verify all fields save correctly. Verify `careerStage` defaults to `studio`. Verify `bioFull` shows language switcher for en/de. Verify `publicEmail` is absent from unauthenticated API response. Verify exactly one record can be created.

---

### Step 2 — Tags collection

Read: Section 3.2 of `artist-archive-schema-final.md`

Create `src/collections/Tags.ts`.

Fields:
- `label` text, required
- `type` select — `movement` | `style` | `subject` | `genre` | `period`, required
- `aatUri` text
- `iconclassNotation` text
- `lcshUri` text
- `description` text

✓ Completion test: Create tags of each type. Verify `type` select shows all five values. Verify collection is queryable filtered by type.

---

### Step 3 — Series collection

Read: Section 3.1 of `artist-archive-schema-final.md`

Create `src/collections/Series.ts`.

Fields:
- `name` text, required
- `slug` text, auto-generated from name, unique
- `description` richText, `localized: true`
- `yearStart` number
- `yearEnd` number, optional
- `city` text
- `country` text
- `coverImage` upload
- `status` select — `draft` | `published`

✓ Completion test: Create three Series records. Verify slug auto-generates from name. Verify `description` shows language switcher. Verify status defaults to `draft`.

---

### Step 4 — ArtHistoricalReferences collection

Read: Section 3.3 of `artist-archive-schema-final.md`

Create `src/collections/ArtHistoricalReferences.ts`.

Fields:
- `artworkTitle` text, required
- `artistName` text, required
- `yearCreated` number
- `medium` text
- `institution` text
- `referenceUrl` text
- `wikidataUri` text
- `notes` text

✓ Completion test: Create two ArtHistoricalReferences records. Verify required fields enforce. Verify collection is queryable.

---

### Step 5 — PracticeKnowledge collection

Read: Section 1.3 of `art-official-dialogue-spec.md`

Create `src/collections/PracticeKnowledge.ts`. This collection holds the documents that brief the Art/Official agent at session start.

Fields:
- `slug` text, unique — values: `biography` | `artist-statement` | `series` | `visual-vocabulary` | `art-historical-touchstones` | `preferred-vocabulary`
- `sectionLabel` text — display heading used in system prompt assembly
- `content` richText
- `status` select — `active` | `draft`, default `active`
- `order` integer — controls assembly sequence in system prompt

Seed all six slug records after collection is created.

✓ Completion test: All six slug records exist. Verify the API route can query `practice-knowledge` filtered by `status: active`, sorted by `order`, and assemble result as a string block. Verify empty sections are omitted from assembled output.

---

### Step 6 — Events collection (without artworks relation)

Read: Section 2 of `artist-archive-schema-final.md`

Create `src/collections/Events.ts` with all fields from Section 2 **except** the `artworks` relation field. Add a comment `// TODO: artworks relation added in Step 10 after Artworks collection exists`.

Include all field groups: identity, type, dates, venue, context, description, type-specific conditional groups (publications, bibliography, awards, residencies, education, public commissions), CV config.

Key implementation notes:
- `eventType` select must have all 13 values including `education` and `bibliography`
- Type-specific fields gated in admin UI using Payload conditional logic on `eventType`
- `cvSection` select must have all 13 section values
- `yearStart` computed from `startDate` via `beforeChange` hook
- `descriptionShort` and `descriptionLong` must be `localized: true`
- Education type-specific fields include `cvVisible` boolean, default `true`
- Award `awardAmount` and `awardAmountCurrency` must have `access: { read: artistOrAdmin }`
- Commission `commissionBudget` must have `access: { read: artistOrAdmin }`

✓ Completion test: Create Events of five different types. Verify `eventType` select shows all 13 values. Verify type-specific fields appear/disappear based on `eventType`. Verify `yearStart` computes from `startDate`. Verify `cvSection` defaults correctly for each event type. Verify private award and commission fields are absent from unauthenticated API response.

---

## Phase 2 — Artworks Collection

---

### Step 7 — Artworks collection (core fields)

Read: Sections 1.1–1.9 of `artist-archive-schema-final.md`

Create `src/collections/Artworks.ts`. This is the largest and most complex collection — implement all field groups in one pass.

Key implementation notes:
- `recordOrigin` select: `artist-catalogued` | `gallery-catalogued` | `collector-catalogued` | `migrated` | `enrichment-agent`. Default `artist-catalogued`. Set on creation, never changed.
- `measurementType` multi-select gates which dimension field groups are shown in admin
- Dimension fields (`widthWhole`, `widthFraction`, `heightWhole`, `heightFraction`, etc.) — do NOT compute `widthMm`/`heightMm` here; that happens in the hook (Step 8)
- `sizeTier` select: `sm` | `md` | `lg` | `xl`
- `orientation` select: `landscape` | `portrait` | `square`
- `series` must be a relation to Series collection — not a text field
- All tag fields (`movementTags`, `styleTags`, `subjectTags`, `genreTags`, `periodTags`) must be relation arrays to Tags collection — not text arrays
- `altTitle`, `primaryImageAltText`, `posterImageAltText`, `descriptionShort`, `descriptionLong`, `editionNotes` must be `localized: true`
- All provenance and commercial private fields must have `access: { read: artistOrAdmin }`: `askingPrice`, `listingCurrency`, `originalAskingPrice`, `priceNotes`, `insuranceValue`, `insuranceValueDate`, `salesRecord`, `totalRevenue`, `currentLocation`, `ownershipHistory`, `loanHistory`, `provenanceConfidenceLayer`, `workStateNotes`
- `clipEmbedding` field: type vector(1536) stored via pgvector — add as a custom field using Payload's custom field type pointing to the Neon pgvector column. Do not display in admin UI.
- `status` default `draft`
- AR fields: `arEnabled` boolean default `false`; `arWidthM` and `arHeightM` computed from dimensions (Step 8); `arModelUrl` and `arModelGlbUrl` populated by background job (Step 11)
- Series extension tabs for Mediums of Perception and A Colorful History: implement as Payload tabs, conditionally visible based on `series` relation value. `historicalContext` field must be `localized: true` — no `historicalContextEN`/`historicalContextDE` variants.

Do not add `events` relation yet — added in Step 10.

✓ Completion test: Create three Artwork records with varying field completeness. Verify `recordOrigin` defaults to `artist-catalogued`. Verify `series` relation saves correctly. Verify all five tag relation arrays accept multiple tags. Verify all private fields absent from unauthenticated API response. Verify Mediums of Perception tab appears only when that series is selected. Verify `localized: true` fields show language switcher.

---

### Step 8 — beforeChange hooks

Create `src/hooks/artworkBeforeChange.ts`.

This hook runs on every Artworks save and computes:

**Dimension normalisation:**
```typescript
// Parse fractionToDecimal from src/utilities/fractionToDecimal.ts
// widthMm = (widthWhole + fractionToDecimal(widthFraction)) × (dimensionUnit === 'cm' ? 10 : 25.4)
// heightMm = same pattern
// depthMm = same pattern, null if no depth
// dimensionsDisplay = formatted string: '120 × 90 cm' or '23 3/16 × 18 1/2 in'
```

**Computed fields:**
```typescript
// aspectRatio = widthMm / heightMm (stored float, 4 decimal places)
// arWidthM = widthMm / 1000 (when arEnabled = true and widthMm exists)
// arHeightM = heightMm / 1000 (when arEnabled = true and heightMm exists)
// yearStart on Events: new Date(startDate).getFullYear()
```

Create `src/utilities/fractionToDecimal.ts`:
```typescript
// Parses '3/16' → 0.1875, '1/2' → 0.5, '' or null → 0
```

✓ Completion test: Save an Artwork with `widthWhole: 90`, `widthFraction: ''`, `heightWhole: 120`, `dimensionUnit: 'cm'`. Verify `widthMm: 900`, `heightMm: 1200`, `aspectRatio: 0.75`, `dimensionsDisplay: '90 × 120 cm'`. Test with fractional dimensions. Test with inches. Verify `arWidthM` and `arHeightM` compute when `arEnabled: true`.

---

### Step 9 — Access control functions

Create `src/utilities/accessControl.ts`.

```typescript
export const artistOrAdmin = ({ req }) =>
  req.user?.role === 'artist' || req.user?.role === 'admin'

export const isPublished = ({ req }) =>
  req.user ? true : { status: { equals: 'published' } }
```

Apply `artistOrAdmin` to all private fields on Artworks and Events as listed in Steps 7 and 6.
Apply `isPublished` as collection-level `read` access on Artworks and Events.

✓ Completion test: Query Artworks API without authentication. Verify only `status: published` records returned. Verify all private fields (`askingPrice`, `ownershipHistory`, etc.) absent from response. Verify authenticated artist can read private fields.

---

### Step 10 — Add bidirectional relations

Now that Artworks exists, add:

**To Events collection:**
```typescript
{
  name: 'artworks',
  type: 'relationship',
  relationTo: 'artworks',
  hasMany: true,
  // This is the authority side — populating here auto-populates Artworks.events
}
```

**To Artworks collection:**
```typescript
{
  name: 'events',
  type: 'relationship',
  relationTo: 'events',
  hasMany: true,
  // Reverse side — auto-populated when Events.artworks is updated
}
```

✓ Completion test: Create an Event. Add two Artworks to `Events.artworks`. Verify both Artworks now show the Event in their `events` field without manual population.

---

## Phase 3 — Art/Official Agent

Read `art-official-dialogue-spec.md` in full before implementing any part of this phase.

---

### Step 11 — Sessions collection

Read: art-official-dialogue-spec.md Section on session data

Create `src/collections/Sessions.ts`.

Fields:
- `sessionId` text, auto-generated UUID
- `sessionType` select — `artwork-cataloguing` | `artist-statement` | `biography` | `onboarding`
- `status` select — `in-progress` | `completed` | `abandoned`
- `artistId` relation → Artist
- `artworkRecord` relation → Artworks, nullable
- `createdAt` date, auto
- `completedAt` date
- `messages` JSON (full Anthropic message array — opaque)
- `firstImpression` longText
- `secondDescription` longText
- `fieldUpdateTimeline` JSON array of `{ field, value, confidence, source, timestamp }`
- `agentDraftDescriptionShort` text
- `agentDraftDescriptionLong` longText
- `agentDraftConceptualKeywords` text array
- `agentDraftFormalContributionAssessment` longText
- `sessionNotes` longText
- `weakPhases` multi-select — `pre-upload` | `identity` | `intent` | `art-historical` | `classification` | `confirmation`
- `blindDescriptionUseful` boolean
- `formalContributionAccuracy` select — `accurate` | `partial` | `missed`
- `dialogueRefinementFlag` boolean, default false
- `refinementNotes` longText

No public API exposure. Admin view shows: session type, status, linked artwork, created date, `dialogueRefinementFlag` as prominent indicator.

✓ Completion test: Create a test session record manually. Verify `artworkRecord` relation links to an Artwork. Verify collection does not appear in any public API response.

---

### Step 12 — Art/Official API route

Read: art-official-dialogue-spec.md Sections 1–4

Create `src/app/(api)/art-official/chat/route.ts` (server-side — API key never touches browser).

The route:
1. Reads `careerStage` from Artist singleton at session start
2. Queries PracticeKnowledge collection filtered by `status: active`, sorted by `order`
3. Assembles system prompt in the exact order specified in dialogue spec Section 1.1
4. Handles tool calls: `update_field`, `store_session_field`, `trigger_image_analysis`, `generate_confirmation_draft`
5. Writes field updates to Sessions `fieldUpdateTimeline` on every `update_field` call
6. Commits to Artworks collection only at confirmation step via `payload.create()`

System prompt assembly pattern:
```typescript
const knowledgeSections = await payload.find({
  collection: 'practice-knowledge',
  where: { status: { equals: 'active' } },
  sort: 'order',
})
const knowledgeBlock = knowledgeSections.docs
  .map(doc => `## ${doc.sectionLabel}\n\n${doc.content}`)
  .join('\n\n---\n\n')
```

Model: `claude-sonnet-4-20250514`. API key from `process.env.ANTHROPIC_API_KEY` — never hardcoded.

✓ Completion test: POST a test message to the route. Verify system prompt assembles with all six PracticeKnowledge sections. Verify `update_field` tool call writes to `fieldUpdateTimeline`. Verify no API key in browser network tab. Verify route returns 401 for unauthenticated requests.

---

### Step 13 — Art/Official custom admin view

Read: art-official-dialogue-spec.md Section on UI

Create React component registered at `/admin/art-official`.

Interface sections:
- Pre-upload phase: four pre-upload questions (in locked order per dialogue spec), then image upload area
- Conversation pane: scrollable message history, input field
- Sidebar: live field population panel — fields appear as confirmed, colour-coded by confidence tier
- Confirmation step: full assembled record, artist-editable draft fields, commit button

The pre-upload question sequence (locked — do not reorder):
1. Relationship to time
2. Where it sits in the body of work
3. Where the artist was when they made it
4. Blind description request (with explicit framing that neither party has seen the image yet)

After blind description: image upload prompt appears.

Connects to `/api/art-official/chat`.

✓ Completion test: Complete one full cataloguing session end-to-end. Verify sidebar updates in real time on `update_field` calls. Verify confirmation step shows all populated fields. Verify committed record appears correctly in Artworks collection. Verify blind description and second description both appear at confirmation step.

---

## Phase 4 — Infrastructure

---

### Step 14 — JSON-LD generation

Create `src/utilities/generateArtworkJsonLd.ts` and `src/utilities/generateEventJsonLd.ts`.

**Artwork JSON-LD constraints (all mandatory):**
- `creator` must be typed Person object with ULAN and Wikidata identifier array — not a plain string
- `width` / `height` / `depth` must be `QuantitativeValue` objects with `unitCode` (`CMT` for cm, `INH` for inches, `E37` for pixels)
- `locationCreated` must be typed `Place` object with `address` PostalAddress and TGN `sameAs`
- `artMedium` where tag has AAT URI: output as `DefinedTerm` object
- `identifier` must be a `PropertyValue` with `propertyID: 'CatalogueNumber'`
- Editions produce `Offer` objects in `offers` array for available works

Inject as `<script type="application/ld+json">` in the Next.js artwork page component.

✓ Completion test: Run Google's Rich Results Test on a published artwork page. Verify no structured data errors. Verify `creator` has `identifier` array with ULAN and Wikidata entries. Verify `width` is a `QuantitativeValue` object, not a string. Verify `locationCreated` is a typed Place object.

---

### Step 15 — pgvector + CLIP embeddings

Run in Neon console if not already done:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Create `src/utilities/generateClipEmbedding.ts` — calls CLIP embedding endpoint with artwork image URL, returns 1536-dimension vector.

Create `src/hooks/artworkAfterChange.ts` — runs after image upload, asynchronously, not blocking the save. Calls `generateClipEmbedding` and stores result in `clipEmbedding` field.

Nearest-neighbour query utility:
```sql
SELECT id, 1 - (clip_embedding <=> $1::vector) AS similarity
FROM artworks
ORDER BY similarity DESC
LIMIT 5;
```

✓ Completion test: `clipEmbedding` column exists in Neon as `vector(1536)`. Upload an artwork image — verify embedding generates and stores without blocking the save. Run nearest-neighbour query against a test embedding without error.

---

### Step 16 — AR generation background job

Create `src/hooks/arGenerationJob.ts`.

Triggered when `arEnabled` is set to `true` and `primaryImage` and physical dimensions are present.

Process:
1. Fetch `primaryImage` from Payload media
2. Generate flat rectangular plane mesh sized to `arWidthM` × `arHeightM`, textured with artwork image
3. For works with `arDepthM > 0`: simple box geometry, image on front face
4. Save `.usdz` to object storage (Cloudflare R2), write URL to `arModelUrl`
5. Generate `.glb` equivalent, write URL to `arModelGlbUrl`
6. Set `arLastGenerated` timestamp
7. Re-run when `primaryImage` or dimensions change and `arEnabled` is true

Serve `.usdz` with `Content-Type: model/vnd.usdz+zip`.

Web implementation on public artwork pages — use `<model-viewer>` for cross-platform:
```html
<model-viewer
  src="/media/ar/[slug].glb"
  ios-src="/media/ar/[slug].usdz"
  ar
  ar-modes="webxr scene-viewer quick-look"
  camera-controls
  alt="[title] — view in your space">
</model-viewer>
```

iOS Quick Look gotchas:
- Only launches from Safari and SFSafariViewController
- Anchor must be tapped directly — cannot be triggered programmatically
- On desktop Safari: file downloads; serve QR code fallback

✓ Completion test: Set `arEnabled: true` on a test Artwork with image and dimensions. Verify `.usdz` generates and stores. Verify accessible at generated URL with correct MIME type. Verify iOS Quick Look triggers in Safari mobile.

---

### Step 17 — CV page

Read: Section 2.10 of `artist-archive-schema-final.md`

Create `src/app/(public)/cv/page.tsx`.

Query all Events where `status: published` and `excludeFromCv: false` using Payload local API. Group by `cvSection`. Sort by `yearStart` descending within each group. Apply `cvPriority` within year groups.

Section display order: `education` → `solo-exhibitions` → `group-exhibitions` → `art-fairs` → `awards-prizes` → `residencies` → `public-commissions` → `publications` → `bibliography` → `selected-collections` → `talks-panels` → `screenings` → `performances` → `other`

`selected-collections` section rendered from Artist singleton `selectedCollections` array (not from Events).

CV line formats:
```
Education:    YEAR–YEAR   Degree, Subject — Institution, City
Exhibitions:  YEAR        Title, Venue Name, City
Publications: YEAR        'Article Title' in Publication Name, pp. XX–XX
Bibliography: YEAR        Author, 'Title', Publication Name
Awards:       YEAR        Award Name, Organisation (outcome if not winner)
Residencies:  YEAR        Programme Name, Organisation, City
Collections:  Institution Name, City
```

Use `generateStaticParams` or `revalidate` for static generation.

✓ Completion test: Add Events covering all section types for one artist. Query CV page. Verify output groups correctly by section, sorts by date descending, excludes `excludeFromCv: true` events. Verify education appears first. Verify selected collections renders from Artist singleton array. Verify bibliography entries show author name.

---

## Build notes for Cursor

**Schema changes to existing collections** (Steps 8, 9, 10) should be done in a single migration pass per collection — add all new fields at once rather than one at a time.

**The agent is the filter — not the schema.** All fields exist on the Artworks collection regardless of session type. The session routing logic in the API route determines which fields are asked about. Do not create separate collections for different session types.

**Dormant fields are not empty.** They are waiting. The admin shows all fields — the tier and session logic is a dialogue-layer filter only.

**Never expose private fields in any public or external API response.** Implement the access control in Step 9 even if external consumers are not yet built.

**Test each step with real data before moving to the next.** The completion tests are not optional.

**For Art/Official steps:** Read `art-official-dialogue-spec.md` in full before starting Phase 3. The dialogue spec is the complete contract for agent behaviour — do not interpret or abbreviate it.

---

*Cursor Implementation Plan — Artist Archive · May 2026*
*Supersedes: cursor-implementation-plan-v2.md (Artist Archive phases)*
*Read alongside: artist-archive-schema-final.md, art-official-dialogue-spec.md*
