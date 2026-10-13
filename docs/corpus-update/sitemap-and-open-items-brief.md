# Sitemap Expansion + Open Items Backlog

*July 31, 2026. Follows the corpus API work, the page weight reduction pass, and cross-model reachability testing.*

---

## Background — why the sitemap matters more than expected

Cross-model testing established that the three major chat agents fetch under three different, incompatible constraints:

| Agent | Constraint | Consequence |
|---|---|---|
| **Gemini** | `text/html` only | JSON endpoints unreachable at any size |
| **ChatGPT** | Only URLs from search results or the user's message | Unindexed URLs unreachable regardless of format |
| **Claude** | Only URLs from a prior fetch in-session | In-body links work; cold URL construction does not |

No single change satisfies all three. The intersection is **indexed HTML** — the only surface all three can reach.

For ChatGPT specifically, **search-index presence is the fetch permission.** In testing it fetched `/mokum-straat` and `/bio` successfully (both indexed) while refusing `/api/corpus/venice-in-the-middle` even after reading that exact literal URL in a response body.

Cloudflare AI-crawler analytics for the last 7 days confirm real crawl activity: Bytespider 2.08k, Amazonbot 381, BingBot 154, Googlebot 53, TikTok Spider 65. 2.76k of 3.34k requests returned 2xx. `/sessions` is the single most-crawled path at 544 requests and 10.6 MB — the archive's process layer is what gets read most.

The current sitemap has **237 entries**, covering roughly artworks + series + static pages. It omits the deeper HTML layers — which are exactly the layers that make this archive distinctive, and exactly the ones agents cannot reach without index presence.

---

## Task 1 — Expand the sitemap *(main task)*

### 1.1 Audit what is currently included

Report the current composition before changing anything:

- total `<loc>` count
- breakdown by route type (artworks, series, static, other)
- whether `lastmod` is present and what it derives from
- which route types are generated dynamically vs hardcoded

### 1.2 Add the missing HTML layers

These pages exist, render, and are now lightweight after the weight-reduction pass. They are currently invisible to search and therefore to search-mediated agents.

| Route | Include when | Notes |
|---|---|---|
| `/[slug]/vision` | artwork has ≥1 vision analysis | Do NOT include for artworks with none — thin pages hurt index quality |
| `/[slug]/record` | always (published artworks) | |
| `/sessions/[sessionId]` | session `status === 'completed'` | Never include `in-progress` sessions |
| `/bio/entries/[slug]` | entry is published | Deployed but likely absent from sitemap — verify |
| `/statement/throughlines/[slug]` | throughline is published | Same — verify |
| `/events/[slug]` | event is published | Verify whether already included |

**Report the count added per route type.** Expected roughly: 216 record pages, a smaller number of vision pages, plus sessions, bio entries, throughlines, and events.

### 1.3 `lastmod` accuracy

Each entry should carry a `lastmod` reflecting when *that page's content* last changed, not a global build timestamp:

- artwork pages → artwork `updatedAt`
- vision pages → most recent vision analysis `dateCreated`, or artwork `updatedAt`, whichever is later
- session pages → session `updatedAt`
- series pages → most recent `updatedAt` among works in that series

If any route currently emits a build-time `lastmod`, flag it. Inaccurate `lastmod` values cause crawlers to discount the signal entirely.

### 1.4 No trailing slashes

Verified: nothing the site publishes emits trailing-slash URLs, and Next.js correctly 308s them. Keep it that way — every `<loc>` must be the canonical no-slash form matching the page's own canonical tag.

### 1.5 Experiment — add `/api/corpus/index`

Add the corpus index endpoint as a single `<loc>` entry.

Rationale: search engines index JSON inconsistently, but if `/api/corpus/index` ever enters an index, ChatGPT-class agents gain fetch permission for it. Low cost, uncertain payoff, worth one attempt.

**Do NOT add the 216 per-slug API records** — that would double the sitemap with entries unlikely to be indexed and would dilute the HTML entries that matter.

### 1.6 Size check

If the expanded sitemap approaches 10 MB or 50,000 URLs, split into a sitemap index. At the expected scale (~700–900 entries) this will not be necessary, but confirm the number.

### Verification

```bash
curl -s 'https://bernardbolter.com/sitemap.xml' | grep -o '<loc>' | wc -l
curl -s 'https://bernardbolter.com/sitemap.xml' | grep -c '/vision<'
curl -s 'https://bernardbolter.com/sitemap.xml' | grep -c '/record<'
curl -s 'https://bernardbolter.com/sitemap.xml' | grep -c '/sessions/'
curl -s 'https://bernardbolter.com/sitemap.xml' | grep -c 'api/corpus'
curl -s 'https://bernardbolter.com/sitemap.xml' | grep -o '<loc>[^<]*/</loc>' | wc -l
curl -s 'https://bernardbolter.com/sitemap.xml' | head -20
```

- [ ] Total count increased as expected; report before/after
- [ ] Zero trailing-slash `<loc>` entries
- [ ] Every URL type returns 200 — spot-check one of each with curl
- [ ] `lastmod` present and content-derived, not build-time
- [ ] Valid XML; no `in-progress` sessions included
- [ ] Sitemap still referenced from `robots.txt`

### Do NOT

- Do NOT include unpublished, draft, or `in-progress` content
- Do NOT include vision pages for artworks with no vision analysis
- Do NOT add the 216 per-slug API records
- Do NOT introduce trailing slashes
- Do NOT change `/api/corpus/*` responses, tier addressing, or schema
- Do NOT touch the artwork page fetch (`getPublishedArtworkForPage`) — unrelated to this task and the site of a prior outage

### After deploy

Submit the updated sitemap in Google Search Console and check the Coverage report. Googlebot at 53 requests in 7 days against a 237-page sitemap is low; GSC will say whether that is crawl budget, indexing exclusions, or something else.

---

## Task 2 — Identify the 5xx responses

Cloudflare reports 9 errors to AI crawlers over 7 days: 4× 500, 4× 502, 1× 524.

Small in volume, but each one tells a crawler the archive is broken. Identify which paths, from Cloudflare analytics or server logs, and report before fixing. The 524 is a timeout, likely a slow page rather than an application error.

---

## Backlog — Cursor tasks

Not part of Task 1. Listed so they are not lost.

### B1. Cache vision and record pages
`/[slug]/vision` measures ~1.4–1.6s TTFB and ~100–130 KB; `/[slug]/record` similar. These are effectively static. Extend the Cloudflare Cache Rule pattern, or add appropriate cache headers. Note: the existing rule matches `/api/corpus` only.

### B2. pg-boss workers crash-looping
Workers report `Queue X does not exist` for `resize-image-backfill`, `suggest-tags`, and `process-fieldnote`, then pm2 restarts them. The queues DO exist in `pgboss.queue`, and `ensureBossQueues()` runs from `getBoss()`. Prior investigation could not explain the contradiction and correctly declined to guess. Needs a dedicated look — possibly a cache or race condition in pg-boss v12.

### B3. `not-found.tsx` requires a database query
It calls `getRandomPublishedArtwork()`, so a 404 fails when the DB is unreachable. 404s are exactly what crawlers generate by guessing URLs. Make the fetch failure-tolerant or remove the random artwork from the 404 page.

### B4. Vocabulary entries for newest terms
`artism:surveyUrl` and the restored per-record `artism:recordUrl` / `artism:visionPageUrl` / `artism:sessionsUrl` were added after the last vocabulary pass. Confirm all are defined in `artism-vocabulary.md`.

### B5. Run the `reasoningStatus` audit
`src/scripts/audit-reasoning-status-complete.ts` exists and checks both directions. It has not been run and reviewed. Report-only — reclassification is the artist's decision.

### B6. Residual `videoFile` full Media documents
A few video works still ship full Media documents in the catalogue. Out of scope for the Phase 3 trim; small, but worth closing.

### B7. Data migrations *(never started — own spec when ready)*
- **Catalogue prefix mismatch:** all three Gates of Perception works carry `BB-ACH-` prefixes (`BB-ACH-2018-001`, `BB-ACH-2018-002`, `BB-ACH-2017-001`), colliding with A Colorful History numbering. Also `Almadinat Alearabia` has `dateCreated: 2022` with `BB-MEG-2021-001`.
- **Escaped-JSON relations:** `seriesHingeMarker` and `relatedWorksAtMaking` are real graph data serialised into strings inside `PropertyValue.value`. No generic JSON-LD tool will traverse them.
- **R2 image domain:** all 216 records hard-code `pub-6a869efbfec4404396a52a3b7056bfc7.r2.dev`. A provider-generated bucket hostname baked into every canonical record is the most fragile thing in the dataset on a two-century horizon. Move to a custom domain before the September snapshot.
- **`image` as bare URL string:** no `ImageObject`, so no `width`, `height`, or `encodingFormat` for consumers.

---

## Backlog — Bernard, not Cursor

### N1. Caddy access logging is OFF
`/var/log/caddy/` does not exist and the Caddyfile has no `log` directive, so `journalctl -u caddy` contains only service messages and handler warnings — not access records. There is currently **no owned record of who reads the archive.** Cloudflare's dashboard sees it, but it cannot be queried, retained, or snapshotted.

```
bernardbolter.com {
    log {
        output file /var/log/caddy/bernardbolter-access.log {
            roll_size 50mb
            roll_keep 10
        }
    }
    # existing config
}
```
Then `sudo systemctl reload caddy`.

Worth doing before September — "who read the archive, and what did they read" is exactly what the snapshot should be able to state.

### N2. September 1 namespace gate
`@context` declares `https://artism.org/schema/`, which returns **404**. The vocabulary is served at `bernardbolter.com/schema` (`/schema/` 308-redirects to it).

Decide by September 1:
- artism.org live and serving before September 9 → leave as is
- otherwise → change `ARTISM_NS` in `constants.ts` to `https://bernardbolter.com/schema/`

Either way the loser must permanently redirect to the winner. **Also settle the trailing slash** — `llms.txt` currently says `https://artism.org/schema/` with a slash while `/schema/` redirects to `/schema`. Whichever form wins must be used identically in `@context`, `llms.txt`, and the served vocabulary. A namespace URI that redirects is worse than one that resolves directly, and this gets frozen into 216 records on September 9.

### N3. Bytespider decision
2.08k requests and 37.25 MB over 7 days — roughly 62% of all AI crawl traffic and more data than every other crawler combined. ByteDance; generally ignores `robots.txt`; will not surface the archive to any reader.

Three options: block at Cloudflare, rate-limit, or accept. Blocking the single system reading the archive most deeply, on the basis of who owns it, sits awkwardly against the project's open-access premise. Rate-limiting keeps the archive open while capping resource use. Artist's call, worth taking deliberately.

### N4. Start the embeddings service
`pm2 start embeddings`. torchvision is installed and importable; the process is simply stopped.

### N5. Make cross-model testing a recurring ritual
Four models (ChatGPT, Gemini, Copilot, Perplexity), two prompts — index-start and cold-domain-start — twice yearly, alongside the September snapshot.

This is the only instrument that has reliably revealed reachability problems. Schema validation, status codes, and field-presence checks all passed clean while three of four models could not read the archive at all. Fetcher behaviour drifts, and there is no standard governing it.

**Also record the crawler configuration in each snapshot:** which crawlers were permitted, whether bot filtering was active, and the crawl volumes observed. Otherwise a future reader finding thin crawl evidence cannot tell whether that was policy or accident.

---

## Note for the record

Worth capturing as an `artism:ProjectEvent`. Three separate reachability failures were found during this work, each invisible to validation and each surfaced only by an outside reader attempting to walk the archive:

1. Serving the semantically correct `application/ld+json` without a charset made the corpus unreadable to most agent fetchers.
2. Endpoints at 7–8s exceeded agent timeout limits despite being correct and complete.
3. URL templates saved bytes but made deeper tiers unreachable to agents restricted to URLs they were handed.

The schema was correct throughout. **For a machine-readable archive, the protocol is not only the schema** — it is the headers, the payload size, the response time, the index presence, and whether the HTML says the same thing as the JSON. Any artist adopting this pattern will hit these and have no way to diagnose them from inside.

---

*Sitemap expansion + open items · July 31, 2026*
