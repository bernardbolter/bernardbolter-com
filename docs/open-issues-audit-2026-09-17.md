# Open Issues Audit — bernardbolter.com / Art/Official
## Claude Code handoff brief · September 17, 2026

*Built from a sweep of the project docs (`art-official-source-of-truth.md`, `sitemap-and-open-items-brief.md`, `schema-reconciliation-spec.md`, `homepage-gateway-fix-spec.md` + llms.txt addendum, `tier3-and-reciprocal-links-spec.md`, `session-transcript-progressive-disclosure-spec.md`, `sessions-selfaudit-importer-gap-brief.md`, `sessions-audit-cursor-spec.md`) cross-checked against the live site on September 17, 2026.*

---

## Part 0 — How to read this, and the one caveat

Every "live state" line below was read through a fetch tool, not `curl` from the iMac. Per the project's own verification standard, **treat every number in this document as a claim to re-verify, not a fact.** Section 6 gives the exact commands. Where a fetch-tool reading and a spec disagree, the spec is not automatically wrong — check first.

Issues are marked:

- **[FIXED]** — documented as open somewhere, confirmed shipped. Listed so Claude Code doesn't rebuild it.
- **[OPEN]** — confirmed still broken or absent on the live site.
- **[VERIFY]** — documented as open, could not be confirmed either way from outside. Check first, then act.
- **[DECIDE]** — not a build task. Needs Bernard's call before anyone writes code.

**Governing rule for this whole pass:** this document is an index of findings, not an authority. `art-official-source-of-truth.md` remains canonical for schema and flow. Do not silently resolve a discrepancy between this brief and that file — flag it.

---

## Part 1 — What has already shipped (do not rebuild)

Confirmed live, September 17. Several of these are still described as open in the specs that requested them, which is itself the reason to list them.

| Item | Source spec | Confirmed live |
|---|---|---|
| **Homepage SSR fix** — all artwork titles render as real anchor text; zero `loading…` placeholders | `homepage-gateway-fix-spec.md` Part 2 | Yes — all artwork links carry real titles |
| **llms.txt** — written, served, and linked from the homepage nav alongside the corpus index | `homepage-gateway-fix-llmstxt-addendum.md` | Yes — `/llms.txt` live, homepage shows "Machine-readable archive index · llms.txt" |
| **robots.txt pointer to llms.txt** | same addendum | Yes |
| **Tier 3 in `tierMap`** | `tier3-and-reciprocal-links-spec.md` Part 1 | Yes — Tier 3 present, resolved as HTML-only (`/{slug}/vision`), no JSON endpoint. That was the open decision in Step 1; it has been made. |
| **Reciprocal throughline links** (`art-official:relatedByThroughline`) | `tier3-and-reciprocal-links-spec.md` Part 2 | Yes — present on Tier 4 records |
| **Namespace rename `artism:` → `art-official:`** | `schema-reconciliation-spec.md` Phase 4 | Yes — `@context` is `["https://schema.org","https://art-official.org/ns/"]` and custom fields use `art-official:` |
| **art-official.org/ns/ resolves** | Phase 4 / N2 namespace gate | Yes — serves a human page and content-negotiates JSON-LD. The September 1 gate is closed; `bernardbolter.com/schema` now 404s, which is correct given the rename. |
| **Privacy fix** — `ownershipHistory`, `loanHistory`, `provenanceConfidenceLayer` absent from anonymous `/api/artworks` | `schema-reconciliation-spec.md` Phase 1 | Yes — none of the three appear |
| **Session transcripts rendered inline on `/sessions/[id]`** | `session-transcript-progressive-disclosure-spec.md` | Yes — full numbered dialogue renders as readable text on the session page |
| **Mediums of War `makingNote` correction** | held pending export since the WWII session | Yes — WWII's `makingNote` correctly states WWI was painted first and the connecting technique originated there |

---

## Part 2 — AI traversal and machine reachability

This is the highest-value cluster. The project's own finding from July still holds: *for a machine-readable archive, the protocol is not only the schema.* Everything here is a reachability defect, not a correctness defect — schema validation passes while readers still can't get in.

### 2.1 [OPEN] — The declared namespace defines ~12 terms; the corpus emits many more

**Severity: high.** This is the most serious traversal issue currently live.

`@context` now points at `https://art-official.org/ns/`, which resolves — good. But that document is marked "stub, version 0.1" and defines roughly twelve terms:

`intent`, `makingNote`, `directInspiration`, `consciousRejections`, `encounterNote`, `formalContributionAssessment`, `workContext`, `ProjectEvent`, `provenanceConfidenceLayer`, `unresolved`, `participationContext`, `corpusBiasStatement`.

The live corpus emits `art-official:` terms that are **not** in that list, including at minimum:

- `art-official:relatedByThroughline`
- `art-official:relatedByBioEvent`
- `art-official:hasThroughlineConnections`
- `art-official:surveyUrl`, `art-official:recordUrl`, `art-official:visionPageUrl`, `art-official:sessionsUrl`
- `art-official:tier` / `tierMap`
- `seriesHingeMarker`, `relatedWorksAtMaking`

A term emitted under a namespace that does not define it is, to a strict JSON-LD consumer, an undefined property. The rename fixed the 404; it did not fix the vocabulary coverage. This supersedes and enlarges backlog item **B4** in `sitemap-and-open-items-brief.md`.

**Task:** enumerate every `art-official:`-prefixed term the corpus actually emits (a script over `/api/corpus/index?depth=survey` plus a sample of Tier 4 records is the cheapest way), diff against what `/ns/` defines, and close the gap. Report the diff before adding anything — some emitted terms may be better renamed to existing schema.org properties than defined as new ones.

**Do NOT** define a term in `/ns/` just to silence the diff. Each addition needs a real one-line definition in the same register as the existing twelve.

### 2.2 [OPEN] — Sitemap is missing every deep HTML layer

**Severity: high.** `sitemap-and-open-items-brief.md` Task 1.2 asked for six route types to be added. The sitemap grew from 237 to ~822 entries, but the growth appears to be artwork pages and `/record` pages only.

Absent from the sitemap, as read September 17:

- `/{slug}/vision` — **zero entries**, despite ~40 works having vision analysis
- `/sessions/[sessionId]` — **zero entries**, despite 46 sessions, and despite `/sessions` being the single most-crawled path in the archive (544 requests / 10.6 MB over the July sample)
- `/bio/entries/[slug]` — zero
- `/statement/throughlines/[slug]` — zero, despite five live throughlines
- `/events/[slug]` — zero
- `/series/[slug]` — zero
- `/api/corpus/index` — zero (Task 1.5, the deliberate experiment)

This matters more than it looks. Per the project's own cross-model testing, **for ChatGPT-class agents, search-index presence is the fetch permission.** Every layer above is currently unreachable to them at any depth. The session transcripts in particular were just made human-readable inline (Part 1) — and are still invisible to search.

**Task:** implement `sitemap-and-open-items-brief.md` Task 1.2 as originally written, including the `lastmod` rules in 1.3. Report the count added per route type.

### 2.3 [OPEN] — Sitemap artwork count (327) does not match corpus published count (220)

**Severity: high — this is either a crawler-facing defect or a corpus undercount, and both are bad.**

`/api/corpus/index` reports 220 artworks, all published. The sitemap appears to carry ~327 `/{slug}` artwork entries and ~327 `/{slug}/record` entries.

Two possible causes, leading to different fixes:

- **Unpublished or draft works are being emitted into the sitemap** → crawlers are being handed ~107 URLs that 404 or render thin. This directly violates the brief's "Do NOT include unpublished, draft, or `in-progress` content," and repeated 404s from a sitemap is one of the strongest negative crawl signals there is.
- **The corpus index is filtering something the sitemap isn't** (or my count is wrong) → then the 220 figure is the one that's misleading, and the Tier 1 index is under-reporting the archive.

**Stop and report which it is before changing either.** Do not fix by making the numbers match — find out which number is true first.

### 2.4 [OPEN] — `/sessions` index page still shows crumbs only, and the crumb copy is now wrong

**Severity: medium.**

Two distinct problems:

1. The `/sessions` **index** still lists summary crumbs, with the copy *"Human-readable session crumbs. Full transcripts are public at the machine endpoint linked on each row."* That sentence was accurate before the progressive-disclosure work shipped. It is now actively misleading — the transcripts **are** on the individual session pages, as HTML. An agent reading the index will conclude the transcript is JSON-only and stop.
2. The same stale line appears on the individual session pages (*"Full transcripts are public via the machine endpoint below"*), directly above a full inline transcript.

**Task:** update both copy strings to say the transcript is on the page and the JSON is additionally available. Keep the JSON links — `session-transcript-progressive-disclosure-spec.md`'s Do NOT list is explicit about that. This is a copy fix, not a structural one.

### 2.5 [OPEN] — llms.txt has drifted from the live namespace

**Severity: medium.** `/llms.txt` still describes the archive as "a reference implementation of the `artism:` schema.org extension" and names `artism:hasThroughlineConnections`. The live corpus uses `art-official:` throughout. The one document written specifically to orient a cold-starting agent is telling it the wrong prefix.

This is the exact failure mode the addendum's own open question anticipated: *"Given the tier system has changed twice in one day already, a dynamic route that stays accurate automatically is worth the small extra cost over a static file that needs manual updates."* It looks like the static-file path was taken and has now gone stale.

**Task:** correct the prefix references now, and then decide whether `llms.txt` becomes a dynamic route generated from the same constants that drive `tierMap` — so this cannot recur. Recommend the dynamic route, for the reason the addendum already gave.

### 2.6 [VERIFY] — `.well-known/artist-archive.json` is thin and has an http:// URL

Current content, read September 17:

```json
{"@context":"https://schema.org","@type":"Person","name":"Bernard Bolter",
 "url":"http://bernardbolter.com",
 "identifier":[{"@type":"PropertyValue","propertyID":"Wikidata","value":"https://www.wikidata.org/entity/Q140782973"}],
 "archiveVersion":"1.0","publicKey":null}
```

Three issues:

- `url` is **`http://`**, not `https://`. On an identity/verification stub, a scheme mismatch against the canonical origin is a real defect.
- **No ULAN identifier**, though `llms.txt` describes this file as carrying "authority-registry identifiers (Wikidata, ULAN)." Either add the ULAN entry or correct llms.txt.
- `@context` is schema.org only — the archive's own namespace is absent from its own identity stub.

`publicKey: null` is presumably deliberate and out of scope; leave it.

### 2.7 [OPEN] — 5xx responses to AI crawlers never diagnosed

`sitemap-and-open-items-brief.md` Task 2: 4× 500, 4× 502, 1× 524 to AI crawlers over a 7-day window. Never traced to paths. Still open as far as any project doc records. The 524 is a timeout and most likely one of the uncached pages in item 3.1 below.

**Task:** pull the paths from Cloudflare analytics or server logs and report before fixing.

---

## Part 3 — Site health and infrastructure

### 3.1 [VERIFY] — Vision and record pages are uncached

`sitemap-and-open-items-brief.md` B1. `/[slug]/vision` and `/[slug]/record` measure ~1.4–1.6s TTFB at ~100–130 KB and are effectively static. The existing Cloudflare Cache Rule matches `/api/corpus` only. This is also the most likely source of the 524 in 2.7 — and, once the sitemap carries vision and record pages (2.2), crawl volume against exactly these routes goes up.

**Do 2.2 and this together, or do this first.** Adding ~370 slow uncached pages to the sitemap without caching them is the wrong order.

### 3.2 [VERIFY] — pg-boss workers crash-looping

`sitemap-and-open-items-brief.md` B2. Workers report `Queue X does not exist` for `resize-image-backfill`, `suggest-tags`, and `process-fieldnote`, then pm2 restarts them — while the queues demonstrably exist in `pgboss.queue` and `ensureBossQueues()` runs from `getBoss()`. Prior investigation could not explain it and correctly declined to guess.

**Task:** dedicated look. Possible cache or race condition in pg-boss v12. This has been open since July and is the kind of thing that stays open forever unless it gets its own session.

### 3.3 [VERIFY] — `not-found.tsx` requires a database query

`sitemap-and-open-items-brief.md` B3. It calls `getRandomPublishedArtwork()`, so a 404 fails when the DB is unreachable. 404s are exactly what crawlers generate by guessing URLs — and per item 2.3, there may be ~107 sitemap URLs generating them right now. Make the fetch failure-tolerant, or drop the random artwork from the 404 page.

### 3.4 [VERIFY] — Embeddings service stopped

`sitemap-and-open-items-brief.md` N4. `pm2 start embeddings`. torchvision installed and importable; process simply stopped. One command, if it's still down.

### 3.5 [VERIFY] — Caddy access logging off

`sitemap-and-open-items-brief.md` N1. No `log` directive in the Caddyfile, `/var/log/caddy/` does not exist. There is no owned record of who reads the archive — only Cloudflare's dashboard, which can't be queried, retained, or snapshotted. This was flagged as worth doing *before* the September 9 snapshot. If it wasn't done, the first annual snapshot has no readership record behind it, and the second one won't either unless this gets turned on now.

### 3.6 [VERIFY] — CLIP coverage never runtime-verified

`art-official-source-of-truth.md` §7.6. 215/216 claimed, never confirmed against a live DB. With the corpus now at 220 works, re-check and report the real number.

---

## Part 4 — Schema and data migrations

### 4.1 [OPEN] — R2 bucket hostname is frozen into every record

**Severity: high, and the window to fix it cheaply has passed.**

`sitemap-and-open-items-brief.md` B7 called this "the most fragile thing in the dataset on a two-century horizon" and said **move to a custom domain before the September snapshot.** Confirmed still live on September 17:

```
"image": "https://pub-6a869efbfec4404396a52a3b7056bfc7.r2.dev/world-war-one.jpg"
```

The September 9 snapshot therefore froze a provider-generated bucket hostname into the permanent record. That can't be undone in the snapshot, but it can be stopped from recurring in the next one — and the live records can still be migrated.

**Task:** custom image domain (e.g. `images.bernardbolter.com` or `img.art-official.org`), CNAME'd to R2, with a migration over all 220 records. Keep the r2.dev URLs resolving; do not break the snapshot's references.

### 4.2 [OPEN] — `image` is a bare URL string, not an `ImageObject`

B7, same list. No `width`, `height`, or `encodingFormat` for any consumer. Worth doing in the same pass as 4.1, since both rewrite the same field.

### 4.3 [OPEN] — Escaped-JSON relations

B7. `seriesHingeMarker` and `relatedWorksAtMaking` are real graph data serialised into strings inside `PropertyValue.value`. No generic JSON-LD tool will traverse them — which is precisely the audience this archive is built for. Both fields are still present on live records.

### 4.4 [OPEN] — Catalogue prefix collisions

B7. All three Gates of Perception works carry `BB-ACH-` prefixes (`BB-ACH-2018-001`, `BB-ACH-2018-002`, `BB-ACH-2017-001`), colliding with A Colorful History numbering. Separately, `Almadinat Alearabia` has `dateCreated: 2022` against `BB-MEG-2021-001`.

**Report before renumbering.** Catalogue numbers are identifiers; changing one is a permanent act and some may already be cited externally.

### 4.5 [OPEN] — Schema reconciliation Phases 2 and 3 never started

`schema-reconciliation-spec.md` (August 24) has four phases. Phase 1 (privacy) and Phase 4 (namespace) are confirmed shipped. **Phases 2 and 3 appear untouched.** Notably:

- **Phase 2 — Linked Art remapping.** The spec's own argument for doing it now still holds and gets weaker every week: 5/217 artworks had any `ownershipHistory`, 0 had `loanHistory`, 6 had `provenanceConfidenceLayer`. This is the cheapest possible moment to restructure, and it only gets more expensive as cataloguing continues.
- **Phase 3.6 — duplicate exhibition-linking paths.** `Events.artworks` (the join, authority side) and `Artworks.exhibitionHistory` (a parallel array) still coexist; `exhibitionHistory` is still present as a field on the public artwork API. One of them needs to be deprecated or explicitly documented as an annotation layer.
- **Phase 3.1 — `creator` on artwork pages** outputs only a bare `{'@id': ...}` pointer with no `@type`, `name`, or identifiers, while `artistAsSchemaPerson()` already builds it correctly elsewhere. **[VERIFY]** — could not read the page JSON-LD from outside; check with curl.
- **Phase 3.3 — video works** still typed `VisualArtwork` only, no `VideoObject`. **[VERIFY]**
- **Phase 3.5 — dead stub fields** (`jsonldPreview`, `jsonldCreatorPreview`, `jsonldWidthPreview`, `jsonldHeightPreview`) written by no hook, read by nothing. **[VERIFY]**

**Recommendation:** Phase 3 is a series of small independent fixes and is the better next move. Phase 2 is a real restructure and deserves its own session — but should not be deferred past the next round of provenance cataloguing.

### 4.6 [VERIFY] — `galleryReference` / `galleryText` readable on the public API

`art-official-source-of-truth.md` §7.4 lists these as forbidden/commerce fields alongside `askingPrice` and `salesRecord`. Those three are correctly absent from anonymous `/api/artworks`; `galleryReference` and `galleryText` appear to be present. The forbidden-list in §7.4 governs *envelope writes*, not necessarily *read access*, so this may be correct by design — **check the intent before changing access.** If they were meant to be private, this is the same class of bug Phase 1 just fixed.

---

## Part 5 — Art/Official cataloguing pipeline

### 5.1 [OPEN] — `artism:DialogueSelfAudit` / `agentModel` still not in the importer

**Severity: high for the cataloguing loop.** `sessions-selfaudit-importer-gap-brief.md` (August 13) is a complete, ready-to-build spec, written because a real session (*The End*, BB-OGP-1994-012) tried to paste this content and hit:

```
{"code":"unrecognized_keys","keys":["agentModel","artism:DialogueSelfAudit",
 "agentDraftDescriptionShort","agentDraftDescriptionLong",
 "agentDraftConceptualKeywords","agentDraftFormalContribution"],
 "path":["writes",1,"fields"]}
```

No project doc records this as built. Until it is, **every session's process-integrity content is dropped on the floor at export time** — and that content is exactly what the Tier 5 spec identifies as the archive's distinctive layer.

Two notes for whoever builds it:

- The brief predates the namespace rename. The field key should almost certainly now be **`art-official:DialogueSelfAudit`**, not `artism:`. Confirm against the live schema before writing the Zod shape — and if the Payload field name has to drop the colon, keep the namespaced form at the serialization layer as the brief already specifies.
- The brief's own first test case still stands: re-import *The End*'s envelope with the self-audit restored.

### 5.2 [OPEN] — `reinforcingSessions` rejected by the envelope validator

`art-official-source-of-truth.md` §7.4, "Known gap." A paste including `reinforcingSessions` on `statementThroughlines` fails with "Unrecognized key."

This was low priority when written — it only bites when a *second* session corroborates an existing throughline. **That condition has now arrived.** The statement page carries five throughlines, at least one explicitly "flagged as pending reinforcement." The next session that corroborates one will hit this. Small fix, now due.

### 5.3 [DECIDE] — The vision-analysis blindness fork

`art-official-source-of-truth.md` Part 9. Still the most consequential undecided item in the cataloguing system.

The standalone blind vision pipeline was retired in July, and its replacement was never given a mechanical instruction — so `dominantColors`, `paintedFieldColors`, `compositionalNotes`, `orientation`, and the five tag fields now sit unpopulated until the artist asks for them at the end of a session, rather than being generated early and silently as the old pipeline guaranteed.

The proposed fix (generate them at Step 4, Light acknowledgment, via `update_field` with `confidence: 'inferred'`, `source: 'image-analysis'`) is written and ready. **What blocks it is a genuine fork, and it's Bernard's:**

- **(a) Retire blindness** along with the pipeline. Accept that the embedded reading is informed by Step 1's pre-upload answers, mark `vision-analysis-prompt-spec.md` A-1.0 fully superseded, write a non-blind A-2.0 with a changelog entry.
- **(b) Preserve blindness structurally** — isolate the image in a fresh reasoning pass scoped to the image alone, even though it happens inside the session.

This is worth weighing against `principles.md`: *"the pairing produces insight neither layer holds alone — blind vision analysis + fully reasoned records together surface connections unavailable to either in isolation."* If that's load-bearing, (b) is the answer and the cost is worth it. If it was an artifact of the pipeline, (a) is honest and cheaper. **Either way, once it's decided, Step 3/4 of `art-official-consolidated-session-flow-spec.md` and A-1.0's header both need updating — they've been "not yet propagated" since July 31.**

### 5.4 [OPEN] — Sessions audit fixes: status unknown, high value

`sessions-audit-cursor-spec.md` (July 24) specified six build steps from a full read of all 20 completed sessions. No project doc confirms any of them shipped. The corpus is now at 46 sessions — more than double — so if these weren't built, twice as much data carries the defects. The two that matter most:

- **Step 2 — automatic-field conflict check.** The audit's clearest finding: `dominantColors`, `paintedFieldColors`, `compositionalNotes` and all five tag fields are re-derived from scratch every session with **no check against already-committed values**, producing silent contradictions on repeat sessions. Confirmed on **Brandenburger Tor. 1899** (4 sessions — tags and overlay colors regenerated differently each time, concept copy rewritten twice with contradictory narratives) and at lower severity on **BASEL switzerland**. Note this compounds with 5.3: if vision fields are now generated inside every session, the re-derivation problem gets *worse*, not better.
- **Step 3 — enum/schema validation before staging.** Repeated commit-time invalid-enum failures across `availabilityStatus`, `artHistoricalReferences`, `dimensionUnit`, with no in-dialogue visibility into valid options before staging.

**First task: find out what was built.** Then close the rest in the spec's stated build order.

### 5.5 [OPEN] — Session-flow eval never run

`art-official-source-of-truth.md` §7.9, still self-described as *"the biggest open item blocking full confidence in the new flow."* The A2/A3/A4 prompt changes shipped to `promptBlocks.ts`, the rubric scaffolding exists in `session-flow-transcript-eval-rubric.md`, and **no live admin transcript eval has ever been run.** The Thinker session was run manually in chat and explicitly does not count.

Every session since has run on unevaluated prompt logic. With 46 sessions on the record this is overdue.

### 5.6 [OPEN] — Stale-spec propagations outstanding since July

All logged in `art-official-source-of-truth.md` as "not yet propagated." Each is a paragraph of editing; collectively they are why a fresh agent reading the specs gets the wrong answer:

| What's stale | Where | Correct value |
|---|---|---|
| `sessionType: 'event'` as a stored value | various specs | Live enum is **`event-enrichment`** |
| `Artist.legalName`, "not yet built" | reading copy | Live field is **`nameLegal`**, built, used by the CV print header |
| `coExhibitors` as `{name}` inline objects | `events-intake-spec.md` §1.3 | **`person` relations**, confirmed broad scope 2026-07-31 |
| The two blind acts conflated (R1) | `session-flow-revision-brief.md` | `firstImpression` = artist's, pre-upload. Vision analysis = agent's. |
| Retroactive `firstImpression` capture (R3) | `session-flow-revision-brief.md` Part 2 | Capture retroactively, don't force a re-ask |
| A-1.0 not marked superseded (R2) | `vision-analysis-prompt-spec.md` header | Blocked on 5.3's decision |

### 5.7 [DECIDE] — Small open cataloguing questions

- Whether `loanHistory` should be reconsidered separately from `exhibitionHistory` for envelope writes (§7.4, raised July 28, low priority).
- Whether the Lombard Street commission deserves its own Artwork and/or Event record — currently untracked anywhere (§10.3).
- Whether the event-session Phase A / Phase B hard boundary is worth its complexity, given the single-pass chat version produced clean results (Part 8). Flagged in both event records' `dialogueRefinementFlag`.
- Timeline throughline connectors render **only when exactly 2 linked artworks resolve** (`Timeline.tsx`, strict `length !== 2`). A 3+-artwork throughline renders as nothing, silently. Documented scope limit, not a bug — but with five throughlines live now, several almost certainly exceed two works, so this is silently dropping real connections today.
- Timeline multi-marker **visual review with Bernard still pending** since July 28; further polish is blocked on it.

---

## Part 6 — State of the corpus, September 17

Read from `/api/corpus/index`. **Re-verify these before quoting them anywhere.**

| Metric | Value |
|---|---|
| Artworks in corpus (published) | 220 |
| `reasoningStatus: complete` | ~29 (≈13%) |
| Works with vision analysis | ~40 (≈18%) |
| Sessions on record | 46 |
| Sitemap `<loc>` entries | ~822 |
| Live statement throughlines | 5 |
| Terms defined at `art-official.org/ns/` | ~12 (v0.1 stub) |

The honest headline: **the infrastructure has outrun the cataloguing.** Five tiers, a resolving namespace, inline transcripts, reciprocal lateral links — all built and working — over a corpus where roughly one work in eight has completed reasoning. That's not a criticism of the sequencing; the infrastructure had to exist first. But it does mean the highest-leverage work now is probably sessions, not features — and it makes 5.1, 5.2 and 5.4 (the things that break or corrupt sessions) more urgent than anything in Part 4.

---

## Part 7 — Verification commands

Run from the iMac. Everything above should be confirmed against these before acting.

```bash
# Corpus state
curl -s 'https://bernardbolter.com/api/corpus/index' | jq '{totalArtworks, totalPublished, coverage, tierMap}'

# Namespace term coverage (2.1)
curl -s 'https://bernardbolter.com/api/corpus/index?depth=survey' | grep -o '"art-official:[a-zA-Z]*"' | sort -u
curl -s -H 'Accept: application/ld+json' 'https://art-official.org/ns/' | jq 'keys'

# Sitemap composition (2.2, 2.3)
curl -s 'https://bernardbolter.com/sitemap.xml' | grep -c '<loc>'
for p in '/vision<' '/record<' '/sessions/' '/series/' '/events/' '/bio/entries/' '/statement/throughlines/' 'api/corpus'; do
  printf '%s\t' "$p"; curl -s 'https://bernardbolter.com/sitemap.xml' | grep -c "$p"
done
# Sitemap artwork URLs that 404 — should be zero
curl -s 'https://bernardbolter.com/sitemap.xml' | grep -o '<loc>[^<]*</loc>' | sed 's/<[^>]*>//g' \
  | while read u; do code=$(curl -s -o /dev/null -w '%{http_code}' "$u"); [ "$code" != "200" ] && echo "$code $u"; done

# llms.txt drift (2.5)
curl -s 'https://bernardbolter.com/llms.txt' | grep -c 'artism:'   # should be 0

# Identity stub (2.6)
curl -s 'https://bernardbolter.com/.well-known/artist-archive.json' | jq .

# Privacy (Phase 1 regression check + 4.6)
curl -s 'https://bernardbolter.com/api/artworks?limit=1' \
  | grep -o -E '"(ownershipHistory|loanHistory|provenanceConfidenceLayer|galleryReference|galleryText)"' | sort -u

# R2 domain (4.1)
curl -s 'https://bernardbolter.com/api/corpus/world-war-one' | grep -o 'r2\.dev'

# Page performance (3.1) — cache headers and TTFB
curl -s -o /dev/null -w 'ttfb=%{time_starttransfer}s\n' 'https://bernardbolter.com/world-war-one/vision'
curl -sI 'https://bernardbolter.com/world-war-one/vision' | grep -i -E 'cf-cache-status|cache-control'

# Services (3.2, 3.4)
pm2 list
pm2 logs --lines 100 --nostream | grep -i 'does not exist'
```

---

## Part 8 — Suggested order

1. **2.3** — resolve the 327-vs-220 question. It gates 2.2 and may be an active crawler-facing defect.
2. **3.1** — cache vision and record pages. Must precede 2.2.
3. **2.2** — expand the sitemap. Highest single-item impact on AI reachability.
4. **2.5 + 2.4 + 2.6** — the copy and stub fixes. Small, independent, currently misleading readers.
5. **5.1 + 5.2** — unblock the cataloguing exports. Every session run before these lands loses content permanently.
6. **2.1** — namespace term coverage. Needs its own pass; report the diff first.
7. **5.4** — find out what shipped from the sessions audit, then close the gaps.
8. **5.3, 5.5** — the decisions and the eval. Bernard's, not Claude Code's.
9. **4.1 + 4.2** — image domain and `ImageObject`, together.
10. **4.5 Phase 3**, then **Phase 2** as its own session.

---

## Do NOT

- Do NOT treat this document as authoritative over `art-official-source-of-truth.md`. Flag disagreements; don't resolve them.
- Do NOT fix 2.3 by making the two numbers match. Find out which one is true.
- Do NOT add routes to the sitemap before the pages behind them are cached (3.1 precedes 2.2).
- Do NOT define namespace terms in `/ns/` purely to close the diff in 2.1.
- Do NOT implement 5.3's Step-4 generation until the blindness fork is decided — building against the wrong branch means rewriting the session flow twice.
- Do NOT renumber catalogue identifiers (4.4) without reporting first. They may be cited externally.
- Do NOT retroactively edit session transcripts, or clean typos in rendered output. The raw record is the grounding layer.
- Do NOT loosen `.strict()` validation anywhere to make a paste succeed.
- Do NOT use a denylist `select` in any new query — allowlist only, standing project rule.

---

*Open issues audit · September 17, 2026 · compiled from project docs + live site check. Every live reading needs curl confirmation before it is acted on.*
