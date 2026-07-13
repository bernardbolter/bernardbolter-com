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
| `MOONDREAM_URL` | `http://127.0.0.1:2020` | Moondream vision sidecar — `POST /v1/query` with `image` + `prompt` multipart fields |
| `FIELDNOTE_SCRATCH_DIR` | `{tmpdir}/fieldnotes` | Temp workspace for extracted WAV + keyframes |

**Whisper sidecar:** `POST {WHISPER_URL}/asr?encode=true&task=transcribe&output=json` with multipart `audio_file`.

**Moondream sidecar:** `POST {MOONDREAM_URL}/v1/query` with multipart `image` + `prompt`; JSON `{ "text": "tag1, tag2, ..." }`.

Integration tests: set `HAS_FFMPEG=1` and `FFMPEG_SAMPLE_VIDEO=/path/to/clip.mp4` to run ffmpeg integration test locally.

## Queues

Defined in `src/lib/queue/jobs.ts`. Upload creates a `process-fieldnote` job via `POST /api/studio/field-notes`.

**Current behavior (Phase D):**

- `process-fieldnote` — marks `text` FieldNotes `complete`; other media types stay `pending` until Hetzner processing (Phase E).
- All other job names are registered stubs that log and exit.

## Hetzner

Run the same command on the CAX11 worker with this repo deployed and env synced from Vercel/Neon. One long-lived `tsx src/workers/index.ts` process (systemd or Docker) is enough; no separate Redis.
