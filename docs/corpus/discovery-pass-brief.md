# Brief: Discovery & Machine-Readability Pass — bernardbolter.com
*July 2026*

**Context:** Making the archive reliably discoverable by search engines and AI crawlers. The core problem: external fetch/crawl tools (including AI assistants) generally can only follow URLs that already appear somewhere they've read — they cannot guess constructed API paths. Right now, the corpus (`/api/corpus`) is invisible to anything that doesn't already have a direct link pasted to it.

Four sequential builds. Verify each with its acceptance criteria before moving to the next.

---

## Build 1 — Sitemap

**Rationale:** Homepage JSON-LD spec defers artwork discovery to "the sitemap," but none exists. This is the main gap blocking full Google indexing of 216+ pages and real Google Search Console submission.

**Requirements:**
- Dynamic sitemap generated from Payload data — use Next.js's `app/sitemap.ts` convention so it auto-serves at `/sitemap.xml`. Do not hand-write a static XML file.
- Include:
  - Homepage
  - Every published Artwork page (`/[slug]`) — query only `status: published`, exclude drafts/stubs
  - Every Series page (`/series/[slug]`)
  - Static pages: `/bio`, `/statement`, `/cv`, `/contact`
  - Exhibition pages if/once they exist as real URLs (skip for now if still `hasPage: false`)
- Each entry's `lastModified` pulled from the record's real `updatedAt` field — not a hardcoded date.
- `changeFrequency` / `priority` optional, reasonable defaults fine (e.g. `weekly` for artworks, `monthly` for static pages).

**Do NOT:**
- Do not hand-write a static XML file — it will go stale as the archive grows
- Do not include draft/unpublished artworks
- Do not include private/internal routes (Art/Official sessions, Payload admin, `/api/*` routes)
- Write the query so it scales past 216 records, even though that's fine today

**Acceptance criteria:**
- [ ] `bernardbolter.com/sitemap.xml` returns valid XML
- [ ] URL count matches published artwork count + series count + static pages
- [ ] Spot-check 5 random artwork URLs resolve, no 404s
- [ ] `lastModified` dates are real, not identical across all entries
- [ ] No draft or admin/API URLs present

---

## Build 2 — Per-page corpus links

**Rationale:** The sitemap gets crawlers *to* a page. These links tell a crawler there's a fuller machine-readable record *of* that page, and connect any entry point to the whole corpus.

**Requirements:**
- On every Artwork page (`/[slug]`):
  - Add `<link rel="alternate" type="application/ld+json" href="https://bernardbolter.com/api/corpus/[slug]">` in `<head>`
  - Confirm the page's JSON-LD includes `"artism:recordUrl": "https://bernardbolter.com/api/corpus/[slug]"` — this was specced in `corpus-api-restructure-spec.md`; verify it actually shipped, don't assume
- On the homepage and every Series page:
  - Add `<link rel="alternate" type="application/ld+json" href="https://bernardbolter.com/api/corpus/index">` in `<head>`
- Skip Bio, Statement, CV, Contact — not corpus records, linking them there is noise

**Do NOT:**
- Do not point any page's link to the full unpaginated `/api/corpus` feed — always the per-slug record or the index
- Do not duplicate the `<link>` tag if one already exists from a prior partial implementation — check first

**Acceptance criteria:**
- [ ] View-source on 3 random artwork pages — each has exactly one `application/ld+json` alternate link, pointing to its own slug
- [ ] View-source on homepage and one series page — each links to `/api/corpus/index`
- [ ] Every linked URL resolves (no 404s)
- [ ] Grep confirms no page links to the bare paginated `/api/corpus`

---

## Build 3 — Homepage as reliable entry point

**Rationale:** The homepage is the only reliable starting point for an outside agent that has no prior link to the corpus. It needs to work for tools that read JSON-LD, tools that only extract visible HTML links, and plain-text conventions some AI crawlers check first.

**Requirements:**
1. **JSON-LD** — confirm homepage's `WebSite`/`CollectionPage` JSON-LD includes `"artism:corpusEndpoint": "https://bernardbolter.com/api/corpus/index"` (per `homepage-interaction-jsonld-spec.md` — verify it shipped)
2. **`<link>` tag** — `<link rel="alternate" type="application/ld+json" href="https://bernardbolter.com/api/corpus/index">` in `<head>`
3. **A literal server-rendered visible link** — a real `<a href="/api/corpus/index">` somewhere on the homepage (small footer link is fine, e.g. "Machine-readable archive index"). Must be in the initial server-rendered HTML, not injected client-side after load.
4. **robots.txt** — add `Sitemap: https://bernardbolter.com/sitemap.xml` and a comment flagging the corpus index as the recommended AI-crawler entry point
5. **`/llms.txt`** — plain text file at domain root: one line on site purpose, the direct URL to `/api/corpus/index`, and one line on usage/attribution (e.g. "this data is offered openly for AI reasoning; attribution appreciated")
6. **Cache headers** — add `Cache-Control: public, max-age=3600` (or similar) to the `/api/corpus/index` response, since it will now be hit repeatedly by crawlers

**Do NOT:**
- Do not rely on JSON-LD alone — `<script>` JSON-LD is sometimes stripped during HTML-to-text conversion by fetch tools (this has already caused problems on this project before)
- Do not link the full unpaginated `/api/corpus` from the homepage — link the index only
- Do not make the visible link JS-rendered/client-side-only

**Acceptance criteria:**
- [ ] View-source (not rendered DOM) on homepage shows a real `<a href="/api/corpus/index">` in the raw HTML
- [ ] `curl bernardbolter.com/llms.txt` returns plain text with the index URL
- [ ] `curl bernardbolter.com/robots.txt` shows the Sitemap line and the AI-crawler comment
- [ ] Fetching homepage HTML with JS disabled still surfaces the corpus URL in raw text
- [ ] `curl -I` on `/api/corpus/index` shows the new Cache-Control header

---

## Build 4 — Generate audit file for Claude review

**Rationale:** Claude cannot access the repo or the live site directly. This file is the only way to verify Builds 1–3 were implemented correctly without re-describing them in prose.

After Builds 1–3 are complete and deployed, create a file at the repo root: `docs/discovery-audit-[date].md`

This file must contain **actual raw output**, not descriptions. Include, verbatim:

1. **Sitemap** — first 15 lines of the actual generated `/sitemap.xml`, plus total URL count
2. **Artwork page `<head>`** — full raw `<head>` HTML (view-source, not rendered DOM) from 2 real artwork pages, including the full JSON-LD `<script>` block
3. **Homepage `<head>` + visible link** — full raw HTML, plus the exact HTML snippet of the new footer/visible `<a href="/api/corpus/index">` link, showing it's server-rendered
4. **`robots.txt`** — full current file contents
5. **`llms.txt`** — full file contents
6. **`/api/corpus/index` response headers** — actual `Cache-Control` header value from a real `curl -I` request
7. **One full JSON-LD block** from an artwork page showing `artism:recordUrl` present and correct
8. **Deviations from spec** — state explicitly if anything couldn't be implemented as written or was implemented differently. If none, write "none" explicitly — do not omit this section.

**Do NOT** summarize or paraphrase outputs — paste raw HTML/text/headers exactly as produced.

---

## Final acceptance test (after all builds)

Open a fresh Claude chat, give it only `bernardbolter.com` with no other link — it should be able to reach the corpus index on its own, using only what's discoverable from that single URL.

---
*Consolidated brief · July 2026*
