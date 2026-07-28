# Corpus Traversal — Patch Spec

*July 28, 2026. Follow-up to `corpus-tier-depth-and-traversal-spec.md`, written after live verification and a blind agent traversal test.*

**Context:** the tier pass shipped and verified clean — `application/ld+json`, zero bare camelCase keys, `@type`/`@id` present, series resolving as `#series` across both index and bulk feed (0 `Collection` remaining), 400/200/404/308 all correct, pagination live at 9 pages, `?depth=survey` round-tripping, `availableTiers` accurate against real session counts, `gistSource` correctly preferring artist text over vision analysis.

A blind traversal test then revealed that an external agent **never used the API layer at all** — it hit a fetch failure on its first API call and completed the entire five-level traversal through HTML pages instead. None of `tierMap`, `availableTiers`, `urlTemplates`, `gistSource`, or `?depth=survey` was ever seen. The data is correct; the entry point is rejecting readers.

These six fixes are small. Items 1–3 are the ones that matter.

---

## Fix 1 — Content-type is rejecting fetch tools *(highest priority)*

**Symptom:** an external agent fetched `/api/corpus/venice-in-the-middle`, received what it described as unparseable binary, and abandoned the API layer permanently.

**Cause:** `application/ld+json` with no charset. Many HTTP clients and agent fetch tools treat an unrecognised media type without a declared charset as binary and return raw bytes. The same endpoint was readable before the tier pass, when it served `application/json`.

Confirmed live:
```
content-type: application/ld+json
```

**Fix — do both parts:**

**1a. Always declare charset.** Never emit a bare `application/ld+json`.

**1b. Content-negotiate on `Accept`.** Body identical in both cases; only the header differs.

```typescript
function corpusContentType(req: Request): string {
  const accept = req.headers.get('accept') ?? ''
  return accept.includes('application/ld+json')
    ? 'application/ld+json; charset=utf-8'
    : 'application/json; charset=utf-8'
}
```

Apply to every corpus route: `/api/corpus`, `/api/corpus/index`, `/api/corpus/[slug]`, `/api/corpus/[slug]/sessions`.

`application/json` is universally handled; `application/ld+json` is semantically correct but only helps clients that already know the type. Negotiation gives both at no cost. A reader that explicitly asks for linked data gets it; everyone else gets a type their tooling can parse.

**Do NOT** solve this by reverting to `application/json` everywhere — that loses the linked-data signal for crawlers that do check it.

---

## Fix 2 — Session pages state a privacy boundary that no longer exists *(highest priority)*

`/sessions` and `/sessions/[slug]` currently render:

> "public crumbs only — type, date, linked works. Transcripts stay private."
> "Public crumb only — transcript stays private."

**This is now false.** Tier 5 is public: `/api/corpus/[slug]/sessions` returns full transcripts, `artistRecord`, and `artism:DialogueSelfAudit`. Verified live — `venice-in-the-middle` returns a real session.

The traversal test agent reached this layer, read the copy, correctly treated it as a deliberate content boundary rather than a bug, and stopped. It behaved exactly as it should. It was misinformed by the site.

**Fix:**

1. Remove both strings wherever they appear. Grep for `transcript` and `crumb` across components — the phrasing may vary by call site.
2. Replace with accurate copy plus a **real, server-rendered `<a>`** to the Tier 5 endpoint:

   ```html
   <a href="/api/corpus/{slug}/sessions">Full session data (JSON)</a>
   ```

   On `/sessions/[slug]`, link the session's `primaryArtwork` slug. On `/sessions`, link per row.
3. The link must be in the initial server-rendered HTML, not injected client-side — the whole point is that a crawler sees it.

This also closes the long-standing open item about session crumb pages missing their Tier 5 JSON link.

**Note on scope:** `status: in-progress` sessions remain private and unlinked, unchanged. Only `completed` sessions are exposed, per the existing Tier 5 spec.

---

## Fix 3 — No path from HTML back to the API ladder

`/[slug]/record` names Tier 4 in its own copy but links nothing. `/[slug]` offers Vision / Record / Sessions nav, all HTML. An agent that lands in HTML — which is what happens whenever the API rejects it — has no route to `tierMap`, `availableTiers`, or the sessions endpoint.

The `<link rel="alternate" type="application/ld+json">` tags in `<head>` are not sufficient. Many agent fetch tools strip `<head>` or only extract visible body content.

**Fix:** on every artwork page (`/[slug]`), add visible server-rendered links:

- to `https://bernardbolter.com/api/corpus/{slug}` — label e.g. "Machine record (JSON)"
- to `https://bernardbolter.com/api/corpus/{slug}/sessions` — label e.g. "Session data (JSON)", shown only when `availableTiers["5"]` is true

Footer placement is fine. On `/[slug]/record`, where the page already names Tier 4, also link `/api/corpus/index` so a reader can reach the whole ladder from a single work.

**Do NOT** duplicate a link that a prior partial implementation already added — check first.

---

## Fix 4 — Envelope fields leaking onto embedded records

`/api/corpus` emits `artism:scope`, `artism:depth`, and `artism:tier` on **every embedded record**, 25 per page:

```
"artism:scope":"corpus" "artism:depth":"record" "artism:feedRole":"bulk-export"
"artism:scope":"work" "artism:depth":"record" "artism:tier":4     ← ×25
```

Scope and depth describe **the response**, not the record. An artwork embedded in a corpus-scope feed is not itself a tier-4 response. This re-muddles the exact axis the scope/depth split was introduced to separate, and wastes roughly 375 tokens per page.

`/api/corpus/index` does not do this, so the leak is in `buildCorpusRecord(artwork, tier)` when called in list context.

**Rule:**

| Field | Placement |
|---|---|
| `artism:scope`, `artism:depth`, `artism:tier`, `artism:feedRole` | **Envelope only.** Never on an embedded record. |
| `artism:availableTiers` | Per-record. It is a property of the work. |
| `artism:tierMap`, `artism:urlTemplates`, `artism:coverage`, pagination fields | Envelope only. |

The standalone `/api/corpus/[slug]` keeps all four envelope fields, because there the record *is* the response.

Suggested signature change to make the mistake unrepresentable:

```typescript
buildCorpusRecord(artwork, { embedded: boolean })
```

---

## Fix 5 — Vocabulary entries for new terms

This pass minted roughly nine `artism:` terms that are not defined in `artism-vocabulary.md`:

`scope`, `depth`, `tier`, `tierMap`, `feedRole`, `availableTiers`, `gistSource`, `coverage`, `urlTemplates`

Undefined prefixed terms are the same failure as a 404 namespace, one level down — correct syntax, absent semantics. The point of the whole JSON-LD conversion is that a prefixed term resolves to a definition.

Each needs the standard block used by existing entries: URI, type, domain, range, status, definition, relationship to schema.org. Controlled vocabularies need their value lists written out:

- `scope` → `corpus | subset | work`
- `depth` → `gist | survey | record | sessions`
- `feedRole` → `bulk-export`
- `gistSource` → `artist:descriptionShort | artist:intentLine | vision:{model}`

`gistSource` is the most important to define publicly. It is the field that tells an outside reader whether a gist sentence is the archive speaking or a blind vision model describing surface layout. Undefined, it is an uninterpretable string.

This is a documentation task, not a code change — but it should ship alongside, or the corpus emits vocabulary it has not published.

---

## Fix 6 — Audit script should check both directions

The `reasoningStatus` audit script currently reports records where `reasoningStatus === 'complete'` and `intent` is empty.

Live coverage data on the Megacities subset shows the inverse case also exists:

```json
{"matched":6,"withArtistIntent":2,"withVisionAnalysis":3,"withSessions":1,"reasoningComplete":1}
```

Two works carry artist intent; only one is marked `complete`. `reasoningStatus` is decoupled from actual content in **both** directions.

**Fix:** extend the script to report two lists —

1. `reasoningStatus === 'complete'` with empty `intent`
2. `intent` present with `reasoningStatus !== 'complete'`

Report only. Do NOT auto-correct — reclassification is the artist's call.

This also strengthens the existing decision to compute `availableTiers` from field presence rather than from `reasoningStatus`.

---

## Build order

1. Content-type charset + negotiation (Fix 1)
2. Session page copy + Tier 5 links (Fix 2)
3. HTML → API links on artwork pages (Fix 3)
4. Envelope leak (Fix 4)
5. Audit script both directions (Fix 6)
6. Vocabulary entries (Fix 5) — documentation, can land in parallel

---

## Do NOT

- Do NOT revert to `application/json` everywhere to solve Fix 1 — negotiate.
- Do NOT emit `application/ld+json` without `charset=utf-8` under any circumstance.
- Do NOT expose `status: in-progress` sessions in any new link added by Fix 2.
- Do NOT inject the Fix 2 or Fix 3 links client-side — server-rendered HTML only.
- Do NOT put `scope`/`depth`/`tier`/`feedRole` on embedded records anywhere.
- Do NOT remove `availableTiers` from records — it is correctly placed.
- Do NOT auto-correct `reasoningStatus` values.
- Do NOT touch catalogue numbers, escaped-JSON relations, or R2 image URLs. Still a separate spec.

---

## Verification

```bash
# Fix 1 — default vs explicit Accept
curl -sI 'https://bernardbolter.com/api/corpus/venice-in-the-middle' | grep -i content-type
curl -sI -H 'Accept: application/ld+json' 'https://bernardbolter.com/api/corpus/venice-in-the-middle' | grep -i content-type

# Fix 2 — copy removed, link present
curl -s 'https://bernardbolter.com/sessions' | grep -ic 'transcript stays private'
curl -s 'https://bernardbolter.com/sessions' | grep -o '/api/corpus/[^"]*/sessions' | head

# Fix 3 — visible API links on an artwork page
curl -s 'https://bernardbolter.com/venice-in-the-middle' | grep -o 'href="[^"]*api/corpus[^"]*"'

# Fix 4 — envelope fields appear exactly once
curl -s 'https://bernardbolter.com/api/corpus' | grep -o '"artism:scope"' | wc -l
curl -s 'https://bernardbolter.com/api/corpus' | grep -o '"artism:availableTiers"' | wc -l
```

- [ ] Default fetch returns `application/json; charset=utf-8`
- [ ] `Accept: application/ld+json` returns `application/ld+json; charset=utf-8`
- [ ] Bodies byte-identical between the two
- [ ] `transcript stays private` count is **0**
- [ ] `/sessions` contains at least one `/api/corpus/…/sessions` href
- [ ] Artwork page contains visible `api/corpus` hrefs in server-rendered HTML
- [ ] `"artism:scope"` count on `/api/corpus` is **1**
- [ ] `"artism:availableTiers"` count on `/api/corpus` is **25**
- [ ] Audit script reports both directions
- [ ] All nine terms present in `artism-vocabulary.md` with allowed-value lists

---

## Re-run the acceptance test

After deploy, run the blind traversal again in a **fresh chat**, given only `https://bernardbolter.com/api/corpus/index` and no other URL.

Watch specifically for what the last run never reached:

- Does it stay in the API layer past the first fetch?
- Does it discover the ladder from `tierMap` rather than guessing?
- Does it find `?depth=survey` unprompted?
- Does it use `urlTemplates` to construct addresses?
- Does it reach a session transcript?
- Does it notice `gistSource` and weigh artist-sourced gists differently from `vision:` ones?
- Does `availableTiers` stop it probing empty rungs?

Worth also running against a non-Claude model. If traversal succeeds for one model family and not another, that indicates the path depends on conventions a particular model guesses rather than on what the data states.

---

*Corpus traversal patch spec · July 28, 2026*
