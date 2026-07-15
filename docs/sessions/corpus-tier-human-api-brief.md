# Corpus Tiers — Unified Human + API Brief

*July 2026. Supersedes the “API-only” reading of `corpus-tier-system-brief.md` for product shape. That brief remains the source for Tier 1 gist rules, similarity signals, and known Tier 1 limitations. This document maps the **same five tiers** to human pages and machine endpoints so drill-down ends at sessions for both.*

Read alongside: `corpus-tier-system-brief.md`, `docs/sitemap/corpus-api-brief.md`, `art-official-session-protocol.md`, existing `/[slug]/vision`.

---

## Part 1 — Why one ladder

AI triage and human reading want the same narrowing path:

1. Orient across the whole archive  
2. Filter to a hypothesis set  
3. Read one work’s best analysis  
4. Read the full structured record  
5. Read how that knowledge was made (sessions)

Building separate “corpus for bots” and “pages for humans” doubles surface area and drifts. **One tier model, two representations** (HTML template + JSON) per tier.

**Honesty constraint (from corpus-tier brief Part 4):** Tier 1 is triage/orientation only — not a discovery engine for cross-work conceptual patterns.

---

## Part 2 — Tier ↔ route ↔ API map

| Tier | Human route | Machine | Content |
|---|---|---|---|
| **1** | `/corpus` | `GET /api/corpus?format=index` (and alias `/api/corpus/index`) | All published works: title, series, year, catalogue #, reasoningStatus, **gist** |
| **2** | `/corpus?series=&yearFrom=&yearTo=&status=&hasVisionAnalyses=` | Same query params on the index endpoint | Filtered subset; denser cards (short description / intent line when present) |
| **3** | `/[slug]/vision` *(exists)* | Artwork JSON-LD `artism:visionAnalyses` + optional `GET /api/corpus/artworks/[slug]?tier=3` later | Latest / full vision analysis text |
| **4** | `/[slug]/record` *(new)* | Full public JSON-LD for one artwork (`/api/corpus` element or by-slug) | Structured public fields + entire `visionAnalyses[]` |
| **5** | `/sessions` index + `/sessions/[sessionId]` | `GET /api/corpus/sessions?artwork=[slug]` (and session by id) | Session **crumbs** publicly; full transcript only for staff / authenticated corpus consumers if we ever expose Tier 5 raw — see Part 4 |

**Reuse, don’t duplicate:**
- `/[slug]` stays the public artwork experience (not a “tier page”).
- `/[slug]/vision` **is** Tier 3 for humans — do not invent `/analysis`.
- `/series/[slug]` remains series narrative; Tier 2 series filter links into it where useful.

---

## Part 3 — Page templates (human)

### 3.1 `/corpus` — Tier 1 / 2 index
- Document-scroll shell, quiet typography (bio/statement family — not a dashboard).
- Default: full published catalogue as a slim vertical list (or compact rows): year · title · series · reasoningStatus · gist.
- Filter controls: series, year range, reasoning status, hasVisionAnalyses — same params as the API.
- Each row links to `/[slug]`; secondary links: Vision (T3), Record (T4), Sessions for this work (T5 filtered).
- Lede copy must say this index is for **orientation**, not discovery.
- Empty filters = Tier 1; any filter = Tier 2 presentation (slightly richer row if descriptionShort/intent exist).

### 3.2 `/[slug]/vision` — Tier 3
- Already ships vision analyses + related visual tooling.
- Add explicit “corpus ladder” crumbs: Corpus → Artwork → Vision → Record → Sessions.
- Ensure latest analysis is visually primary.

### 3.3 `/[slug]/record` — Tier 4
- New page: public structured record dump suitable for humans who want the machine view without DevTools.
- Sections: identity/facts, reasoning fields that are public, full `visionAnalyses[]` chronology, links to sessions (T5).
- No private fields (sales buyer, prices, etc.) — same boundary as JSON-LD / corpus API.
- JSON-LD on page = the artwork’s public CreativeWork/VisualArtwork graph (or link to download JSON).

### 3.4 `/sessions` — Tier 5 index
- List **completed** sessions only.
- Columns/rows: date, sessionType, primary artwork, mentioned count.
- No transcripts on the index.
- Filter: `?artwork=[slug]` (sessions where primary **or** mentioned).

### 3.5 `/sessions/[sessionId]` — Tier 5 detail (public crumb)
- Keep transcripts **out** of anonymous HTML.
- Show: type, completed date, primary + mentioned artworks, link back to corpus ladder and artwork pages.
- Optional later: public “session abstract” field (short, artist-approved) — **out of scope for first build**; do not auto-publish messages.

---

## Part 4 — Privacy boundary (load-bearing)

| Layer | Anonymous public | Staff / Local API for agents on server |
|---|---|---|
| Session metadata (type, dates, artwork links) | Yes, if `status=completed` | Yes |
| `firstImpression` / `secondDescription` | No | Yes (session record) |
| Full `messages` transcript | No on HTML | Tier 5 API may expose later under explicit product decision; default **no** on public API |
| Artwork public fields / vision text | Yes | Yes |
| Sales/buyer/insurance | No | Staff only |

Human Tier 5 = **provenance crumbs**. Machine Tier 5 “full transcript” from `corpus-tier-system-brief.md` is a **later, gated** capability — do not silently put transcripts on `/api/corpus` public responses in pass 1.

---

## Part 5 — API additions (pass 1)

### 5.1 Index filters (Tier 2)
Extend `GET /api/corpus?format=index` (and add thin alias `GET /api/corpus/index` → same handler):

- `series` (existing)
- `yearFrom`, `yearTo`
- `status` = reasoningStatus (`stub` | `partial` | `complete`)
- `hasVisionAnalyses` = `true` | `false`

Combinable. Cache: same `corpus` / `artwork-${slug}` invalidation tags as today (`corpus-caching-spec.md`).

### 5.2 Gist on index elements (Tier 1)
Per index row, add `gist: string | null`:

- Source: first sentence / ~200 chars from `visionAnalyses` latest by date (same “latest wins” as display).
- If no vision analysis: `null` (do not invent from title).
- Pass 1: compute at query time. Pass 2 (optional): persist `corpusGist` + regenerate on `visionAnalyses` afterChange for cheaper Tier 1.

### 5.3 Sessions listing API (Tier 5 crumbs)
`GET /api/corpus/sessions?artwork=[slug]`  
Returns completed sessions linked as primary or mentioned — id/sessionId, type, dates, artwork slugs only. No messages.

---

## Part 6 — Explicitly deferred (do not block pass 1)

- Reasoning-text pgvector embeddings + `?similarTo=`
- CLIP `?similarTo=` on index
- Public transcript Tier 5 API
- Persisted `corpusGist` column (unless query-time is too slow in practice)
- Timeline multi-markers (separate brief)

---

## Part 7 — Build order

1. **Brief** (this doc)  
2. **API:** index filters + gist + `/api/corpus/index` alias + `/api/corpus/sessions`  
3. **Human `/corpus`** index template (T1/T2)  
4. **`/sessions` index** + ladder links on session detail  
5. **`/[slug]/record`** (T4) + ladder crumbs on vision + artwork  
6. Smoke on netcup  
7. Later: embeddings / similarTo / gated transcript API  

---

## Part 8 — Do NOT

- Do not call Tier 1 a discovery tool in UI copy.  
- Do not publish session transcripts on public HTML in pass 1.  
- Do not create a parallel `/analysis` route — use `/vision`.  
- Do not put private commerce/provenance fields on `/record` or corpus JSON.  
- Do not ship filtered index without cache-tag coverage.  
- Do not block the human ladder on embeddings work.

---

## Part 9 — Verification

- [ ] `/corpus` lists published works with gist when vision analysis exists  
- [ ] Filters on `/corpus` and `/api/corpus?format=index` agree  
- [ ] `/[slug]/vision` and `/[slug]/record` reachable from corpus rows  
- [ ] `/sessions` lists completed sessions; `?artwork=` filters  
- [ ] `/sessions/[id]` shows crumbs only (no transcript)  
- [ ] `/api/corpus/sessions` returns no `messages`  
- [ ] Editing an artwork invalidates corpus index cache variants  

---
*Corpus tiers — unified human + API brief · July 2026*
