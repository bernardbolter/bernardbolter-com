# /studio — Summary for Project Context
*Reference note for the bernardbolter.com project — summarizing a spec developed elsewhere*

---

## What it is

`/studio` is a private studio management tool living at `bernardbolter.com/studio`, protected by Payload auth. It's not a separate app — it's a protected section of the existing Next.js + Payload v3 site, sharing the same database, auth, and deployment. It exists to capture and organize the raw material of the practice (process photos, voice memos, video clips, written notes) and turn it into a structured, queryable corpus that feeds both content production (MoP) and long-term archive reasoning.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, Tailwind, Vercel |
| CMS / Auth | Payload v3 → Neon |
| Database | Neon Postgres + pgvector |
| File storage | Cloudflare R2 |
| Processing server | Hetzner (CAX11 in early spec, CAX21 in later docs) |
| Job queue | pg-boss (Postgres-backed) |
| Transcription | Whisper |
| Visual tagging | Moondream |
| Video processing | FFmpeg |
| Small model | Ollama — Mistral 7B or Phi-4-mini |
| Reasoning model | Claude, via Anthropic API |

Single-user auth via Payload's built-in users collection — a custom login page at `/studio/login`, with `middleware.ts` protecting all `/studio/*` routes.

---

## Entry point and tabs

Mobile-optimized, upload-first. Five tabs: **Upload** (default), **Paintings**, **Notes**, **Episodes**, **Digest**.

---

## Core collection: FieldNotes

The unified schema for all captured media — replaces any earlier idea of separate raw-footage collections. `mediaType` (`photo`, `video-broll`, `video-observation`, `video-performance`, `video-process`, `voice-memo`, `text`) determines what processing runs: keyframe extraction + Moondream tagging for visual media, Whisper transcription for anything with audio.

A key design decision: B-roll audio is transcribed too, even though it's discarded in the final edit. Bernard speaks a description over or after each B-roll shot — what Moondream sees versus what Bernard says are different kinds of information (literal visual content vs. why the shot matters). This is stored as `transcriptType: shooter-description`, distinct from `speech` for performance/observation/process footage.

Richer optional tagging fields round out FieldNotes:
- `register` — emotional/tonal quality (`exploratory`, `resolved`, `frustrated`, `excited`, `observational`)
- `processStage` — where in the making process (`early`, `mid`, `late`, `completed`)
- `conceptualThread` — fixed MoP vocabulary (`daguerreotype`, `wet-plate`, `aerial`, `digital`, `layering`, `light-quality`, `historical-angle`)
- `lines` — relation to the Lines collection (see below)

---

## Lines

A personal, open-ended taxonomy of active investigations that cuts across every collection — paintings, FieldNotes, episodes, sessions, studio conversations. Named after skateboarding lines: a sequence of moves connected into something that flows. Distinct from tags (which describe *what something is*) — Lines describe *what something is part of*, an ongoing thread of thinking that might run for weeks or years.

Created inline from the Upload tab without breaking the upload flow — the core design constraint is that creating a Line must be faster than deciding not to. The nightly embedding job surfaces candidate connections between new material and active Lines via similarity, always proposed and confirmed by hand, never auto-applied.

---

## Other tabs

**Paintings** — list and detail view per painting: process photo timeline, final image upload, timelapse generation (canvas detection → crop → color correction → FFmpeg assembly), related FieldNotes, link to the archive record.

**Episodes (MoP)** — grouped by the four series (Outsider Art Review, Rap Critic, Studio Fails, Studio Series). Storyboard sessions and assembly sessions run as Claude chats loaded with episode context: storyboard turns a concept into named beats, assembly matches shot clips to beats post-shoot and flags coverage gaps.

**Studio Conversation** (Phase 2, data structure from Phase 1) — a chat interface with the small model, not Claude. The model's job isn't to reason well — it's to listen, prompt with short follow-ups, and stay out of the way. The transcript itself is the output, becoming part of the corpus other sessions draw on. Only the conversation summary gets embedded, not the full transcript.

**Digest** — weekly read-only overview: open paintings with no recent activity, untagged FieldNotes, episode bank status, open Art/Official sessions, a dedicated Lines section (active Lines with new material, dormant Lines, suggested new Lines), and a practice-awareness layer (output rhythm, series distribution, register/processStage patterns, quiet periods).

**Cross-corpus pattern surfacing** — a weekly background job (Sunday night, before digest compile) that detects recurring visual motifs, conceptual themes, and locations across the full corpus via embedding similarity and frequency — not interpretation, just a pattern report surfaced in the digest.

---

## Processing pipeline

Hetzner runs as a pure processing service — no web serving. pg-boss worker polls and executes jobs: `process-fieldnote` (FFmpeg/Moondream/Whisper on upload), `generate-timelapse`, `suggest-tags` (small model pass over untagged FieldNotes), `generate-embeddings`. Heavy jobs run sequentially to avoid RAM pressure; light jobs can run concurrently. Every record carries `processingStatus` (`pending` → `processing` → `complete`/`failed`) and `recordOrigin` (`user`, `small-model`, `claude`, `pipeline`).

---

## Modularity principles (carried over from the broader architecture)

Data and interface are strictly separated — Neon/Postgres is the source of truth, `/studio` is one interface among possible future ones. Nothing is deleted, only archived (soft deletes only). The Hetzner processing layer is stateless and replaceable. The reasoning layer (Claude) is pluggable — called via API with the model string as a config value, swappable for a local model later without schema changes.

---

## Build phasing

**Phase 1**: Hetzner setup, Payload collections (including Lines and FieldNotes richer schema from day one — not retrofitted later), auth middleware, Upload tab, processing pipeline, Paintings tab, timelapse pipeline, FieldNotes tab, Episodes tab with storyboard/assembly sessions, untagged suggestion pass.

**Phase 2**: Weekly social session (small model groups material, Claude drafts captions), weekly digest, practice awareness, exhibition/presentation tool, collector inquiry management, print/supply tracking (Vendure-dependent).

---

*Source specs: `studio-app-spec.md`, `studio-app-spec-addendum.md`, `brief-07-footage-pipeline.md` — written May 2026.*
