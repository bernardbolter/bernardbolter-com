# Infrastructure Audit — October 2026

**Date:** 2026-10-12
**Run after** the `/record` and `/{slug}/sessions` retirement lands, so the
audit measures the final state.
**Shape:** report first, in full, across all four parts. No fixes until the
whole picture is visible — several items below may turn out to be the same
underlying problem.

---

## Why now

More changed today than in the previous month: tier flattening, derived
`reasoningStatus`, a privacy fix, slug renames, redirects, the nightly
artifact, protocol and contract pages, verso consolidation, route retirement.

The next thing after this is a cataloguing session. Stale infrastructure costs
a build; stale *protocol* costs a session. This audit is the gate.

---

## Part 1 — Documentation drift

The repo still contains specs describing behaviour that no longer exists. An
agent reading them will do the wrong thing — this has already happened
repeatedly (F1–F20 in the contract pass).

For each item, report: which documents still assert it, and whether they are
marked superseded.

| No longer true | Now |
|---|---|
| Five-tier ladder with graded descent | Three structures: corpus, work, throughline |
| `?tier=5` as the Tier 5 address | `/api/corpus/{slug}/sessions` |
| `/{slug}/record` as "Tier 4 — public structured record" | Retired, 308 to `/{slug}` |
| `/{slug}/sessions` as a route | Retired, 308 to `/{slug}#sessions` |
| `reasoningStatus` stored and written at commit | Derived at build time from evidence |
| Paste `reasoningStatus: complete` in the envelope | Stripped on import |
| Vision analysis is agent-blind | Non-blind, A-2.0 |
| Throughline slugs derived from full claim text | Short slugs + `shortTitle` |
| "216 works" / "29 fully catalogued" | 220 works, 31 complete (derived, may move) |
| Sitemap missing deep layers | Complete; `/record` URLs now removed |
| `artism:` prefix | `art-official:` |

Also report:

1. Any document asserting something the code contradicts that is **not** in the
   list above. That is the valuable output.
2. Which documents are now wholly superseded and should be marked as such in
   place, with a pointer to the live page or current spec.
3. Whether `/art-official/protocol` and `/art-official/contract` are the only
   places a session needs to read, or whether anything authoritative still
   lives only in the repo.

---

## Part 2 — Half-built features

The recurring pattern today: **the UI shipped, the data didn't.** Each of these
looks finished and isn't. For each, report whether the gap is data, importer,
code, or a decision never made.

| Feature | Symptom |
|---|---|
| `fieldsCoveredThisSession` | Empty on 23 of 46 sessions; `/sessions` reads "0 fields confirmed" on those rows. Importer now accepts `fieldUpdateTimeline` — has anything populated it since? |
| `linkedArtworkIds` on throughlines | Mostly empty, so the verso claim overlay cannot show "also on". A throughline spanning six works shows none of them. **Highest-value fix in this list.** |
| Sessions with no primary artwork | `the-way-to-la`, `space-time`, `the-end`, `four-nations` — matching artworks exist, relation unset. Affects derived status and the sessions block on those works. |
| `historicalReadings` | Empty array, so the historical marker track draws nothing. Intended to fill, or dead like the throughline connector? |
| `primaryImageAltText` | Set on 4 of 220. Alt falls through to the label line. 40 works have a vision analysis that could supply one. |
| `reinforcingSessions` | Still rejected by the envelope validator. Six sessions mention The Thinker; none can record that they corroborate its throughline. |
| `DialogueSelfAudit`, `agentDraft*` | Rejected by the importer; the process layer is discarded at export. |
| Vesuvios NOTE | Internal to-do still published in `/the-thinker` prose. One edit, never made. |
| Ownership block | `ownershipHistory` stripped from anonymous JSON by the privacy pass, but owner name and location are public in the HTML. One of those two decisions is probably not intended. |
| 29 vs 31 | Homepage count line — confirm it reads the derived value, not the retired stored field. |

---

## Part 3 — Test coverage

The suite only started reporting honestly today (the `@/` alias fix). Six real
failures:

- `middleware.spec.ts` — suite fails on import/setup. Middleware gained
  redirect resolution today.
- `reciprocalLinks.spec.ts` — throughline lookup returns `[]`. All 35 slugs
  were renamed today.
- `getGridItemContainerSize.spec.ts` — 2 assertions
- `mediaPublicUrl.spec.ts` — versioned primary URL
- `pgboss.spec.ts` — `boss.on` / start-once
- `stagedMedia.spec.ts` — `sourcePhotograph` vs `sourcePhotographs[]`

Report:

1. Which of the six are regressions from today's work versus older drift. The
   first two are the suspects.
2. What has **no** coverage at all. Today shipped slug renames, redirect
   resolution, derived status, verso rendering, route retirement and image
   sizing — how much of that is tested?
3. The nightly build already runs a `reasoningStatus` audit, a link check and
   the public-prose marker check. What else belongs there rather than in a test
   suite — anything that checks live state rather than code.

---

## Part 4 — Standing items

| Item | Blocker |
|---|---|
| Cloudflare cache rule for HTML | Needs Bernard's dashboard. Headers emit `public, s-maxage=3600`; `cf-cache-status` is still `DYNAMIC`, so nothing is edge-cached. TTFB is fine from Berlin, poor from further away. |
| Consolidation Part 3 (RSC flight) | ~280 KB, the catalogue serialised twice. First attempt reverted — correct shape is server-mapped slots with `<ServerVerso/>` as in-place children, not a registry. |
| Paged verso | Held: 71 KB of content, 269 KB of scaffolding. Make pages conditional on content before shipping. |
| Two size engines | `gridRealSize.ts` vs `artworkSizeDisplay.ts`. Consolidation Part 2, never run. **Check whether they agree today** — if not, that is a live bug in the physical-scale principle. |
| Branch state | `fix/html-on-demand-isr` and `wip/protocol-corpus-artifact` both carry work. What is on `main`? |

---

## Output

A single written report covering all four parts, with file paths.

Then a **prioritised list** separating:

- **Breaks a session** — protocol or contract wrong, importer rejects something
  the docs promise
- **Breaks a reader** — wrong claim on a public page, broken link, missing data
  a feature depends on
- **Costs nothing to leave** — cosmetic drift, dead code, stale docs nobody
  reads

I expect the third list to be the longest, and that is fine. The point is
knowing which is which.
