# Build Plan — /studio + FieldNotes Pipeline + Small-Model Router

**Source briefs** (read first):
- `docs/fieldNotes/studio-app-spec.md`
- `docs/fieldNotes/studio-app-spec-addendum.md` *(Lines, richer tagging, Studio Conversation, Pattern Report)*
- `docs/fieldNotes/brief-07-footage-pipeline.md`
- `docs/fieldNotes/small-model-architecture.md`

**Companion briefs** (referenced):
- `docs/cursor-implementation-plan-final.md`
- `docs/artist-archive-schema-final.md`
- `docs/handoff-ach-schema-extension.md.txt`

**Audience:** auto-agents (Cursor background agents, Codex CLI, Claude Code). Each phase below is sized to fit in one agent run, ends with a test gate and a git commit.

---

## 0. Tracks and dependencies

Three intertwined projects. The hard dependencies:

```
Phase A (schema)          → required by everything below
  ├─ Phase B (auth shell) → required by C, F
  │   └─ Phase C (upload) → required by D, F1, F2
  ├─ Phase D (job queue scaffolding) → required by E, F
  │   └─ Phase E (Hetzner processing) — needs human setup
  └─ Phase F (studio tabs)
Phase G (small-model router) — independent of A–F; can run in parallel
Phase H (studio Phase 2 features) — deferred until F is live
```

Run **A → B → C → D → F1–F4 → E** sequentially. **G** can run on a separate branch in parallel from the start. **H** is explicitly out of scope for the first build round.

---

## 1. Conventions every phase must follow

**TypeScript + Payload patterns** (from `AGENTS.md` at repo root):
- TypeScript-first; run `tsc --noEmit` before commit
- `generate:types` after collection changes; `generate:importmap` after admin component changes
- Local API calls that take `user` must include `overrideAccess: false`
- Hooks that touch other collections pass `req`
- Hooks that re-touch their own collection set `context: { skipAgent: true }` (or similar) to break loops

**File layout for new code:**
- Collections → `src/collections/<Name>.ts` and registered in `src/payload.config.ts`
- Studio routes → `src/app/(frontend)/studio/...` (pages) + `src/app/(payload)/api/studio/...` (API)
- Workers → `src/workers/<name>.ts`
- Library helpers → `src/lib/studio/...` and `src/lib/router/...`
- Tests → `tests/unit/<name>.spec.ts` (vitest, mirrors existing `tests/unit/`)

**Per-step contract:**
1. Read the relevant brief sections listed under "Refs"
2. Implement only what the step describes — do not pull future-phase work forward
3. Run the step's test command
4. Run `npx tsc --noEmit` and fix any new errors
5. Commit with the exact message template provided
6. Do **not** commit `.env` or any secret values

**Branching:** Phases A–F on one branch (`feat/studio`). Phase G on its own (`feat/router`). Phase H deferred.

**Stop conditions for the agent:**
- Test command fails after one fix attempt → stop, report
- `tsc --noEmit` introduces >5 unrelated errors → stop, report
- Step requires secrets or human setup (marked **NEEDS BERNARD**) → stop after writing the code, report

---

## 2. Things Bernard must do before agents start

These are not auto-agent tasks:

1. **Enable pgvector on Neon**
   - Run in Neon SQL editor: `CREATE EXTENSION IF NOT EXISTS vector;`
2. **Create env placeholders** (add to `.env.local`, never commit):
   - `GROQ_API_KEY=` (Phase G — see §11 for provider notes)
   - `REPLICATE_API_TOKEN=` (later, for CLIP)
   - `HETZNER_HOST=` (only when E is ready — Bernard does not have the server yet, OK)
3. **R2 bucket layout** — **DECIDED:** same `artwork` bucket, under prefix `field-notes/YYYY/MM/…`.
4. **/studio auth** — **DECIDED:** password (Payload built-in users). Single user for now; multi-role can come later via a `studioAccess` flag.

---

## 3. Phase A — Schema foundation

**Branch:** `feat/studio`  
**Total steps:** 8  
**Refs:** `brief-07-footage-pipeline.md` §FieldNotes; `studio-app-spec.md` §Data Architecture; `studio-app-spec-addendum.md` §1, §2, §3, §4

Order is deliberate: collections that other collections reference (`lines`, `episodes`) are built first so subsequent steps can declare `relationTo` without a follow-up patch.

### A1. Enable pgvector + add embedding columns (script only)

- **Files:** `src/scripts/enable-pgvector.ts` (new)
- **Acceptance:**
  - Script connects to `DATABASE_URL` and runs `CREATE EXTENSION IF NOT EXISTS vector;`
  - Logs current vector extension version
  - Idempotent (skips if already enabled)
- **Test:** `npx tsx src/scripts/enable-pgvector.ts` — completes without error  
  *(if Neon doesn't grant CREATE EXTENSION to app role: stop and ask Bernard to run it manually)*
- **Commit:** `feat(studio): add pgvector enable script for fieldnotes embeddings`

### A2. Lines collection (addendum §1)

- **Files:**
  - `src/collections/Lines.ts` (new)
  - `src/payload.config.ts` (register)
- **Schema** (exact, from addendum §1):
  - `name` (text, required)
  - `description` (text, optional)
  - `status` (select, required, default `active`): `active` | `dormant` | `closed`
  - `recordOrigin` (select, default `user`): `user` | `small-model`
  - `timestamps: true` (createdAt/updatedAt automatic)
- **Access:** auth-only. Admin or artist may CRUD.
- **Acceptance:** `npm run generate:types` produces `Line` interface; visible in `/admin`
- **Test:** `npx tsc --noEmit`; create one Line in admin, confirm save
- **Commit:** `feat(studio): add Lines collection for active investigations`

### A3. StudioConversations collection (addendum §3)

- **Files:** `src/collections/StudioConversations.ts`, register in config
- **Schema** (exact, from addendum §3):
  - `messages` (array of `{ role: 'user' | 'assistant', content: text, timestamp: date }`)
  - `summary` (textarea — written by small model after conversation ends)
  - `lines` (relationship → lines, hasMany, optional)
  - `relatedArtwork` (relationship → artworks, optional)
  - `relatedEpisode` (relationship → episodes, optional — leave `relationTo: 'episodes'` and add Episodes collection next so the reference resolves)
  - `summaryEmbedding` (`type: 'json'` for now; switch to a real pgvector column once the Drizzle adapter supports it cleanly — until then store as JSON of `number[]`)
  - `recordOrigin` (select, default `user`): `user`
- **Acceptance:** types regen; admin visible
- **Test:** `npx tsc --noEmit`
- **Commit:** `feat(studio): add StudioConversations collection for long-form small-model dialogue`

### A4. PatternReport collection (addendum §4)

- **Files:** `src/collections/PatternReports.ts`, register in config
- **Schema:**
  - `weekStart` (date, required) — Monday of the report week
  - `patterns` (array of `{ kind: 'visual-motif' | 'conceptual-theme' | 'location' | 'material' | 'line-momentum', label, sampleFieldNotes (relationship hasMany), sampleArtworks (relationship hasMany), score (number) }`)
  - `digestSummary` (textarea — short prose summary surfaced in the digest)
  - `recordOrigin` (select, default `small-model`)
- **Access:** read-only for non-admins; small-model job writes via overrideAccess
- **Acceptance:** types regen; admin visible
- **Test:** `npx tsc --noEmit`
- **Commit:** `feat(studio): add PatternReport collection for weekly cross-corpus surfacing`

### A5. Episodes collection

- **Files:** `src/collections/Episodes.ts`, register in config
- **Schema** (from Studio spec §Episodes tab, plus addendum's `lines`):
  - `title`, `series` (select: `outsider-art-review` | `rap-critic` | `studio-fails` | `studio-series`)
  - `status` (select: `concept`|`storyboard`|`shot`|`uploaded`|`edited`|`posted`)
  - `concept` (textarea), `shotList` (textarea)
  - `storyboard` (array of `{ name, mediaType, notes }`)
  - `assembly` (array of `{ beatName, clipId: relationship → field-notes, notes }`)
  - `captionDrafts` (array of `{ text, channel }`)
  - `lines` (relationship → lines, hasMany, optional)
  - `clips` (join field, `relationTo: 'field-notes'`, `on: 'relatedEpisode'`)
- **Acceptance:** types regen, admin visible
- **Test:** `npx tsc --noEmit`
- **Commit:** `feat(studio): add Episodes collection for MoP videos`

### A6. FieldNotes collection (Brief 07 + addendum §2)

- **Files:**
  - `src/collections/FieldNotes.ts` (new)
  - `src/payload.config.ts` (register)
  - `src/access/isStaff.ts` if not already present (reuse `requireStaff` pattern)
- **Schema — user-set** (Brief 07):
  - `mediaType` (select): `text` · `photo` · `video-broll` · `video-observation` · `video-performance` · `video-process` · `voice-memo`
  - `capturedAt` (date, defaults to upload time)
  - `city`, `locationName` (text, optional)
  - `location` (group `{ lat: number, lng: number }`, optional)
  - `mediaFile` (upload → media, optional for `text` type)
  - `writtenNote` (textarea)
  - `relatedArtwork` (relationship → artworks)
  - `relatedEpisode` (relationship → episodes)
  - `processingStatus` (select, default `pending`): `pending` · `processing` · `complete` · `failed`
- **Schema — addendum §2 optional fields:**
  - `register` (select, optional): `exploratory` · `resolved` · `frustrated` · `excited` · `observational`
  - `processStage` (select, optional): `early` · `mid` · `late` · `completed`
  - `conceptualThread` (select, optional, expandable list): `daguerreotype` · `wet-plate` · `aerial` · `digital` · `layering` · `light-quality` · `historical-angle`
  - `lines` (relationship → lines, hasMany, optional)
- **Schema — server-set:**
  - `audioTranscript` (textarea)
  - `transcriptType` (select): `shooter-description` · `speech` · `none`
  - `keyframes` (array of `{ timestamp: number, imageUrl: text, tags: array of text }`)
  - `detectedLanguage` (text)
  - `duration` (number, seconds)
  - `transcriptEmbedding` (json — same JSON-array workaround as A3)
  - `recordOrigin` (select): `user` · `pipeline` · `small-model`
- **Access:** auth-only; admin or artist may CRUD; server-set fields readable but only writable by pipeline (overrideAccess).
- **Acceptance:** `npm run generate:types` produces a `FieldNote` interface with every field above
- **Test:** `npx tsc --noEmit`; create one record in admin (mediaType `text`, writtenNote only), confirm save
- **Commit:** `feat(studio): add FieldNotes collection with addendum tagging fields`

### A7. Extend Artworks with process media + lines

- **Files:** `src/collections/Artworks.ts`
- **Changes** (additive — do not move existing fields):
  - `processPhotos` join field (`relationTo: 'field-notes'`, `on: 'relatedArtwork'`)
  - `timelapseFile` (upload → media, optional)
  - `finalReferenceImage` (upload → media, optional, distinct from `primaryImage`)
  - `lines` (relationship → lines, hasMany, optional)
- **Acceptance:** types regen; existing fields untouched
- **Test:** `npx vitest run tests/unit/buildArtworkPatch.spec.ts` (regression check)
- **Commit:** `feat(studio): extend Artworks with processPhotos, timelapse, reference image, lines`

### A8. Extend Sessions: episode session types + lines relation

- **Files:** `src/collections/Sessions.ts`
- **Changes:**
  - Add `episode-storyboard` and `episode-assembly` to the `sessionType` select options (reserved for Phase F4; hooks and prompts untouched here)
  - Add `lines` (relationship → lines, hasMany, optional) so Art/Official sessions can be tied to active investigations
- **Acceptance:** `payload-types.ts` regenerates with both additions; existing session types unaffected
- **Test:** `npx tsc --noEmit`; existing Art/Official tests still pass (`npx vitest run tests/unit/agentTools.spec.ts tests/unit/buildArtworkPatch.spec.ts`)
- **Commit:** `feat(studio): reserve episode session types and add lines relation on Sessions`

**Phase A gate:** all 8 commits land on `feat/studio`. `npm run dev` boots; every collection visible in `/admin`; existing Art/Official sessions still work end-to-end.

---

## 4. Phase B — /studio auth + shell

**Refs:** `studio-app-spec.md` §Auth, §Entry Point

### B1. Middleware to protect /studio/*

- **Files:** `middleware.ts` (repo root — new)
- **Behavior:**
  - Match path `^/studio(?!/login)(/.*)?$`
  - Read Payload session cookie (`payload-token`)
  - If absent or invalid, redirect to `/studio/login?from=<encoded path>`
- **Acceptance:** `/studio` redirects to `/studio/login` when logged out; lands on `/studio` when logged in
- **Test:** add `tests/unit/middleware.spec.ts` with token presence/absence cases (mock NextRequest)
- **Commit:** `feat(studio): add middleware to protect /studio routes`

### B2. /studio/login page

- **Files:**
  - `src/app/(frontend)/studio/login/page.tsx`
  - `src/app/(frontend)/studio/login/LoginForm.tsx` (client component)
  - `src/app/(frontend)/studio/login/login.scss`
- **Behavior:**
  - POST `email`+`password` to `/api/users/login` (Payload's built-in REST)
  - On 200, redirect to `from` query param or `/studio`
  - Style: same typographic family as `bernardbolter.com`, NOT Payload admin chrome
- **Acceptance:** valid creds log in; invalid show inline error
- **Test:** Playwright `tests/e2e/studio-login.spec.ts` (use existing test user)
- **Commit:** `feat(studio): add custom login page at /studio/login`

### B3. /studio layout + tab shell

- **Files:**
  - `src/app/(frontend)/studio/layout.tsx`
  - `src/app/(frontend)/studio/page.tsx` (defaults to Upload tab)
  - `src/components/studio/TabBar.tsx`
  - `src/components/studio/studio.scss`
- **Behavior:**
  - Layout fetches current user server-side; if missing, redirect to login (defense-in-depth)
  - Bottom tab bar on mobile, top on desktop, 5 tabs: Upload / Paintings / Notes / Episodes / Digest
  - Each tab routes to `/studio/<tab>` — stub pages OK at this step
- **Acceptance:** tabs render, route correctly; mobile breakpoints match brand
- **Test:** `npx tsc --noEmit`; manual check on mobile viewport
- **Commit:** `feat(studio): add /studio layout with five-tab navigation`

### B4. /studio/logout endpoint

- **Files:** `src/app/(payload)/api/studio/logout/route.ts`
- **Behavior:** POST clears `payload-token` cookie, returns 200
- **Acceptance:** after POST, `/studio` redirects to login
- **Test:** Playwright extends B2 spec
- **Commit:** `feat(studio): add logout endpoint and tab-bar action`

**Phase B gate:** Bernard can log in, see the shell, log out.

---

## 5. Phase C — Upload flow (no processing yet)

**Refs:** `studio-app-spec.md` §Upload Tab, §Notes for Cursor — presigned URL pattern

### C1. Presigned URL endpoint

- **Files:** `src/app/(payload)/api/studio/upload-url/route.ts`
- **Behavior:**
  - POST `{ filename, contentType }` → 200 `{ uploadUrl, objectKey, publicUrl }`
  - Uses existing S3 client config from `s3Storage`; key prefix `field-notes/{YYYY}/{MM}/{uuid}-{filename}`
  - Auth: require session cookie; reject if no user
- **Acceptance:** PUT against returned URL with correct content-type succeeds
- **Test:** `tests/unit/uploadUrl.spec.ts` — mocks S3 client, asserts key shape and auth gate
- **Commit:** `feat(studio): add presigned upload URL endpoint for FieldNotes`

### C2. Confirm-upload endpoint + Media record

- **Files:** `src/app/(payload)/api/studio/upload-confirm/route.ts`
- **Behavior:**
  - POST `{ objectKey, filename, mimeType, size }` → creates a Media doc pointing at the R2 object (does NOT re-upload), returns the Media id
- **Acceptance:** Media doc exists; can be referenced by FieldNote
- **Test:** unit test mocking payload.create
- **Commit:** `feat(studio): register R2-uploaded files as Media records`

### C3. Create-fieldnote endpoint

- **Files:** `src/app/(payload)/api/studio/field-notes/route.ts`
- **Behavior:**
  - POST `{ mediaType, mediaFileId, writtenNote?, city?, locationName?, location?, capturedAt?, relatedArtwork?, relatedEpisode?, lines?, register?, processStage?, conceptualThread? }`
  - Creates FieldNote with `processingStatus: 'pending'`, `recordOrigin: 'user'`
  - All addendum tagging fields are optional and pass-through; validate select values against the collection enums
  - Returns `{ id, processingStatus }`
  - Calls a stub `queueProcessFieldNote(id)` — implemented in D2
- **Acceptance:** record persists; pending status set; lines/register/processStage/conceptualThread survive the round trip
- **Test:** unit + e2e (upload → confirm → create with at least one optional tag set)
- **Commit:** `feat(studio): add field-note create endpoint`

### C4. Lines inline-create endpoint (addendum §1 "creating a Line")

- **Files:** `src/app/(payload)/api/studio/lines/route.ts`
- **Behavior:**
  - `GET ?q=<text>` returns the top 10 `active` Lines whose `name` matches case-insensitive (for the upload form dropdown)
  - `POST { name, description? }` creates a new Line with `status: 'active'`, `recordOrigin: 'user'`, returns `{ id, name }`
- **Why:** addendum §1 — "creating a Line must be faster than deciding not to". The form needs to create inline without leaving the upload flow.
- **Test:** unit (search + create); e2e covered in C5
- **Commit:** `feat(studio): add Lines search and inline-create endpoint`

### C5. Upload tab UI

- **Files:**
  - `src/app/(frontend)/studio/page.tsx` (Upload is default)
  - `src/components/studio/UploadForm.tsx` (client)
  - `src/components/studio/LinesPicker.tsx` (client — searchable multi-select with inline "+ New Line" affordance)
  - `src/components/studio/uploadForm.scss`
- **Behavior:**
  - File input → presigned PUT → upload-confirm → create field-note
  - Tag-to dropdown searches `/api/artworks` and `/api/episodes`
  - **Lines picker** — searches `/api/studio/lines?q=…`; when no match, a "+ Create Line ‘<query>’" option calls POST `/api/studio/lines` and immediately attaches the new id
  - Optional tagging row: `register`, `processStage`, `conceptualThread` (small chip-style selects, hidden under a "More" disclosure on narrow viewports so the form stays fast for the common case)
  - Reads/writes `last-city` to `localStorage` for prefill
  - Optimistic success toast; form resets but keeps the most recent Lines selection ready to reuse for the next upload (common pattern: many clips, same Line)
- **Acceptance:**
  - Uploading a photo on mobile creates a FieldNote with `mediaType: photo`, `processingStatus: pending`
  - Creating a Line inline finishes upload without a separate navigation
  - Selected Lines persist between uploads in the same session (cleared on logout)
- **Test:** Playwright `tests/e2e/studio-upload.spec.ts` — covers (a) upload with existing Line and (b) upload that inline-creates a new Line
- **Commit:** `feat(studio): add fast-capture upload form with Lines inline-create`

**Phase C gate:** Bernard can upload a file from phone and see a pending FieldNote in `/admin`.

---

## 6. Phase D — Job queue scaffolding

**Refs:** `studio-app-spec.md` §Processing Pipeline — Hetzner

### D1. Install pg-boss + queue helpers

- **Files:**
  - `package.json` (add `pg-boss`)
  - `src/lib/queue/pgboss.ts` — exports `getBoss()` singleton
  - `src/lib/queue/jobs.ts` — typed job names + payload types
- **Acceptance:** `pg-boss` tables auto-create against `DATABASE_URL` on first `getBoss()` call (use Neon's `pgboss` schema)
- **Test:** `tests/unit/pgboss.spec.ts` — mocks pg, asserts boot once
- **Commit:** `feat(queue): add pg-boss client and typed job names`

### D2. Wire create-fieldnote to enqueue process-fieldnote

- **Files:**
  - `src/app/(payload)/api/studio/field-notes/route.ts` (replace stub from C3)
  - `src/lib/queue/enqueue.ts`
- **Behavior:** on create, `boss.send('process-fieldnote', { fieldNoteId })`
- **Acceptance:** new field note → row in `pgboss.job` table with state `created`
- **Test:** unit test mocks `boss.send`; integration test reads pg-boss table
- **Commit:** `feat(queue): enqueue process-fieldnote on upload`

### D3. Worker entry script (stubs only)

- **Files:**
  - `src/workers/index.ts` (boots all handlers)
  - `src/workers/handlers/processFieldNote.ts` — logs payload, marks `processingStatus: complete` for `text` type only; leaves others `pending` with a `# REQUIRES HETZNER` comment
  - `src/workers/handlers/generateTimelapse.ts` — stub
  - `src/workers/handlers/suggestTags.ts` — stub
  - `src/workers/handlers/generateEmbeddings.ts` — stub. **Scope (when implemented in E/G):** generates embeddings for FieldNote `audioTranscript`, FieldNote `writtenNote`, Artwork `intent` + `artHistoricalContext` + `descriptionLong`, Episode `concept` + storyboard beats, and **StudioConversation `summary`** (addendum §3).
  - `src/workers/handlers/suggestLines.ts` — stub. Future job (Phase H) compares new FieldNote embeddings against Line descriptions + existing Line-tagged material, writes candidates to FieldNote `suggestedLines`.
  - `src/workers/handlers/patternReport.ts` — stub. Future weekly job (Phase H) writes `PatternReport` rows.
  - `src/workers/README.md` — how Bernard runs the worker on Hetzner (`node dist/workers/index.js`) and what env vars it needs
- **Acceptance:** running `npx tsx src/workers/index.ts` locally picks up a queued job and updates the FieldNote
- **Test:** `tests/unit/workers/processFieldNote.spec.ts`
- **Commit:** `feat(queue): add pg-boss worker entry with stub handlers`

**Phase D gate:** locally, an uploaded `text` note transitions `pending → complete`. Other types stay `pending` until Phase E.

---

## 7. Phase E — Hetzner processing (mixed: code + setup)

**Refs:** `brief-07-footage-pipeline.md` §Processing Pipeline; `studio-app-spec.md` §5

**NEEDS BERNARD before any of these:**
- Hetzner CAX11 provisioned, Ubuntu, Docker
- `DATABASE_URL` and `R2_*` env vars reachable from the server
- `ffmpeg`, Python with `whisper` + `moondream` installed (or Docker images chosen)

Code-only sub-steps the agent can do without server access:

### E1. ffmpeg wrapper

- **Files:** `src/workers/lib/ffmpeg.ts`
- **Behavior:** `extractKeyframes(localPath, { count: N }) → [{ timestamp, path }]`; `extractAudio(localPath) → wavPath`
- **Test:** integration test marked `skipIf(!process.env.HAS_FFMPEG)` — runs on Hetzner CI only
- **Commit:** `feat(pipeline): add ffmpeg helpers for keyframe + audio extraction`

### E2. Whisper client

- **Files:** `src/workers/lib/whisper.ts`
- **Behavior:** posts wav file to a local Whisper HTTP sidecar (`WHISPER_URL`, default `http://127.0.0.1:9000`); returns `{ text, language }`
- **Bernard runs** the sidecar (e.g. `ahmetoner/whisper-asr-webservice` docker image)
- **Test:** mocked HTTP; integration test gated by env
- **Commit:** `feat(pipeline): add whisper transcription client`

### E3. Moondream client

- **Files:** `src/workers/lib/moondream.ts`
- **Behavior:** posts image file to local Moondream sidecar; returns `tags[]` and short caption
- **Test:** mocked HTTP
- **Commit:** `feat(pipeline): add moondream visual tagging client`

### E4. Real process-fieldnote handler

- **Files:** `src/workers/handlers/processFieldNote.ts` (replace stub)
- **Behavior:** branch on `mediaType` per the table in Brief 07; download from R2 → run pipeline → upload keyframes to R2 → write back transcript + keyframes + `transcriptType` correctly (`shooter-description` for `video-broll`, `speech` otherwise) → mark `complete`
- **Test:** unit covers branching; integration on Hetzner
- **Commit:** `feat(pipeline): implement full process-fieldnote handler`

### E5. Timelapse generation

- **Files:** `src/workers/handlers/generateTimelapse.ts`
- **Behavior:** sequence per `studio-app-spec.md` §Timelapse generation
- **Commit:** `feat(pipeline): implement timelapse generation handler`

**Phase E gate:** Bernard uploads a `video-broll`, worker on Hetzner processes it end-to-end. Until Hetzner is live, E1–E5 ship with all unit tests passing and clear `# REQUIRES HETZNER` comments at the top of each handler.

---

## 8. Phase F — Studio tabs

### F1. Paintings tab

- **Files:**
  - `src/app/(frontend)/studio/paintings/page.tsx` (list, RSC)
  - `src/app/(frontend)/studio/paintings/new/page.tsx`
  - `src/app/(frontend)/studio/paintings/[id]/page.tsx`
  - `src/components/studio/PaintingCard.tsx`, `PaintingDetail.tsx`, `ProcessTimeline.tsx`, `TimelapsePlayer.tsx`
- **Acceptance:** list of artworks sorted by `updatedAt desc`; create form; detail page renders process photos (FieldNotes where `relatedArtwork = id`), timelapse player when `timelapseFile` set, link to `/admin/collections/artworks/<id>` for full edit
- **Test:** Playwright list + create + detail
- **Commit:** `feat(studio): add Paintings tab with timeline and timelapse`

### F2. Notes (FieldNotes) tab

- **Files:**
  - `src/app/(frontend)/studio/notes/page.tsx`
  - `src/app/(frontend)/studio/notes/[id]/page.tsx`
  - `src/components/studio/FieldNoteCard.tsx`, `FieldNoteDetail.tsx`, `FieldNoteFilters.tsx`, `LineSuggestionList.tsx`
- **Acceptance:**
  - Filter bar: mediaType, untagged, city, painting, episode, Line, register, processStage, conceptualThread, date range
  - Detail shows: transcript, keyframes, visual tags, written note editor, tag-to assignment (painting + episode), Lines picker, register / processStage / conceptualThread selectors
  - **Line suggestions panel** (addendum §1 "post-hoc connection surfacing"): when the nightly embedding job tags a FieldNote with candidate Lines (stored under `suggestedLines` json-field on the FieldNote — add this in F2 itself with a tiny schema patch step), the detail page shows them as one-tap-confirm chips. Confirming attaches the Line; dismissing clears the suggestion.
- **Test:** Playwright filter + tag assignment + Line suggestion confirm
- **Commit:** `feat(studio): add Notes tab with filterable library and Line suggestions`

### F3. Episodes tab — list + create + detail (no Claude sessions yet)

- **Files:**
  - `src/app/(frontend)/studio/episodes/page.tsx`
  - `src/app/(frontend)/studio/episodes/[id]/page.tsx`
  - Stubs for storyboard and assembly editors
- **Acceptance:** episodes grouped by series; create form; detail shows clips
- **Commit:** `feat(studio): add Episodes tab list and detail`

### F4. Episodes storyboard + assembly Claude sessions

- Reuses the pattern from `src/app/(payload)/api/art-official/chat`
- Uses session types `episode-storyboard` and `episode-assembly` (reserved in Phase A6 — already on the schema)
- New system prompt blocks: `src/lib/artOfficial/promptBlocks.ts` — `buildEpisodeStoryboardBlock()` and `buildEpisodeAssemblyBlock()`
- Storyboard session writes structured beat list back to `Episodes.storyboard`
- Assembly session loads episode beats + all FieldNotes where `relatedEpisode = id` (transcripts, visual tags, mediaType, duration), writes back to `Episodes.assembly`
- Reuse existing chat UI route — switch on `sessionType` to render the right sidebar (no full duplicate)
- **Test:** unit tests for the two prompt blocks; one Playwright happy-path per session type
- **Commit:** `feat(studio): episode storyboard and assembly chat sessions`

### F5. Digest tab — read-only

- **Files:**
  - `src/app/(frontend)/studio/digest/page.tsx`
  - `src/components/studio/digest/LinesSection.tsx`, `PatternsSection.tsx`, `PracticeOverview.tsx`
  - `src/lib/studio/digest.ts`
- **Acceptance:** aggregates open paintings, untagged FieldNotes count, episode bucket counts, open Art/Official sessions, practice overview
- **Lines section (addendum §5):**
  - Active Lines with new material this week
  - Embedding-suggested connections (untagged FieldNotes close to a Line) — confirmable inline
  - Dormant Lines (no new material in 30 days) — surface for review with "keep open" / "close" actions
  - New-Line suggestions from the small-model job — name proposed, you confirm or dismiss
- **Pattern report section (addendum §4):** renders the most recent `PatternReport` record — list of detected patterns linking to the underlying material. Read-only.
- **Practice awareness pattern layer (addendum §6):** long-view section (separate from the weekly summary) — longest-running Lines, register patterns across periods, processStage distribution, conceptualThread frequency, quiet-period gaps. Pure read computed from existing data.
- **Test:** Playwright happy-path rendering; unit tests for `digest.ts` aggregators
- **Commit:** `feat(studio): add Digest tab with Lines, pattern report, and practice awareness`

**Phase F gate:** all five tabs functional with real data.

---

## 9. Phase G — Small-model router (parallel branch)

**Branch:** `feat/router` (separate from `feat/studio` to allow parallel agent runs)  
**Refs:** `small-model-architecture.md` §Router

### G1. Add taskHint to chat route

- **Files:** `src/app/(payload)/api/art-official/chat/route.ts`
- Add optional `taskHint` to request body type. Default route still Claude. No behavior change yet.
- **Commit:** `feat(router): accept taskHint on art-official chat route`

### G2. Groq client + small-model task dispatcher

- **Provider — DECIDED:** Groq + Llama 3.1 8B for in-session routing (G3–G6). Reason: lowest latency, critical when calls run inside a live Art/Official turn. Together AI stays an option for batch enrichment (G7) but is not wired in this phase — keep the client interface provider-agnostic so a swap is one config change later.
- **Files:**
  - `src/lib/router/smallModelClient.ts` — generic OpenAI-compatible client, takes `{ baseUrl, apiKey, model }`
  - `src/lib/router/groq.ts` — preset for Groq (`baseUrl: https://api.groq.com/openai/v1`, `model: 'llama-3.1-8b-instant'`)
  - `src/lib/router/handleSmallModelTask.ts`
  - `src/lib/router/routeRequest.ts`
- Uses `fetch` only — no new SDK dependency
- Reads `GROQ_API_KEY` from env; throws **only** when a small-model route is actually invoked (so existing Claude path keeps working without the key set)
- **Test:** mock `fetch`; unit assertions on prompt shape and headers
- **Commit:** `feat(router): add Groq client and small-model dispatcher`

### G3. Dimension parser route

- **Files:** `src/lib/router/tasks/parseDimensions.ts`
- Input: free-text dimension string. Output: `{ widthCm, heightCm, depthCm? }`
- Strong unit tests covering `"60 x 80"`, `"60×80cm"`, `"60 by 80 inches"`, `"180 x 200 x 5"`
- Wire into Art/Official sidebar: when artist types into dimension fields, debounce → POST with `taskHint: 'dimension-parse'`
- **Commit:** `feat(router): implement dimension parsing via small model`

### G4. Tag suggestion route

- Input: medium + series + image analysis
- Output: candidate `movementTags`, `styleTags`, `subjectTags`, `genreTags`, `periodTags`
- Surfaces in Art/Official as a confirmable list
- **Commit:** `feat(router): implement tag suggestion via small model`

### G5. Authority URI lookup route

- For confirmed tag labels → AAT/ULAN/TGN/Iconclass URIs
- Uses Wikidata search first (reuses `src/lib/artOfficial/externalLookups`), Getty SPARQL second
- **Commit:** `feat(router): implement authority URI lookup`

### G6. Quality monitoring background job

- **Files:** `src/workers/handlers/qualityMonitor.ts`
- Triggered on session completion; reads timeline + messages; writes `weakPhases`, `dialogueRefinementFlag`, `blindDescriptionUseful`, `formalContributionAccuracy`
- **Commit:** `feat(router): post-session quality monitoring job`

### G7. Bulk enrichment script

- **Files:** `src/scripts/enrich-back-catalogue.ts`
- Runs the operations listed in `small-model-architecture.md` §1.6
- Idempotent; respects `recordOrigin: enrichment-agent`
- **Commit:** `feat(router): add bulk enrichment script for back-catalogue`

**Phase G gate:** end-to-end Art/Official session uses small model for dimensions, tags, URIs; no regression vs Claude-only baseline.

---

## 10. Phase H — Deferred (Phase 2 in the spec + addendum extensions)

Build only after F is stable in use. Each item can be its own one-phase plan when Bernard signals readiness.

**From the core spec (Phase 2):**
- H1. Weekly Social session (small-model prep + Claude session + StudioPosts collection)
- H2. Exhibition / presentation session (Claude reasoning over the archive → PDF export)
- H3. Inquiries collection + painting-detail integration
- H4. Print and Supply tracking (Vendure-dependent)

**From the addendum:**

### H5. Studio Conversation interface (addendum §3)

- **Files:**
  - `src/app/(frontend)/studio/conversations/page.tsx` (list)
  - `src/app/(frontend)/studio/conversations/[id]/page.tsx` (chat view)
  - `src/app/(payload)/api/studio/conversations/chat/route.ts` — SSE stream against the small model (reuses the Groq/Ollama client from Phase G2)
  - `src/lib/studio/conversationPrompt.ts` — assembles the minimal system prompt: practice paragraph + instruction to ask short follow-ups + active Lines + semantically-relevant recent FieldNotes (pgvector lookup)
  - `src/workers/handlers/summarizeConversation.ts` — runs on conversation close, writes `summary` and `summaryEmbedding` back to the record
- **Acceptance:**
  - Bernard can open a conversation, write, get short prompts, close it
  - Summary is generated and stored
  - Conversation is searchable in the Notes-style library via summary embedding similarity
- **Commit pattern:** one commit per file group; final commit `feat(studio): add Studio Conversation interface with embedding pipeline`

### H6. Lines embedding-suggestion job (addendum §1 post-hoc connection surfacing)

- **Files:** `src/workers/handlers/suggestLines.ts` (replace stub from D3)
- **Behavior:** nightly job compares each unflagged FieldNote with `transcriptEmbedding` against `Lines.description` embeddings + average embedding of existing Line-tagged material; writes top-3 candidates to FieldNote `suggestedLines`
- **Commit:** `feat(studio): nightly Line suggestion job for untagged FieldNotes`

### H7. Cross-corpus pattern surfacing (addendum §4)

- **Files:** `src/workers/handlers/patternReport.ts` (replace stub from D3); cron entry in `src/workers/index.ts` for Sunday 22:00 Europe/Berlin
- **Behavior:** weekly small-model + embedding-similarity pass detects visual motifs, conceptual themes, locations, materials, Line-momentum; writes a `PatternReport` row with a short `digestSummary`
- **Commit:** `feat(studio): weekly cross-corpus pattern surfacing job`

### H8. Studio Conversation surfacing into other sessions

- Storyboard, assembly, and weekly-social sessions (Phase F4 / H1) take an extra context block: the most recent N studio-conversation summaries, retrieved by embedding similarity against the current session's topic
- Implementation: add `loadStudioConversationContext()` helper to `src/lib/artOfficial/buildSystemPrompt.ts` and gate behind a session-type allowlist
- **Commit:** `feat(studio): inject Studio Conversation summaries into storyboard/assembly/social sessions`

---

## 11. Auto-agent runbook

A single Cursor background agent (or Codex CLI agent) per phase. Suggested invocation:

```
Branch: feat/studio
Plan section: Phase A — Schema foundation
Constraints:
  - Read docs/fieldNotes/build-plan-studio-and-pipeline.md
  - Implement steps A1–A5 in order
  - Run the test command listed for each step
  - Run `npx tsc --noEmit` before each commit
  - Use the exact commit message template
  - Stop and report if any test fails twice or if a step is marked NEEDS BERNARD
  - Do not modify .env or commit secrets
```

Re-run with the next phase name on the same branch (A → B → C → D → F → E).

For Phase G, run on `feat/router` in parallel from the start.

**Estimated agent time per phase** (Sonnet/Opus class):

| Phase | Steps | Approx wall-clock |
|---|---|---|
| A | 8 | 60–90 min |
| B | 4 | 45–60 min |
| C | 5 | 75–120 min |
| D | 3 | 30–45 min |
| E | 5 | 60–90 min (code only; Hetzner setup separate) |
| F | 5 | 100–140 min |
| G | 7 | 90–120 min |
| H | 8 | scheduled later, one chunk per item |

---

## 12. Decisions log

All five open decisions from the original draft resolved on May 28, 2026:

1. **R2 bucket layout** — same `artwork` bucket, prefix `field-notes/YYYY/MM/…`.
2. **Login UX** — password (Payload built-in).
3. **Phase D/E without a live Hetzner** — ship the code, ship the stubs, defer integration testing until the server exists.
4. **Episode session types** — added in Phase A6 (reserved on `Sessions.sessionType` now, wired in F4).
5. **Small-model provider** — Groq + Llama 3.1 8B for in-session (lowest latency). Client interface stays provider-agnostic so Together AI can take batch enrichment later without a refactor.
6. **Addendum scope** — Lines, richer FieldNote tagging, StudioConversations, and PatternReport collections all land in Phase A so the data structure is present from day one. UI for Studio Conversation, pattern surfacing, and Line suggestions ships in Phase H (deferred Phase 2).

Any future open question lands here as a new entry, dated.

---

*Written May 28, 2026. Update as phases land.*
