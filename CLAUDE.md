# CLAUDE.md

Guidance for Claude Code (and Cursor) working in this repository.

---

## What this is

`bernardbolter.com` — the artist archive of Bernard John Bolter IV, and the reference implementation of the **Art/Official** protocol (`art-official.org`).

**This is not a portfolio site.** It is a machine-readable catalogue raisonné whose primary reader is an AI agent. Roughly 220 artworks, 46 cataloguing session transcripts, exposed through a five-tier corpus API plus a parallel HTML layer carrying the same content. Human legibility matters; machine reachability is the product.

Two consequences that govern almost every decision here:

1. **Reachability is not correctness.** Schema validation, status codes and field-presence checks have all passed clean while three of four major models could not read the archive at all. The protocol is the headers, the payload size, the response time, the index presence, and whether the HTML says the same thing as the JSON — not just the schema.
2. **The record is permanent.** This is built on a two-century horizon and snapshotted annually to Arweave. A hostname, a catalogue number, or a namespace URI that gets frozen into 220 records is not a detail.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router) |
| Styling | Tailwind CSS |
| CMS | Payload CMS v3 |
| Database | Neon (PostgreSQL + pgvector) |
| Media | Cloudflare R2 |
| Host | Netcup VPS — Caddy + pm2 |
| CDN | Cloudflare |
| Jobs | pg-boss |

---

## Commands

`package.json` `engines.pnpm` is `^9 || ^10`. Scripts below are the real names; invoke them with `pnpm <script>` (or `npm run <script>`). There is no separate typecheck script name — `typecheck` is `tsc --noEmit`.

```bash
# dev server
pnpm dev
# wipe .next then dev
pnpm devsafe

# build / typecheck / lint
pnpm build
pnpm typecheck
pnpm lint

# Payload types after any collection change — REQUIRED after editing any collection
pnpm generate:types
pnpm generate:importmap

# production start / background jobs
pnpm start
pnpm worker
pnpm payload

# tests — `test` itself shells out to `pnpm run test:int` and `pnpm run test:e2e`
pnpm test:int
pnpm test:e2e
pnpm test
```

One-off scripts that exist as `package.json` entries (run with `pnpm <script>`):

`seed:artwork-fixture`, `migrate:people-schema`, `backfill:clip`, `backfill:dinov2`, `backfill:reasoning-text`, `migrate:reasoning-text-embedding`, `backfill:vision`, `migrate:studio-social-phase1`, `push:studio-social-phase1`, `migrate:neighborhood-commissions`, `migrate:webhook-events`, `push:neighborhood-commissions`, `backfill:images`, `backfill:images:local`, `seed:capture-presets`, `migrate:fieldnotes-pipeline`, `migrate:rapcritic-episode-schema`, `push:fieldnotes-pipeline`, `verify:fieldnotes-pipeline-schema`, `list:fieldnotes`, `recover:fieldnote-inbox`, `deploy:netcup`

Files under `src/scripts/` with **no** `package.json` script are run as `npx tsx src/scripts/<file>.ts` (that is the runner the scripts themselves document). Do not invent an npm/pnpm alias for those.

---

## The hard rules

These are non-negotiable. Each one exists because it was violated and something broke.

### 1. Never use a denylist `select` on any Payload query

`{ field: false }` — never. Not for one field, not "just this once." A denylist select broke Payload's join hydration for `dcs.captureJourney.capturePhotos` and caused a **site-wide 500** (`3283f01`).

Allowlist only (`{ field: true }`). If you allowlist on an artwork query, explicitly include the DCS join fields and **verify against `basel-switzerland`** — that is where the join lives. A watercolour rendering fine proves nothing.

Prefer reducing `ARTWORK_PAGE_DEPTH` or restructuring a fetch over introducing any select on `getPublishedArtworkForPage`.

### 2. Identity content must be in the raw server-rendered HTML

Anything that constitutes the identity of a piece — title, URL, core descriptive text — must be present in the server response, testable with JavaScript disabled. Interactive behaviour layered on top of already-present content (hover, toggles, scroll animation) is fine client-side.

This rule was written after the homepage shipped 217 artworks whose anchor text read `loading…` to every crawler. It applies to `/`, `/series/[slug]`, session pages, vision pages, and anything built after.

**Never** fix a placeholder by changing the placeholder text. **Never** implement "load more" or fetch-on-click for content that should be indexed.

### 3. Never touch `/api/corpus/*` unless that is the task

Verified, conformant, fast, cached. Do not change field selection, tier addressing, response shape, or vocabulary as a side effect of unrelated work.

### 4. `.strict()` validation is never loosened

Not on `artworks`, `sessions`, `bio-timeline`, `statement-throughlines`, `vision`, or `artwork-fields`. If a paste fails validation, the paste is wrong or the schema needs a real addition — never relax the validator to let it through. Silent field-dropping is the bug this prevents.

### 5. Raw session transcripts are never edited

Typos, false starts and mid-thought corrections stay exactly as spoken. They are the archive's grounding layer — what makes a record read as something that happened rather than something written about. Render-layer skips (e.g. empty-content messages) are fine; data changes are not. Never retroactively rewrite a historical transcript.

### 6. Never remove the physically-scaled grid fields

`widthPx`, `heightPx`, `widthMm`, `heightMm`, `aspectRatio`, `measurementType`, `sizeTier`, `orientation`.

Artworks are displayed at a size representing their real-world physical size — `sm`/`md`/`lg`/`xl` tiers, with width constrained for landscape and height for portrait, both applying simultaneously. Do not normalise images to fill grid cells, do not `object-cover` in a way that erases the size distinction, and keep the logic in one shared utility rather than duplicating it per view. This is a core design principle, not styling.

### 7. Never change timeline scroll geometry

Total strip width, scroll behaviour, drag/wheel/arrow handling, and labelled year/decade markers all stay as they are. Virtualization may change what is mounted; it must not change the scrollable dimensions.

---

## How to work here

**Report before fixing.** Specs in this project are deliberately written as "diagnose, report, then act." When a spec says stop and report, stop and report — several fixes here have two plausible causes leading to opposite correct actions. Guessing right once is worse than asking, because it teaches the wrong lesson.

**Never silently resolve a discrepancy.** When a spec doc and the live schema disagree, flag it. Do not rename a live field to match a doc, and do not rewrite a doc to match code, without checking which one is actually wrong. **Bernard is the final arbiter on intent.**

**One phase per deploy.** Multi-phase specs here gate each phase on measurement of the last. Two earlier optimisation rounds in this project optimised against numbers that turned out to measure something other than assumed. Do not combine phases.

**Log what you find.** Any spec-vs-reality mismatch, or flow-level decision made while working, goes into `art-official-source-of-truth.md` in the same sitting — not left in scrollback. Entries are dated. Nothing is deleted; resolved items stay marked resolved as a permanent log. A correction "decided" but not propagated into its target spec file is **not resolved** — either fix the target file in the same pass or mark the entry `decided, not yet propagated`.

**Regenerate Payload types** after any collection change, and say so in the report.

**Report "none" explicitly** when there were no deviations from a spec. Silence is ambiguous.

---

## Verification

**`curl` is ground truth.** Not a fetch tool, not the dev server, not "it should work now." Cloudflare may serve stale responses to bot traffic while browser traffic reaches live origin — the cache-invalidation window is about five minutes. `/api/corpus/[slug]` bypasses CDN cache and is the authoritative record check.

Standard checks:

```bash
# corpus state
curl -s 'https://bernardbolter.com/api/corpus/index' | jq '{totalArtworks, totalPublished, coverage, tierMap}'

# page weight + TTFB across the canonical route set
for u in '' 'series/megacities' 'venice-in-the-middle' 'basel-switzerland' \
         'stern-grove-1' 'yugograd' 'bio' 'statement' 'cv'; do
  printf '%-26s ' "/$u"
  curl -s -o /dev/null -w 'http=%{http_code} bytes=%{size_download} ttfb=%{time_starttransfer}s\n' \
    "https://bernardbolter.com/$u"
done

# SSR rule — identity content present without JS
curl -s 'https://bernardbolter.com/' | grep -c 'loading'          # expect 0
curl -s 'https://bernardbolter.com/series/megacities' | grep -c 'timeline__artwork'  # expect series count, not ~220

# sitemap composition
curl -s 'https://bernardbolter.com/sitemap.xml' | grep -c '<loc>'

# corpus regression — must be unchanged by frontend work
curl -s -o /dev/null -w 'corpus=%{http_code} %{size_download} %{time_starttransfer}s\n' \
  'https://bernardbolter.com/api/corpus/index'
```

**DCS regression check after any artwork-query change:** `basel-switzerland`, `venice-in-the-middle`, `stern-grove-1`, `yugograd` must all return 200 with visually unchanged content.

---

## Domain model — the parts that get gotten wrong

### Corpus tiers

| Tier | Address | Notes |
|---|---|---|
| 1 | `/api/corpus/index` | Paginated JSON list, corpus-wide |
| 2 | `/api/corpus/index?depth=survey` | Same set, more per-entry context |
| 3 | `/{slug}/vision` | **HTML only — no JSON endpoint.** Only when ≥1 vision analysis exists |
| 4 | `/api/corpus/{slug}` | Full structured record |
| 5 | `/api/corpus/{slug}/sessions` | Session transcripts. Also `/api/corpus/sessions/{sessionId}?tier=5` |

Not every artwork has all five tiers. Absence on a record is a real state, not a bug. `tierMap` / `availableTiers` says which exist per work.

Corpus JSON APIs are `dynamic = 'force-dynamic'` — always built from live Payload. Regeneration runs through `revalidateCorpusFeed()` (artwork afterChange, session afterChange, Studio `revalidateArtworkPaths`), which does `revalidateTag('corpus')` + path bust + Cloudflare purge. HTML artwork pages use a **separate** ISR path (`revalidateArchive`) — that split was itself a bug once. No manual corpus rebuild is needed after a successful paste; if a crawler sees stale JSON, check CDN (`s-maxage=60`) first.

### JSON-LD namespace

The prefix is **`art-official:`** and `@context` is `["https://schema.org","https://art-official.org/ns/"]`.

`artism:` is the **old** prefix. If you find it in code, docs, or `llms.txt`, it is stale — flag it. Do not reintroduce it.

Every `art-official:` term the corpus emits should be defined at `art-official.org/ns/`. It currently is not, for several terms. Do not add new custom terms without a real definition in the namespace.

### Import envelopes — exact shapes

Three distinct envelopes. Do not conflate them.

**Vision analysis** (standalone, one artwork per upload):
```json
{ "slug": "artwork-slug",
  "analyses": [{ "text": "...", "model": "claude-sonnet-5", "date": "2026-07-23" }] }
```
The key is `analyses`, **not** `visionAnalyses` (that is the Payload field name, not the import key). Exactly three fields per entry.

**Multi-collection session envelope:**
```json
{ "sourceSessionRef": "session-id",
  "writes": [
    { "collection": "artworks", "slug": "...", "operation": "set", "fields": {} },
    { "collection": "sessions", "operation": "set", "sessionId": "...", "fields": {} },
    { "collection": "bio-timeline", "operation": "append", "entry": {} },
    { "collection": "statement-throughlines", "operation": "append", "entry": {} }
  ] }
```

- `slug` (artworks) and `sessionId` (sessions) are **top-level properties of the write object**, not nested inside `fields`.
- `statement-throughlines` is **plural** as a collection key. Singular fails silently.
- Writes are **independent and non-atomic** — one failure does not block the others.
- `sessions` writes execute before `bio-timeline` / `statement-throughlines` (`orderEnvelopeWrites`), because those appends validate against an existing `sourceSessionRef`.
- `append` is idempotent on `sourceSessionRef` + identical text.
- `reasoningStatus: complete` is its own guarded final write — never bundled with fields that could fail.

### Field-name traps

| Correct | Commonly wrong |
|---|---|
| `sessionNotes` | `notes` |
| `Artist.nameLegal` | `legalName` |
| `sessionType: 'event-enrichment'` | `'event'` (that is envelope shorthand, not the stored value) |
| `coExhibitors: [{ person, role }]` | `[{ name }]` inline objects |
| `currentLocation: { category, locationDetail }` | flat string |
| `currentLocation.category`: `artists-studio` \| `unknown` | `studio`, `lost / unknown` |
| `series`: slug form (`art-collision`) | display name |
| `totalEditionSize` (DCS/Megacities tiers) | `editionSize` (correct only inside `ownershipRegistry[]`) |
| `widthWhole` / `heightWhole` | `widthMm` / `heightMm` — those are computed, readOnly, never written directly |

There is **no `printedCount` field anywhere.** Printed copies = `copies[].length`.

### Write permissions on the Art/Official envelope

**Forbidden — financial/commerce, admin-only by deliberate policy.** This is intentional friction, not a bug. Do not loosen `fieldAllowlist.ts`:
`salesRecord`, `askingPrice`, `listingCurrency`, `insuranceValue`, `insuranceValueDate`, `galleryReference`/`galleryText`.

**Forbidden as free-text paths:** `loanHistory`, `exhibitionHistory` — exhibitions route through the Events tools.

**Allowed:** `currentLocation`, `ownershipHistory`, `provenanceConfidenceLayer`, `provenanceOriginKnown`.

**`artHistoricalReferences` — structured array only** (`[{ name, matchStrategy, relevanceNote? }]`). Prose values are structurally rejected. If the dialogue wants art-historical prose it belongs in `artHistoricalContext`. Enforce at the tool-call level, not in dialogue instructions.

**Career-stage gating:** `Artist.careerStage` (`studio | market | institutional`, defaults to `studio`) keeps some fields dormant. A dormant field is not a bug — but a dormant field surfacing as an agent-asked question at studio tier **is** a bug (tier filter not applied).

### Artwork ↔ Event linking

`Events.artworks[]` is the **authority side**. `Artworks.events` is a Payload **`join`** on `events.artworks` — a reverse read, not a second writable relationship. There is no bidirectional write hook to fire.

When verifying a join, use `depth: 1` — at `depth: 0` join docs arrive without `id`/`slug`, which looks like a false negative.

Exhibition history **never** goes into `workContext` free text. That was a real, twice-caught bug.

### Session flow — the two blind acts are different things

- **`firstImpression`** — the *artist's* own words, written before the image is uploaded. Private session field.
- **Vision analysis** — the *agent's* reading, generated from the image.

These were repeatedly conflated. Never call `firstImpression` "your blind vision."

Session conduct: **do not move toward wrap-up on a schedule.** Keep pulling threads; follow-ups by default. Do not ask "anything else before I write this up." Only raise closing once genuinely exhausted, and let Bernard signal readiness. This has been corrected across many sessions and is a standing requirement.

---

## Documentation map

Authority order, highest first:

1. **Live Payload schema** — what actually is.
2. **`art-official-source-of-truth.md`** — the bridge between specs, live schema, and dialogue. Check here first when a spec and reality might disagree. Cursor/Claude Code confirmations are authoritative over stale specs *immediately*, even before the spec file is corrected.
3. **`artist-archive-schema-final.md`** and **`art-official-dialogue-spec.md`** — the real specs. The source-of-truth file is an index between them, never a replacement for either.
4. Individual task specs (`*-spec.md`, `*-brief.md`) — correct as of their date, and several are known stale.

Current open work: **`open-issues-audit-2026-09-17.md`**.

---

## Working method

Design and strategy happen conversationally with Claude → tight specs with explicit constraints (what NOT to do, not just what to do) → implementation by Claude Code / Cursor → review → iterate. Bernard oversees; he verifies things are actually live before treating them as done.

Write specs and reports in that register: name the constraint, name the failure mode, say what to report back.

---

## Commit convention

Branch off `main`; do not commit directly to it. Commit or push only when asked.
