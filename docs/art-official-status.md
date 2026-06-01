# Art/Official — Current State (May 2026)

This document describes **where Art/Official is today** in `bernardbolter-com`: what is built, how it works, what was added beyond the original admin plan, and what is still deferred.

**Primary references**

| Doc | Role |
|-----|------|
| [docs/art-official-admin-implementation-plan.md](./art-official-admin-implementation-plan.md) | Original build plan (Phases A–F) |
| [docs/art-official-handoff.rtf](./art-official-handoff.rtf) | North star and philosophy |
| [docs/art-official-dialogue-spec.md.rtf](./art-official-dialogue-spec.md.rtf) | Dialogue model, phases, tool definitions |
| [docs/artist-archive-schema-final.md](./artist-archive-schema-final.md) | Canonical field names Art/Official writes |

---

## What Art/Official is

Art/Official is a **conversational cataloguing agent** inside the Payload CMS admin. It guides Bernard through structured dialogue while staging field values on a **Session** record. Nothing is written to `artworks`, `artists`, `triptychs`, `episodes`, or `practice-knowledge` until the artist explicitly **commits** at the end of a session.

- **Entry:** `/admin/art-official` (custom Payload admin view)
- **Auth:** Payload staff only (`admin` or `artist` role) — same cookie as `/admin`
- **Model:** Anthropic Claude (`ART_OFFICIAL_MODEL`, default `claude-sonnet-4-20250514`)
- **Streaming:** SSE from `POST /api/art-official/chat`

Art/Official is **not** the public website, **not** `/studio`, and **not** autonomous — the artist confirms before commit.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ Payload admin                                                    │
│   /admin/art-official           → session list + instructions    │
│   /admin/art-official/[uuid]    → ChatPane + sidebar + commit    │
└────────────────────────────┬────────────────────────────────────┘
                             │ POST /api/art-official/chat (SSE)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ Chat route                                                       │
│   requireStaff → load Session → buildSystemPromptParts           │
│   Anthropic tools loop (max 5 rounds) → applyAgentTool           │
│   Persist messages + fieldUpdateTimeline on Session              │
└────────────────────────────┬────────────────────────────────────┘
                             │ POST …/sessions/[id]/commit
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ Commit route                                                     │
│   commitTarget(sessionType) → create/update target collection    │
│   Mark session completed; set dialogueRefinementFlag if needed   │
└─────────────────────────────────────────────────────────────────┘
```

**Hard rules (implemented)**

- Local API calls from routes pass `user` + `overrideAccess: false`
- Agent **never** live-writes artworks during chat — only `Session.fieldUpdateTimeline`
- Agent **never** sets `status: 'published'` — commits create/update **drafts**
- Private/commerce fields blocked by `fieldAllowlist.ts` + Payload field access
- Rate limit: 60 chat requests / 10 min per user (`rateLimit.ts`)

---

## Session types

| Session type | Admin UI start? | Commit target | Notes |
|--------------|-----------------|---------------|-------|
| `onboarding` | Yes | Practice Knowledge patches | Recommended first session |
| `artwork-cataloguing` | Yes | Create (or update) **Artwork** draft | Pre-upload flow, media slots, ACH block |
| `triptych-cataloguing` | Yes | Create **Triptych** | Added after original plan |
| `artist-statement` | Yes | Update **Artist** singleton | `statementFull/Medium/Short` |
| `biography` | Yes | Update **Artist** singleton | `bioFull/Medium/Short` |
| `episode-storyboard` | **No** (Studio only) | Update **Episode** `storyboard` | Phase F4 — `/studio/episodes/[id]` |
| `episode-assembly` | **No** (Studio only) | Update **Episode** `assembly` | Phase F4 — loads FieldNotes clips |

Routing and commit logic: [`src/lib/artOfficial/routing.ts`](../src/lib/artOfficial/routing.ts)

Episode sessions are created via `POST /api/studio/episodes/[id]/sessions`, not the Art/Official admin session picker. Chat and commit reuse the same `/api/art-official/*` routes.

---

## Implementation plan — phase checklist

Mapped to [art-official-admin-implementation-plan.md](./art-official-admin-implementation-plan.md):

### Phase 1 — Plumbing & system prompt ✅

| Step | Status | Location |
|------|--------|----------|
| A1 Anthropic client + env | Done | `src/lib/artOfficial/anthropic.ts` |
| A2 Lexical → plain text | Done | `src/lib/artOfficial/lexicalToPlain.ts` |
| A3 System prompt assembler | Done | `src/lib/artOfficial/buildSystemPrompt.ts` |
| A4 Agent tool contract | Done | `src/lib/artOfficial/agentTools.ts` |
| A5 Routing helpers | Done | `src/lib/artOfficial/routing.ts` |

**Beyond plan:** prompt caching split (`promptCache.ts`), ACH session block, triptych block, episode storyboard/assembly blocks, artwork media/upload blocks, refinement preamble.

### Phase 2 — Sessions API ✅

| Step | Status | Location |
|------|--------|----------|
| B1 `requireStaff` | Done | `src/lib/artOfficial/requireStaff.ts` |
| B2 POST/GET `/sessions` | Done | `src/app/(payload)/api/art-official/sessions/route.ts` |
| B3 POST `/chat` SSE | Done | `src/app/(payload)/api/art-official/chat/route.ts` |
| B4 Field allowlist | Done | `src/lib/artOfficial/fieldAllowlist.ts` |
| B5 `applyAgentTool` | Done | `src/lib/artOfficial/applyAgentTool.ts` |

**Beyond plan:** multi-round tool loop, media upload staging in chat, external lookup tools (Wikipedia, Wikidata, Commons, Getty TGN), `get_media_upload_status`, episode session guards.

### Phase 3 — Admin UI ✅

| Step | Status | Location |
|------|--------|----------|
| C1 Session list view | Done | `src/components/admin/ArtOfficialView.tsx` |
| C2 New session button | Done | `src/components/admin/artOfficial/NewSessionButton.tsx` |
| C3 Chat view | Done | `ArtOfficialSessionView.tsx`, `ChatPane.tsx`, `MessageList.tsx`, `SessionSidebar.tsx` |
| C4 Pre-upload + image upload | Done | `PreUploadPanel.tsx`, `ComposerUploadBar.tsx`, `MediaUploadPanel.tsx` |
| C5 Confirmation panel | Done | `ConfirmationPanel.tsx` |

**Also:** onboarding instructions (`ArtOfficialInstructions.tsx`), start recommendation (`startRecommendation.ts`), session guide panel, staged artwork preview, chat error formatting, agent activity indicator.

### Phase 4 — Image analysis ⚠️ Partial

| Step | Status | Notes |
|------|--------|-------|
| D1 Image analysis route + stub | **Upgraded** | `runImageAnalysis.ts` uses **real Claude vision**, not the original stub-only plan |
| CLIP embeddings | Separate | `persistArtworkClipEmbedding` — not wired into Art/Official turn loop |

### Phase 5 — Confirmation & commit ✅

| Step | Status | Location |
|------|--------|----------|
| E1 Commit endpoint | Done | `src/app/(payload)/api/art-official/sessions/[sessionId]/commit/route.ts` |
| E2 Refinement UI | Done | Weak-phase badges in list; refinement preamble in system prompt |

Commit builders: `buildArtworkPatch.ts`, `buildArtistPatch.ts`, `buildTriptychPatch.ts`, `buildEpisodePatch.ts`, `buildPracticeKnowledgePatches.ts`, `stagedMedia.ts`, `resolveArtworkCommitReferences.ts`.

### Phase 6 — Hardening ⚠️ Partial

| Step | Status | Notes |
|------|--------|-------|
| F1 Rate limit | Done | In-memory, 60/10min |
| F2 Audit view | **Not built** | No `/admin/art-official/audit` custom view |
| F3 Test suite | **Partial** | Strong **unit** coverage; **integration** tests mostly placeholders |
| F4 README section | **Not built** | No Art/Official section in README |

---

## API routes

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/art-official/sessions` | Create session (5 admin types) |
| GET | `/api/art-official/sessions` | List sessions by status |
| POST | `/api/art-official/chat` | SSE chat + tool execution |
| POST | `/api/art-official/sessions/[sessionId]/commit` | Commit staged data to target collection |
| POST | `/api/art-official/image-analysis` | Standalone image analysis (also used from tools) |

Studio-only (uses same chat/commit stack):

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/studio/episodes/[id]/sessions` | Start `episode-storyboard` or `episode-assembly` session |

---

## Agent tools (exposed to Claude)

| Tool | Purpose |
|------|---------|
| `update_field` | Stage value on `fieldUpdateTimeline` (artworks, artists, events, triptychs, episodes, practice-knowledge) |
| `store_session_field` | Write session-only fields (`firstImpression`, `preUploadStep`, etc.) |
| `trigger_image_analysis` | Run vision analysis on uploaded media |
| `generate_confirmation_draft` | Write agent draft description fields on session |
| `flag_weak_phase` | Record weak dialogue phases for refinement |
| `assess_formal_contribution` | Formal contribution accuracy + notes |
| `lookup_commons_file` | Wikimedia Commons metadata |
| `search_wikidata` / `get_wikidata_entity` | Wikidata lookup |
| `fetch_wikipedia_article` | Wikipedia excerpt |
| `search_getty_tgn` | Getty TGN place lookup |
| `get_media_upload_status` | Report staged media slot state |

Tool schemas: [`src/lib/artOfficial/agentTools.ts`](../src/lib/artOfficial/agentTools.ts)

---

## Admin UI components

```
src/components/admin/
├── ArtOfficialView.tsx              # Hub: lists + instructions + new session
├── ArtOfficialNavLink.tsx           # Nav entry
├── ArtOfficialDashboardLink.tsx     # Dashboard link
└── artOfficial/
    ├── ArtOfficialSessionView.tsx   # Single session shell
    ├── ChatPane.tsx                 # Main chat + upload + commit orchestration
    ├── ConfirmationPanel.tsx        # Wrap-up / commit UI
    ├── SessionSidebar.tsx           # Staged field timeline
    ├── PreUploadPanel.tsx           # Pre-upload gate for artwork sessions
    ├── MediaUploadPanel.tsx         # Multi-slot media uploads (ACH slots)
    ├── ComposerUploadBar.tsx        # Inline upload in composer
    ├── MessageList.tsx
    ├── SessionGuidePanel.tsx
    ├── ArtOfficialInstructions.tsx  # Onboarding copy for new users
    ├── NewSessionButton.tsx
    └── … (error banners, status, preview)
```

Registered in [`src/payload.config.ts`](../src/payload.config.ts) under `admin.components.views`:
- `/admin/art-official`
- `/admin/art-official/:sessionId`

---

## Artwork cataloguing flow (happy path)

1. **Start** `artwork-cataloguing` session from admin hub.
2. **Pre-upload dialogue** — agent asks blind-description questions; `store_session_field` sets `firstImpression`, `preUploadStep`.
3. **Media upload** — composer/panel uploads to Payload `media`; chat can attach `mediaUpload` payload; slots include ACH-specific slots when series applies.
4. **Image analysis** — agent may call `trigger_image_analysis`; Claude vision returns colors, aspect ratio, painted-field rects (for ACH overlay).
5. **Staging** — agent calls `update_field` repeatedly; sidebar shows timeline entries with confidence/source.
6. **External lookups** — agent may call Wikidata/Wikipedia/Commons/TGN tools for location and source metadata (especially ACH).
7. **Wrap-up** — `generate_confirmation_draft` fills session draft fields; **ConfirmationPanel** lets artist approve/reject inferred values.
8. **Commit** — POST commit merges timeline + client edits → `artworks` create/update as **draft**; AR hooks may run on artwork commit.

---

## Session record (`Sessions` collection)

Key fields Art/Official uses:

- `sessionId` (UUID), `sessionType`, `status`, `artistId`
- `artworkRecord`, `triptychRecord`, `episodeRecord` (relations)
- `messages[]`, `fieldUpdateTimeline[]`
- `firstImpression`, `secondDescription`, `preUploadStep`, `stagedMedia[]`
- Agent drafts: `agentDraftDescriptionShort/Long`, `agentDraftConceptualKeywords`, etc.
- Quality: `weakPhases[]`, `dialogueRefinementFlag`, `formalContributionAccuracy`

Config: [`src/collections/Sessions.ts`](../src/collections/Sessions.ts)

---

## Extensions beyond the original admin plan

These were added after the May 2026 implementation plan was written:

| Extension | Status | Notes |
|-----------|--------|-------|
| **Triptych cataloguing** | Admin + commit | `triptych-cataloguing` session type, `buildTriptychPatch.ts` |
| **A Colorful History (ACH)** | Prompt + commit | `buildAchSessionBlock()`, dotted `ach.*` field paths in allowlist |
| **Multi-slot artwork media** | UI + staging | `artworkMediaSlots.ts`, `stageArtworkMedia.ts`, `MediaUploadPanel` |
| **Episode storyboard/assembly** | Backend + Studio UI | Prompt blocks + commit; minimal `EpisodeChatPanel` in `/studio` — **not** full admin chat UX |
| **Prompt caching** | Done | Anthropic cache blocks for static system prefix |
| **Real vision analysis** | Done | Replaces original stub for `trigger_image_analysis` |
| **External knowledge tools** | Done | Wikipedia, Wikidata, Commons, Getty TGN |

---

## What is NOT built yet

From the implementation plan and related roadmaps:

| Item | Plan reference | Status |
|------|----------------|--------|
| Audit custom view (`/admin/art-official/audit`) | Phase F2 | Not started |
| Full integration test suite (chat, commit, allowlist) | Phase F3 | Placeholder only in `tests/int/art-official-sessions.int.spec.ts` |
| README Art/Official section | Phase F4 | Not started |
| **Small-model router** (`taskHint`, Groq) | Phase G / `feat/router` | Not started — Claude-only for all turns |
| Background enrichment agent (auction/commerce Tier 3) | Out of scope | Not started |
| Real USDZ/GLB AR generation | Out of scope | Placeholder URLs in AR hooks |
| DCS / Megacities cataloguing sessions | — | No dedicated session types or prompt blocks |
| Episode sessions in **admin** UI | — | Studio-only entry point |
| Collector / Gallery modules | Explicitly removed | Future separate builds |

---

## Test coverage

**Unit tests (passing)** — under `tests/unit/`:

- `agentTools`, `routing`, `fieldAllowlist`
- `buildSystemPrompt`, `buildArtworkPatch`, `buildArtistPatch`, `buildTriptychPatch`
- `buildPracticeKnowledgePatches`, `sessionTimeline`, `stagedMedia`
- `lexicalToPlain`, `chatMessages`, `promptCache`
- `preUploadGuide`, `primaryImageFromTimeline`, `resolveArtworkCommitReferences`
- `externalLookups` / `wikipedia`
- `episodePromptBlocks` (episode session prompt blocks)

**Integration tests:**

- `tests/int/art-official-sessions.int.spec.ts` — mostly placeholder; allowlist unit test inlined

**Not covered:** end-to-end SSE chat, commit creating artworks, biography singleton update (planned in F3 but not implemented).

---

## Environment variables

```bash
ANTHROPIC_API_KEY=          # Required for chat in production
ART_OFFICIAL_MODEL=         # Optional; default claude-sonnet-4-20250514
DATABASE_URL=               # Payload / Neon
PAYLOAD_SECRET=
```

No `GROQ_API_KEY` yet — reserved for Phase G small-model router.

---

## Relationship to `/studio`

| Concern | Art/Official (admin) | Studio (`/studio`) |
|---------|----------------------|---------------------|
| Purpose | Cataloguing dialogue | Capture, browse, digest |
| Auth | Payload admin cookie | Payload login at `/studio/login` |
| Episode chat | — | `EpisodeChatPanel` reuses `/api/art-official/chat` + commit |
| FieldNotes / upload | — | Phase C upload flow |
| Overlap | Same `Sessions` collection, same chat API | Episode sessions only |

Studio does **not** replace Art/Official for artwork cataloguing — that remains an admin workflow.

---

## Suggested next steps (priority order)

1. **Integration tests** for chat SSE + commit paths (F3) — highest risk gap.
2. **Episode sessions in admin** (optional) — extend `NewSessionButton` + sessions POST enum if Bernard wants MoP editing outside Studio.
3. **Phase G router** on `feat/router` — mechanical tasks to small model, conversational to Claude.
4. **Audit view** (F2) — commit history for the last 30 days.
5. **DCS / Megacities cataloguing** — new session types + prompt blocks when those series need Art/Official dialogue (schema tabs exist; agent prompts do not).

---

*Generated from codebase review · May 2026 · bernardbolter.com*
