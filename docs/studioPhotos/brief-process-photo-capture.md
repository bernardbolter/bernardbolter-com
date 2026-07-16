# Brief — Process Photo Capture & Timelapse Intake
## bernardbolter.com/studio · Paintings Module
*July 2026*

---

## What this is

A build specification for the process photo workflow in the /studio app: in-app capture of painting process photos on mobile, client-side quality checking, local server storage, manual sequence management, and the final-image gate that triggers timelapse processing.

This is a capture and holding tool. No image processing happens at upload time. All processing (deskew, crop, color correction, timelapse assembly) runs as a single batch job per painting, triggered when the final reference image is uploaded.

Read alongside: `studio-app-spec.md`, `hetzner-migration-brief.md` (note: server is now Netcup VPS Lite, not Hetzner — same architecture).

---

## Core decisions locked in this brief

1. **Capture happens in-app** — the web app launches the native camera via file input capture. The user never leaves the app to shoot.
2. **No client-side cropping of process photos** — store the full frame. The server pipeline does precise canvas detection and cropping later. Tight crops destroy the edge information the pipeline needs.
3. **Process photos live on the local server disk**, not R2. They are working files for the pipeline. Final images and generated timelapse MP4s go to R2 as permanent assets.
4. **The final reference image is the gate.** Process photos accumulate as `pending`. Uploading the final image marks the painting complete and enqueues the batch processing job for all held photos.
5. **The final image is the color anchor.** All process photos are color-corrected against it. No color reference card, no per-photo correction at capture.
6. **Phone backup via Web Share API** — optional, batched per session, one tap. May be removed later once the system is trusted.
7. **`capturedAt` is immutable truth; `sortOrder` is the manual override.** Drag-and-drop reordering never touches the original timestamp.

---

## 1. Schema changes

### Paintings collection — new fields

| Field | Type | Notes |
|---|---|---|
| `widthCm` | Number | Physical canvas width |
| `heightCm` | Number | Physical canvas height |
| `depthCm` | Number (optional) | For deep-edge canvases |
| `aspectRatio` | Number (derived) | `widthCm / heightCm`. Computed on save via Payload hook, never entered manually |
| `finalImage` | Upload → R2 | The completed, artist-corrected reference photo |
| `timelapseFile` | Text | R2 path of generated MP4, written by pipeline |
| `timelapseStatus` | Select | `not-ready` · `ready-to-process` · `processing` · `complete` · `failed`. Default `not-ready` |
| `completedAt` | DateTime | Set when final image is uploaded |

Dimensions are entered at painting creation. They serve two purposes: the pipeline validates its perspective correction against the true aspect ratio, and future UI (crop guides, scale display) derives from them. Painting creation form: title (required), widthCm, heightCm (both required), medium, series (optional).

### ProcessPhotos collection — new

A dedicated collection rather than overloading FieldNotes. Process photos have a single purpose (timelapse source material) and a different storage location (local disk, not R2). Keeping them separate keeps the FieldNotes corpus clean.

| Field | Type | Notes |
|---|---|---|
| `painting` | Relation → Paintings (required) | Set at upload |
| `localPath` | Text | Absolute path on server disk, e.g. `/data/process/{paintingId}/{photoId}.jpg` |
| `capturedAt` | DateTime | From EXIF `DateTimeOriginal`. Falls back to upload time if EXIF missing. **Immutable after creation** |
| `sortOrder` | Number | Defaults to capturedAt-derived sequence. Drag-and-drop writes here |
| `sharpnessScore` | Number | Laplacian variance computed client-side at capture, stored for reference |
| `processStage` | Select (optional) | `early` · `mid` · `late` — one optional tap at upload |
| `processingStatus` | Select | `pending` · `processed` · `failed`. Default `pending` |
| `fileSize` | Number | Bytes |
| `width` / `height` | Number | Pixel dimensions of stored frame |
| `recordOrigin` | Select | Always `user` |
| `status` | Select | `active` · `archived`. Soft deletes only, per corpus principle |

Standard `createdAt` / `updatedAt` via Payload.

---

## 2. Capture flow — mobile UI

Lives in the Paintings tab. Entry points: a global "＋ Process photo" action, or a capture button on a painting detail page (pre-selects that painting).

### Step 1 — Capture

```html
<input type="file" accept="image/*" capture="environment" />
```

Launches the native camera directly. No in-browser viewfinder (no getUserMedia) — the native camera gives better quality and stabilization, and the file input approach is universally reliable on iOS Safari and Android Chrome.

Before the camera opens, show a one-line framing reminder (dismissible, remember dismissal): **"Keep all four canvas edges in frame, with margin around them."** This is the only capture-time discipline required — the pipeline's edge detection depends on it.

### Step 2 — Preview & quality check

On file return, render the photo full-width with:

- **Sharpness score** — Laplacian variance on grayscale pixels via canvas (see §5). Display as a simple traffic light:
  - Green: sharp, no message
  - Amber/red below threshold: banner — **"This one looks soft — reshoot?"** with [Reshoot] (relaunches camera, discards current) and [Keep anyway] buttons
- **EXIF read** — extract `DateTimeOriginal` client-side (e.g. `exifr` library, ~10KB). Show the captured time under the preview. Falls back to now() with a subtle "no EXIF timestamp" note.

### Step 3 — Painting select & tag

- **Painting selector** — searchable dropdown of active paintings, most-recently-used first. **Pre-filled with the last painting used** — during a studio session you're photographing the same painting repeatedly; the common case should be zero taps.
- **Inline create** — "＋ New painting" option in the dropdown opens a minimal inline form: title, widthCm, heightCm. Created immediately, selected, upload continues. Same pattern as Lines creation — creating must be faster than deciding not to.
- **processStage** — three optional buttons (`early` / `mid` / `late`), no default, skippable.

### Step 4 — Upload

Single [Upload] button. On submit:

1. POST multipart to `/api/studio/process-photo` (Next.js route on the server — app and disk are the same box, no presigned URL dance needed)
2. Server writes file to `/data/process/{paintingId}/{photoId}.jpg`
3. ProcessPhotos record created: `processingStatus: pending`, capturedAt from EXIF, sortOrder appended to end of current sequence
4. **No processing job is queued.** The photo just holds.
5. UI confirms instantly, resets to capture-ready state with the same painting still selected. Shoot → upload → shoot rhythm, one-handed.

### Step 5 — Session backup to phone (optional)

Uploaded photos accumulate in client memory for the session. A persistent pill button shows **"Save to phone (n)"**. Tapping it fires one Web Share API call with all accumulated files:

```javascript
await navigator.share({ files: sessionPhotos })
```

iOS opens the share sheet → "Save Images" → all land in the camera roll in one gesture. Clear the accumulator on success or on explicit dismiss.

- Entirely optional — upload success never depends on it
- Session-scoped: accumulator clears when the tab closes
- Cap the accumulator (e.g. 20 photos / ~100MB) to avoid memory pressure; prompt to save when the cap is near
- **Removal path:** this feature is a training wheel. It should be a single component, cleanly isolated, so it can be deleted later without touching the capture flow

---

## 3. Painting detail — process timeline view

On the painting detail page:

### Timeline grid
- All ProcessPhotos for the painting, ordered by `sortOrder`, as a thumbnail grid
- Each thumbnail shows: sequence number, capture date, sharpness indicator dot, processStage badge if set
- Header shows: photo count, date range (first → last capturedAt), elapsed days, timelapseStatus

### Drag-and-drop reorder
- Long-press to drag on mobile; standard drag on desktop
- Reordering writes new `sortOrder` values (simple approach: renumber the affected range; gaps-of-1000 strategy is unnecessary at this scale)
- `capturedAt` is never modified — a small "reset to chronological" action restores sortOrder from capturedAt if manual ordering goes wrong
- Reordering is available any time before processing; after processing it remains editable and a "re-render timelapse" action re-enqueues the job with the new order

### Photo actions
- Tap thumbnail → full view with metadata (capturedAt, sharpness, dimensions, stage)
- Archive (soft delete) — removes from sequence, record retained with `status: archived`
- Edit processStage

---

## 4. Final image & the processing gate

### Final image upload
- Dedicated **"Upload final image"** button on painting detail — **file picker, not camera**. The final image is produced outside this app (shot properly, cropped, color-corrected by the artist in post)
- Uploads to **R2** (permanent asset), stored on `Paintings.finalImage`
- Sets `completedAt`, sets `timelapseStatus: ready-to-process`

### The gate
Final image upload enqueues one pg-boss job: `generate-timelapse` with `{ paintingId }`.

The job (server-side, existing planned pipeline, restated with this brief's storage model):

1. Read all ProcessPhotos for the painting where `status: active`, ordered by `sortOrder`
2. Read files from local disk — no R2 round-trip
3. Per photo: OpenCV canvas edge detection → corner extraction → perspective transform
4. **Validate each transform against the painting's true `aspectRatio`** (from widthCm/heightCm). Detections deviating beyond tolerance are flagged, not silently accepted
5. Color-correct every frame against the final image (histogram/LUT matching)
6. Uniform output resolution derived from the painting's aspect ratio
7. FFmpeg assembly → MP4 → upload to R2 → write `timelapseFile`, set `timelapseStatus: complete`
8. Mark each ProcessPhoto `processingStatus: processed`
9. Failures: flag the specific photos that failed detection (write to a `processingNote` field), set painting `timelapseStatus: failed` only if the batch is unusable; partial success with skipped frames is acceptable and noted

Photos uploaded *after* the final image exists (touch-ups, varnish stage) simply join the sequence; a manual "re-render timelapse" action on the painting detail re-runs the job.

### Storage & cleanup
- Local process files are retained after processing — they are corpus, and re-renders with improved pipeline code are expected
- Backup and cleanup of `/data/process/` is managed manually by Bernard (server admin scope, outside this app)
- The app never deletes files from disk; archiving a photo is a database status change only

---

## 5. Sharpness check — implementation

Client-side, no dependencies:

1. Draw the captured image to an offscreen canvas, downscaled to ~800px longest edge (speed; sharpness measurement survives downscaling well enough for a pass/fail signal)
2. Convert to grayscale
3. Convolve with the Laplacian kernel `[[0,1,0],[1,-4,1],[0,1,0]]`
4. Compute variance of the result — low variance = few edges = soft image
5. Threshold: start around **100** on the downscaled frame and tune against real studio photos in the first week of use. Store the raw score on the record regardless of verdict

Runs in tens of milliseconds. The threshold is a config value, not a constant.

---

## 6. API routes

| Route | Method | Purpose |
|---|---|---|
| `/api/studio/process-photo` | POST | Multipart upload → disk write → ProcessPhotos record. Returns record |
| `/api/studio/process-photo/:id` | PATCH | Update processStage, sortOrder, status |
| `/api/studio/paintings/:id/reorder` | POST | Batch sortOrder update from drag-and-drop `{ orderedIds: [] }` |
| `/api/studio/paintings/:id/final-image` | POST | R2 upload, set completedAt, enqueue generate-timelapse |
| `/api/studio/paintings/:id/rerender` | POST | Re-enqueue generate-timelapse |

All behind existing Payload auth middleware on `/studio/*`.

---

## 7. Build order

1. Paintings schema additions + ProcessPhotos collection (Payload config)
2. Upload API route + disk storage under `/data/process/`
3. Capture UI: file input → preview → EXIF read → sharpness check → painting select → upload
4. Inline painting creation with dimensions
5. Painting detail timeline grid, ordered by sortOrder
6. Drag-and-drop reorder + reset-to-chronological
7. Final image upload route + gate (enqueue job)
8. Save-to-phone session accumulator (isolated component)
9. Timelapse pipeline job (separate work item — pipeline internals per existing specs, updated for local-disk reads and aspect-ratio validation)

Steps 1–8 are the app; step 9 is the server pipeline and can proceed in parallel once the schema (step 1) is fixed.

---

## What NOT to do

- No client-side cropping of process photos — full frame always
- No processing at upload time — the final image is the only trigger
- Never modify `capturedAt` — sortOrder is the only mutable ordering
- No R2 for process photos — local disk only
- No hard deletes anywhere — `status: archived` throughout
- Don't couple the save-to-phone component into the upload flow — it must be removable in one commit

---

*Brief — Process Photo Capture · July 2026*
*bernardbolter.com/studio · For handoff to Cursor*
*Companion documents: studio-app-spec.md · hetzner-migration-brief.md*
