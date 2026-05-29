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
| `R2_*`, `NEXT_PUBLIC_IMAGE_DOMAIN` | Phase E media processing (not needed for text-only stub) |

## Queues

Defined in `src/lib/queue/jobs.ts`. Upload creates a `process-fieldnote` job via `POST /api/studio/field-notes`.

**Current behavior (Phase D):**

- `process-fieldnote` — marks `text` FieldNotes `complete`; other media types stay `pending` until Hetzner processing (Phase E).
- All other job names are registered stubs that log and exit.

## Hetzner

Run the same command on the CAX11 worker with this repo deployed and env synced from Vercel/Neon. One long-lived `tsx src/workers/index.ts` process (systemd or Docker) is enough; no separate Redis.
