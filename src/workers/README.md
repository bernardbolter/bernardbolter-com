# Studio / FieldNotes workers (pg-boss)

Background jobs for FieldNotes processing, timelapses, embeddings, and digest tasks. The Next.js app enqueues work; this process consumes it.

## Run locally

```bash
# Same env as the site (DATABASE_URL, PAYLOAD_SECRET, R2_*, etc.)
npx tsx src/workers/index.ts
```

Or after a production build:

```bash
node dist/workers/index.js
```

## Required environment

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres (Neon); pg-boss uses schema `pgboss` |
| `PAYLOAD_SECRET` | Payload Local API in handlers |
| `R2_*`, `NEXT_PUBLIC_IMAGE_DOMAIN` | Media download + keyframe upload (Phase E4+) |

### FieldNotes pipeline sidecars (Phase 3+)

| Variable | Default | Purpose |
|----------|---------|---------|
| `FFMPEG_PATH` | `ffmpeg` | Keyframe + audio extraction |
| `FFPROBE_PATH` | `ffprobe` | Duration probe |
| `WHISPER_URL` | `http://127.0.0.1:9000` | faster-whisper HTTP sidecar ([whisper-asr-webservice](https://github.com/ahmetoner/whisper-asr-webservice)) |
| `MOONDREAM_URL` | `http://127.0.0.1:2020` | [Moondream Station](https://docs.moondream.ai/station/) — `POST /v1/query` JSON API |
| `FIELDNOTE_SCRATCH_DIR` | `{tmpdir}/fieldnotes` | Temp workspace for extracted WAV + keyframes |

**Whisper sidecar:** `POST {WHISPER_URL}/asr?encode=true&task=transcribe&output=json` with multipart `audio_file`.

**Moondream Station:** `pip install moondream-station` then `moondream-station start 2020` (or pm2). Request: `POST {MOONDREAM_URL}/v1/query` with JSON `{ image_url, question, stream: false }`; response `{ answer: "tag1, tag2, ..." }`.

Integration tests: set `HAS_FFMPEG=1` and `FFMPEG_SAMPLE_VIDEO=/path/to/clip.mp4` to run ffmpeg integration test locally.

### Processing window (Phase 4)

| Variable | Default | Purpose |
|----------|---------|---------|
| `FIELDNOTE_PROCESSING_START_HOUR` | `2` | Window opens (local hour, inclusive) |
| `FIELDNOTE_PROCESSING_END_HOUR` | `8` | Window closes (local hour, exclusive) |
| `FIELDNOTE_PROCESSING_TZ` | `Europe/Berlin` | IANA timezone for window check |
| `FIELDNOTE_PROCESSING_FORCE` | — | Set `true` to bypass window (test gate) |
| `FIELDNOTE_POLL_INTERVAL_MS` | `60000` | Queue poller interval while worker runs |

## Queues

Defined in `src/lib/queue/jobs.ts`. Upload creates a `process-fieldnote` job via `POST /api/studio/field-notes`.

On first `getBoss()` start, all queues are created in the `pgboss` schema (pg-boss v12 requires this before `boss.work()`).

**Current behavior (Phase 4):**

- `process-fieldnote` — runs the ffmpeg → Whisper → slate parse → Moondream pipeline during the **02:00–08:00** window (`Europe/Berlin` by default). Upload jobs enqueue immediately but skip until the window opens unless `FIELDNOTE_PROCESSING_FORCE=true`.
- A queue poller runs every 60s while the worker process is alive and picks up `queued` / `pending` field notes during the window.
- All other job names are registered stubs that log and exit.

## Hetzner

Run the same command on the CAX11 worker with this repo deployed and env synced from Vercel/Neon. One long-lived `tsx src/workers/index.ts` process (systemd or Docker) is enough; no separate Redis.
