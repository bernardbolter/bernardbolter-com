# /studio — App Specification
## bernardbolter.com · Private Studio Tools
*May 2026 — Phase 1 & 2 build specification*

---

## Overview

A private studio management tool living at `bernardbolter.com/studio`. Built on the existing Next.js and Payload v3 stack, protected by Payload auth, connected to the existing Neon Postgres database. All heavy processing — transcription, visual tagging, video pipeline, small model inference — runs on a Hetzner CAX11 server via a background job queue.

This is not a separate application. It is a protected section of bernardbolter.com with its own routes, sharing the same database, auth, and deployment as the public site.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (latest stable), Tailwind, deployed on Vercel |
| CMS / Auth | Payload v3, connected to Neon |
| Database | Neon (Postgres with pgvector) |
| File storage | Cloudflare R2 |
| Processing server | Hetzner CAX11 (4 vCPU ARM64, 4GB RAM) |
| Job queue | pg-boss (Postgres-backed, no Redis required) |
| Transcription | Whisper (medium model, CPU, on Hetzner) |
| Visual tagging | Moondream (CPU, on Hetzner) |
| Video processing | FFmpeg (on Hetzner) |
| Small model | Ollama + Mistral 7B or Phi-4-mini (on Hetzner) |
| Reasoning model | Anthropic API — Claude (remote call from Next.js) |

---

## Auth

Payload v3 built-in users collection. No third-party auth service required.

- Single user — one account created in Payload admin
- Custom login page at `/studio/login` — styled as part of bernardbolter.com, not the Payload admin UI
- `middleware.ts` in Next.js protects all routes under `/studio/*` — checks for valid Payload session cookie, redirects to `/studio/login` if absent
- Session cookie set on login, cleared on logout
- Payload admin remains at `/admin` as usual — separate from the studio interface

---

## Entry Point — /studio

The landing screen after login. Optimised for mobile — fast upload with tags is the primary action.

**Layout:** Tab bar across the top (or bottom on mobile) with five tabs:

| Tab | Purpose |
|---|---|
| **Upload** | Default tab — fast media upload with tagging |
| **Paintings** | Painting records, process photo timelines |
| **Notes** | FieldNotes library — browse, search, manage |
| **Episodes** | MoP episode management and storyboard |
| **Digest** | Weekly overview — open items across the practice |

Upload is the default tab on load. Everything else is one tap away.

---

## Phase 1

### 1. Upload Tab — Fast Capture

The primary mobile interface. Designed for one-handed use in the studio or in the field.

**Upload form fields:**

| Field | Type | Notes |
|---|---|---|
| `mediaFile` | File input | Photo, video, or audio. Accepts from camera roll or camera directly |
| `mediaType` | Select | `photo` · `video-broll` · `video-observation` · `video-performance` · `video-process` · `voice-memo` · `text` |
| `writtenNote` | Text (optional) | Short note. For `text` type this is the content |
| `tagTo` | Select — Painting or Episode | Optional. Search/select from existing paintings or episodes |
| `city` | Text (optional) | Pre-fills from last used value |
| `locationName` | Text (optional) | Human-readable place name |

**Behaviour on submit:**
1. File uploads directly to R2
2. FieldNote record created in Postgres with `processingStatus: pending`
3. Processing job added to pg-boss queue on Hetzner
4. UI confirms upload immediately — no waiting for processing
5. Processing happens in background — Whisper, Moondream, FFmpeg as appropriate for `mediaType`

**Mobile considerations:**
- Large tap targets
- File input triggers native camera roll / camera on mobile
- City field pre-fills from last used value to reduce repeat entry
- Form resets after submit, ready for next upload immediately

---

### 2. Paintings Tab

**Painting list view:**
- All paintings, ordered by most recently updated
- Each entry shows: title, thumbnail if available, process photo count, processing status indicator
- Tap to open painting detail

**Create new painting:**
- Simple form: title, medium, series (optional)
- Creates a painting record in Payload — connects to the Art/Official schema
- No blocking fields — title is enough to start

**Painting detail view:**

| Section | Content |
|---|---|
| Header | Title, medium, series, status |
| Final image | The high-res reference photo if uploaded |
| Process timeline | All process photos in chronological order, raw grid |
| Timelapse | MP4 player if generated, generate button if not |
| Related FieldNotes | All FieldNotes tagged to this painting — clips, voice memos, text notes |
| Archive link | Link to the Art/Official archive record if it exists |

**Upload final image:**
- Dedicated upload button on the painting detail
- Marks the painting as complete
- Triggers timelapse generation job on Hetzner
- Final image becomes the color reference for the timelapse pipeline

**Timelapse generation:**
- Triggered manually from the painting detail, or automatically when final image is uploaded
- Job runs on Hetzner: canvas edge detection → crop normalisation → color correction against final image → FFmpeg assembly → MP4 stored on R2
- Status indicator on painting detail while processing
- MP4 attached to painting record on completion

---

### 3. FieldNotes Tab — Library

**List view:**
- All FieldNotes, reverse chronological
- Filter bar: mediaType, tagged/untagged, city, painting, episode, date range
- Each entry shows: thumbnail or waveform icon, mediaType, date, processing status, tag if present
- Tap to open detail

**FieldNote detail:**
- File player (video, audio, or image)
- Transcript if available (Whisper output)
- Visual tags if available (Moondream output)
- Keyframes strip for video
- Tag assignment — connect to painting or episode, searchable dropdown
- Written note field — editable

**Untagged view:**
- Filtered view showing all FieldNotes with no painting or episode tag
- Used for the retroactive tagging workflow
- Small model suggestion pass surfaces candidate connections — "this voice memo mentions photo transfer, possibly related to these paintings" — shown as suggestions, confirmed with one tap

---

### 4. Episodes Tab — MoP

**Episode list:**
- All episodes grouped by series: Outsider Art Review · Rap Critic · Studio Fails · Studio Series
- Each episode shows: title, status, clip count, series
- Status: `concept` · `storyboard` · `shot` · `uploaded` · `edited` · `posted`

**Create episode:**
- Title, series, one-line concept description
- Status defaults to `concept`

**Episode detail:**

| Section | Content |
|---|---|
| Header | Title, series, status |
| Concept | One-line description, shot list |
| Storyboard | Named beats — see Storyboard section below |
| Clips | All FieldNotes tagged to this episode |
| Assembly | Suggested clip-to-beat mapping — see Assembly section below |
| Caption drafts | Generated caption options for posting |

**Storyboard — Phase 1:**

A storyboard is a list of named beats for the episode. Each beat has:
- A name / short description
- Media type needed (performance, B-roll, etc.)
- Notes

Storyboard is created in a Claude session — you describe the episode concept and Claude helps structure the beats. The session is accessed from the episode detail page, opens a chat interface with Claude loaded with the episode context and your practice context document.

Output of the storyboard session is a structured beat list saved to the episode record.

The shot list is derived from the storyboard — one entry per beat, formatted for field use.

**Assembly session — Phase 1:**

After shooting and uploading clips tagged to the episode, the assembly session matches clips to beats.

Accessed from the episode detail page. Opens a Claude session loaded with:
- The episode storyboard (beat list)
- All FieldNotes tagged to this episode (transcripts, visual tags, mediaType, duration)

Claude suggests which clip covers which beat, flags gaps in coverage, flags multiple takes so you know which to audition first.

Output is a structured clip list — beat, suggested clip, notes — formatted as a simple document you can reference in DaVinci Resolve.

---

### 5. Processing Pipeline — Hetzner

The Hetzner server runs as a processing service. It does not serve the web app.

**Services running on Hetzner:**
- pg-boss worker — polls the job queue and executes jobs
- Ollama — Mistral 7B or Phi-4-mini, loaded on demand
- Whisper medium model
- Moondream
- FFmpeg
- The timelapse pipeline script

**Job types:**

| Job | Trigger | What it does |
|---|---|---|
| `process-fieldnote` | On upload | Runs FFmpeg, Moondream, Whisper as appropriate for mediaType. Updates FieldNote record on completion |
| `generate-timelapse` | Manual trigger or final image upload | Canvas detection, crop, color correction, FFmpeg assembly, stores MP4 to R2 |
| `suggest-tags` | Scheduled or manual | Small model pass over untagged FieldNotes, generates candidate painting/episode connections |
| `generate-embeddings` | On new text content | Text embeddings via Ollama for new FieldNote transcripts, Art/Official records, written notes |

**Queue behaviour:**
- Jobs added to pg-boss immediately on trigger
- Worker on Hetzner polls continuously, executes jobs as capacity allows
- Heavy jobs (Whisper on long clips, timelapse generation) run sequentially to avoid RAM pressure on CAX11
- Light jobs (embedding generation, tag suggestions) can run concurrently
- All jobs update `processingStatus` on the relevant record — `pending` → `processing` → `complete` / `failed`
- Failed jobs retry twice before marking as failed

**Scheduled jobs (nightly, 3am Berlin time):**
- `suggest-tags` — untagged FieldNotes suggestion pass
- `generate-embeddings` — any records missing embeddings
- `weekly-digest` — compile digest data (on digest day)

---

## Phase 2

Phase 2 builds on a populated system — meaningful once a body of material has accumulated.

### 6. Weekly Social Session

Accessed from the Episodes tab or Digest tab.

**Small model prep (runs before session):**
- Groups the past week's FieldNotes by theme, location, series
- Flags clusters of related material
- Identifies what mediaTypes are available per cluster
- Output is a structured summary ready for the Claude session

**Claude session:**
- Loaded with the weekly FieldNotes summary and your posting history
- Conversation to identify what's worth posting and why
- Drafts 3 caption options per identified post in your voice
- Outputs a posting schedule for the week

**Post record:**
- Each approved post gets a record: caption draft, source FieldNotes, target series, scheduled date
- Status: `draft` · `approved` · `posted`

---

### 7. Weekly Digest

Compiled nightly on the scheduled day (configurable — default Sunday).

**Digest surfaces:**
- Open paintings — no process photos in the past week, no Art/Official session
- Untagged FieldNotes — count and quick link to the untagged view
- Episode bank status — how many episodes per series are in each status bucket
- Open Art/Official sessions — started but not completed
- Print orders status (Phase 2, Vendure-dependent)
- Supply flags (Phase 2, Vendure-dependent)
- Practice overview — paintings created this month, sessions completed, clips uploaded

Digest is read-only. Each item links directly to the relevant record.

---

### 8. Practice Awareness

Derived from existing data — no extra capture required.

**What gets surfaced:**
- Time per painting — date range from first to last process photo
- Output rhythm — paintings completed per month, visible as a simple timeline
- Series distribution — which series has been most active
- Quiet periods — gaps in the process photo record
- Medium patterns — what materials appear most frequently across recent paintings

Accessible from the Digest tab as a practice overview section.

---

### 9. Exhibition and Presentation

A session-based tool for assembling works for a specific context.

**Trigger:** "New presentation" from the Paintings tab.

**Session:**
- You describe the context — show, application, residency, collector meeting
- Claude reasons over the archive and suggests a selection of works with a rationale
- You refine the selection
- Output options: PDF presentation (title, image, medium, dimensions, date, intent excerpt per work), plain text checklist, or structured data for export

---

### 10. Collector and Inquiry Management

A lightweight record of interest and sales connected to the archive.

**Inquiry record:**
- Painting, date, contact name, contact email, notes, status: `inquiry` · `offer` · `sold` · `declined`

**What it enables:**
- See all inquiries for a painting on the painting detail
- See all open inquiries in the Digest
- When a sale happens, provenance record updates automatically
- Over time: which works get the most interest, which series resonates with which contacts

No email integration in Phase 2 — manual entry only. Vendure handles the actual transaction when it is running.

---

### 11. Print and Supply Tracking (Vendure-dependent)

Built in tandem with Vendure setup.

**Print tracking:**
- Open orders visible in Digest
- Edition status per painting — how many sold of the edition
- Automatic status update when edition sells out

**Supply awareness:**
- Log of materials used per painting (from Art/Official medium field)
- Soft flag when a material appears frequently in recent paintings
- No hard inventory — awareness layer only

---

## Data Architecture

All collections live in Neon Postgres, managed through Payload v3.

**New collections for /studio:**

| Collection | Purpose |
|---|---|
| `FieldNotes` | All captured media — as specced in Brief 07 |
| `Episodes` | MoP episode records with storyboard and assembly |
| `StudioPosts` | Approved social posts with caption drafts and source notes |
| `Inquiries` | Collector and buyer inquiry records |
| `DigestSnapshots` | Weekly digest compiled data — stored for reference |

**Existing collections extended:**

| Collection | Extension |
|---|---|
| `Artworks` | Add `processPhotos` relation to FieldNotes, `timelapseFile` R2 path, `finalReferenceImage` |
| `Sessions` (Art/Official) | No changes — FieldNotes link via `relatedArtwork` on the FieldNote |

**Embeddings:**
pgvector enabled on Neon from the start. Text embeddings generated for:
- `FieldNotes.audioTranscript`
- `FieldNotes.writtenNote`
- `Artworks` intent and art historical context fields
- `Episodes` concept and beat descriptions

All embedding generation runs on Hetzner via Ollama, stored as vector columns in Neon.

---

## Modularity Principles

Built to grow without rebuilding.

**Data and interface are strictly separated.** The Neon database is the source of truth. The /studio web app is one interface. Future interfaces — a different client, a research tool, an AR layer — read from the same data without changes to the schema.

**Everything has a timestamp and an origin.** Every record stores `createdAt`, `updatedAt`, and `recordOrigin` — `user`, `small-model`, `claude`, `pipeline`. Provenance is preserved.

**Nothing is deleted, only archived.** Soft deletes only — `status: archived`. The corpus accumulates.

**The processing layer is stateless.** The Hetzner server holds no state — it processes jobs and writes results back to Neon. Upgrading the server, swapping models, or replacing Hetzner entirely requires no schema changes.

**The reasoning layer is pluggable.** Claude is called via the Anthropic API from Next.js API routes. The model string is a config value. As smaller models become capable enough, the same routes can point at the Hetzner Ollama instance instead.

---

## Implementation Sequence

### Phase 1

1. Hetzner CAX11 setup — Ubuntu, Docker, Ollama, Whisper, Moondream, FFmpeg, pg-boss worker
2. Payload v3 — add FieldNotes and Episodes collections to existing schema
3. Auth middleware — protect `/studio/*` routes, custom login page
4. Upload tab — mobile-optimised upload form, R2 integration, job queue trigger
5. Processing pipeline — Whisper, Moondream, FFmpeg jobs on Hetzner
6. Paintings tab — painting list, create, detail view, process photo timeline
7. Timelapse pipeline — canvas detection, color correction, FFmpeg assembly
8. FieldNotes tab — library view, filters, detail, manual tagging
9. Episodes tab — episode list, create, detail, storyboard session, assembly session
10. Untagged suggestion pass — small model job, candidate connections UI

### Phase 2

11. Weekly social session — small model prep, Claude session, post records
12. Weekly digest — nightly compile job, digest view
13. Practice awareness — derived metrics from existing data
14. Exhibition and presentation — Claude session, PDF export
15. Collector inquiry management — inquiry records, painting detail integration
16. Print and supply tracking — Vendure integration

---

## Notes for Cursor / Opus Build Planning

- Payload v3 local API should be used for all server-side data access — avoids REST overhead
- Hetzner communicates with Neon directly — same connection string as the Next.js app
- pg-boss runs in the Hetzner Node.js process — not a separate service
- R2 presigned URLs for direct client-to-R2 upload — avoids routing large files through Vercel or Hetzner
- Mobile upload: use presigned URL pattern — client gets URL from Next.js API route, uploads directly to R2, then confirms to API route which creates the FieldNote record and queues the job
- Ollama on CAX11 with 4GB RAM: load model on demand, unload after job completes — do not keep resident
- Whisper medium model fits in ~1.5GB RAM — can stay resident alongside the app layer
- All Claude sessions are stateless — full context assembled per request from Neon data, no session state on the server
- pgvector extension must be enabled on the Neon database before first embedding write

---

*Studio App Specification · May 2026*
*bernardbolter.com · Designed for handoff to Cursor + Opus build planning*
*Companion documents: small-model-architecture.md · brief-07-footage-pipeline.md · mop-llm-production-assistant.md · pro-nuance-infrastructure-summary-1.md*
