# Archive Model Revision — Master Brief

**Date:** 2026-09-19
**Status:** Supersedes prior tier/traversal specs. Read this before acting on any
document listed under "Specs this supersedes."
**Scope:** bernardbolter.com — site structure, corpus API, session flow, throughline layer.

---

## 1. Why this revision exists

The corpus was designed on the assumption that an AI agent would *traverse* it:
arrive at `/api/corpus/index`, read `tierMap`, narrow with `?depth=survey`,
construct addresses from `urlTemplates`, descend to a record, then to sessions.

Every one of those moves requires following something the response hands the
agent. That is the one capability constrained chat agents lack.

This was demonstrated live on 2026-09-19. In a single session, Claude:

- **Reached** `/corpus`, `/{slug}`, `/{slug}/record`, `/sessions?artwork=…`,
  `/sessions/{id}`, and the homepage — all HTML, all from either a pasted URL
  or a search result.
- **Was refused** `/sessions`, `/sessions?artwork=the-thinker`,
  `/api/corpus/{slug}/sessions`, and `/sessions/{id}` when those URLs appeared
  only as links inside a page it had just fetched.

In-body links are not fetch permission. Only a search result or a URL the user
supplies grants it. The layer built for machines was unreachable; the layer built
for humans worked.

**Conclusion: the most constrained reader sets the floor.** If a chat agent that
can only reach indexed, fast HTML can walk the archive, then crawlers, API
consumers and future tools can too. The reverse does not hold.

---

## 2. The model

### 2.1 HTML is the protocol; JSON is the export

- **HTML** is the agent interface. Every meaningful fact must be reachable as
  server-rendered visible text.
- **JSON** serves readers that were never the problem: crawlers, scripts, the
  Arweave snapshot, anyone building deliberately against it.
- Both render from **one builder**. Separately maintained surfaces drift — this
  project has already produced `llms.txt` vs `/ns/`, two Tier 5 addresses, and
  three conflicting artwork counts.

### 2.2 Three structures, not five tiers

The tier ladder flattens. What remains:

| Structure | What it is | Home |
|---|---|---|
| **Corpus** | what exists | `/` (homepage) and `/corpus` |
| **Work** | what it is | `/{slug}` |
| **Throughline** | what connects | `/statement/throughlines/{slug}`, `/bio/entries/{slug}` |

Nothing is more than two hops from anything. Tier numbers stop describing pages
and start describing sections of a page. The JSON tier parameters stay
answering (they are published and were frozen into the September snapshot) but
they no longer correspond to distinct rungs.

### 2.3 Standing rules

These apply to every future spec. Check work against them.

1. **State the connection, don't only link it.** A constrained agent cannot
   follow a link. Any fact it needs must be in the text of the page it landed
   on. Links remain — they matter for crawlers and humans — but they are never
   the only carrier.
2. **Truncate in presentation, never in data.** Full strings in the HTML,
   clipping in CSS. Where something must be short, write a real short field with
   its own provenance. Never slice a long field to make a short one.
3. **One block, two presentations.** A fact is authored once in the markup.
   Front/back, card/verso, HTML/JSON are presentation states or renderings of a
   single source — never duplicate templates.
4. **Visible small text, not hidden text.** `sr-only` did not survive Claude's
   markdown conversion. Museum-label-scale visible text is the right carrier for
   provenance, dates, status and coverage. Never `display:none`, never
   client-injected, never the sole home for a fact.
5. **Absence over fragment.** Where a real field is empty, show nothing. A sliced
   sentence looks like a statement and isn't.
6. **Provenance in prose.** Training flattens attribution; so does a stripped
   `<head>`. "Bolter describes…" survives both. A `gistSource` field next to the
   text does not.

---

## 3. Decisions taken (reversals of prior specs)

| Decision | Replaces |
|---|---|
| Tier ladder flattened to corpus / work / throughline | `corpus-tier-depth-and-traversal-spec.md`, `corpus-tier-system-brief.md`, `tierMap` framing |
| Sessions fold into `/{slug}` (mirror, not move) | session pages as the only transcript home |
| `/{slug}/record` recast as a plain-text alternate view, not "Tier 4" | `/record` tier labelling |
| Agent-side vision blindness **retired** (A-2.0, non-blind) | `vision-analysis-prompt-spec.md` A-1.0 |
| Corpus JSON becomes a nightly-built file served in slices | per-request assembly |
| Throughline connector removed from the main timeline | `timeline-multi-marker-brief.md` |
| Field revision log as a new collection | no versions layer exists on Artworks or Sessions |
| Homepage carries corpus-level data (currently title-only) | — |

**Not changed:** Bernard's own pre-upload blind reading (`firstImpression`)
stays. It produced the SFMOMA inversion finding in The Thinker session and is
unaffected by 2.3 or by the A-2.0 change.

**Do not break published URLs.** The September 9 snapshot froze addresses.
`?depth=survey`, `?tier=5`, `/api/corpus/{slug}/sessions` all keep answering,
resolving to whatever the new shape is. Removing rungs is fine; 404ing a cited
address is not.

---

## 4. Verified facts (Cursor audit, 2026-09-19)

Use these numbers. Older documents are wrong.

| Fact | Value |
|---|---|
| Published artworks | **220** (homepage, `/corpus`, corpus JSON and sitemap all agree) |
| The "216" in older specs | historical; four works added since |
| Sitemap `<loc>` count | 593 — of which 220 are artwork pages. The "327 artworks" in the 17 Sep audit was a misread of URL totals |
| `reasoningStatus = complete` | 29 |
| `reasoningStatus = stub` | 190 |
| `reasoningStatus = partial` | 1 |
| `descriptionShort` populated | 25 |
| `intent` populated | 32 |
| Either | 35 |
| Vision analyses | 40 works |
| Sessions | 46 |
| Throughlines with slugs | **35** (not 5) |
| Bio entries | 8 |
| Published series | 15 |

**Corrections to the 17 Sep audit:** the sitemap gap is closed — vision,
session, series, throughline, bio-entry and event URLs are all present. The
`stub` vs `complete` contradiction observed on `/corpus` was a stale render, not
a data problem (live is `complete` everywhere) — but that implies
`revalidateArchive` is not reliably busting `/corpus`, which is worth checking.

---

## 5. Work programme

### Phase 1 — Homepage (buildable now)

See `homepage-rebuild-spec.md`. Self-contained; every decision made.

### Phase 2 — Artwork page consolidation

`/{slug}` is already the canonical record and needs no content merge. What it
needs:

- **Breadcrumb wayfinding.** `/record` has Corpus / Artwork / Vision / Record /
  Sessions; `/{slug}` has none. Add it, and link the series page (currently
  plain text).
- **Sessions folded in.** The session where this work is primary, transcript
  inline, server-rendered, collapsed for humans — the pattern session pages
  already use successfully. Sessions that only *mention* it: linked, with real
  anchor text (primary work + date). `/sessions/{id}` stays canonical; a session
  touching nine works has no single artwork that owns it.
- **Ordering.** Record fields, then transcript, then mentioning sessions, then
  vision analysis last. Claude-side truncation is invisible and unavoidable; what
  survives a cut should be the artist's words, not the machine's reading.
- **`/record` recast.** Drop the tier label. It currently holds *less* than
  `/{slug}` (no dimensions, making, provenance, throughlines, similar works).
  Either bring it to parity as a plain-text rendering of the same builder, or
  make it explicitly a reading view. Do not leave a page labelled "Tier 4" that
  is a subset of an unlabelled page.
- **Path-based session URLs.** `/{slug}/sessions` alongside the existing query
  form. `/{slug}/session` currently 404s and is the address an agent guesses.
- **Caching.** `/{slug}`, `/record`, `/vision` are `no-store` at the edge; only
  `/api/corpus/*` is on the Cloudflare rule. Now that `/{slug}` is the canonical
  page for everything, this is the cheapest large win available.
- **Session page titles.** Every session page is `Session | Bernard Bolter`.
  Make it `The Thinker — Art/Official session, July 28, 2026`. This is why
  search could not surface a session page despite the sitemap entry.

### Phase 3 — Nightly corpus build

- One generated file, rebuilt nightly, as the **source** for corpus responses.
- **Still addressed in parts.** `/api/corpus/{slug}` serves that work's slice
  (21 KB, 0.88s — the one endpoint an external agent has successfully used). A
  redirect to a multi-megabyte dump would break it.
- `/api/corpus/all` serves the whole file. `/api/corpus/index` serves a manifest
  derived from it.
- **One assembler.** There are currently two builders with different shapes
  (`buildCorpusRecord` for the index projection, `buildArtworkJsonLd` for full
  records). Make the file the full record and derive the projection from it, or
  the drift problem is rebuilt inside the new system.
- **A briefing file** — `/api/corpus/briefing` or similar: every work with
  identity, series, status and gist; full record fields for reasoning-complete
  works; committed automatic fields for works with prior sessions; a session
  ledger (which sessions exist, which works they touch, what they covered) —
  **without transcript text**. Target under ~60k tokens. This is the file
  Bernard pastes at the start of a cataloguing session.
- **Build-time reporting.** The nightly job is the natural home for a
  `reasoningStatus` audit and a link check across everything the corpus emits.
  A build that reports its own inconsistencies each morning is worth more than
  one that only produces a file.
- **Timestamp and precedence.** The file states when it was generated and that
  live per-record endpoints supersede it.

### Phase 4 — Throughline layer

**Blocked on two things, in this order:**

1. **A redirect mechanism.** Slugs are sticky but editable, and there is no
   redirects plugin. Renaming a throughline slug 404s the old URL. Build
   redirects *before* renaming anything.
2. **A review of the 35 throughlines as a set.** 35 claims across 29 fully
   catalogued works suggests overlap. Some may merge; some may be single-work
   observations that aren't throughlines. This is Bernard's writing task.

Then:

- **Three levels for every throughline and bio entry:** permanent short slug,
  scannable short title (4–6 words), full claim as the body. Current permalinks
  are entire paragraphs used as both link text and URL.
- **Throughline page structure:** the claim; the works in sequence with the
  evidence at each step, quoted in Bernard's words with a pointer to the session
  turn; which session first noticed it and which reinforced it; status.
- **Status vocabulary:** pending / corroborated / extended / **weakened**. The
  last one is the honest-record principle applied to readings — a trail that
  says "this ran through the work until 2004, when it stopped" is better than a
  tidy argument, and it is what distinguishes this from a portfolio narrative.
- **Evidence quoted at build time**, not fetched client-side. The nightly build
  re-pulls it and flags mismatches when a work's record changes.
- **Session export carries a throughline block:** throughline id; one of
  **create / reinforce / extend / weaken**; the evidence line in Bernard's
  words; the turn it came from; for extend and weaken, the proposed new wording
  alongside the old. The agent proposes; Bernard accepts — as with the
  candidates at turn 46 of The Thinker session.
- **Importer unblock:** `reinforcingSessions` is still rejected by the envelope
  validator, so corroboration cannot be recorded. Same for `DialogueSelfAudit`
  and `agentDraft*`.
- **Timeline connector removed** from the main artwork timeline
  (`Timeline.tsx` → `throughlineSegments`). A chronological axis and a
  throughline are different orderings of the same works; overlaying them gives a
  line across the archive that can only be read by scrolling all of it. The
  sequence view belongs on the throughline page. A single line on the artwork
  block — "part of: …" — carries the connection at the point of attention.
- **Bio entries** get the same treatment, on the bio page's own timeline.

### Phase 5 — Field revision log

New collection. Artworks and Sessions have no versions layer.

- **The field holds the current value; the log holds how it got there.** Pages
  and JSON stay flat and readable.
- **Entry shape:** field name, new value, previous value, session + turn, date,
  kind.
- **Kinds:** `filled` (was empty) · `corrected` (old value was wrong — the
  Lombard Street 1925/1922 case) · `refined` (same claim, better wording) ·
  `expanded` · `reconsidered` (Bernard now sees it differently — the one that
  carries real weight, and the one a tidy system would overwrite).
- **Only testimony fields are versioned:** intent, making, contribution,
  rejections, provenance, series context. Derived fields (colours, embeddings,
  keywords) are regenerated, not historied.
- **Whole field, not sentence-level diffing.** The transcript already provides
  the fine grain.
- **Nothing is deleted.** A superseded value stays with its reason.
- **In HTML:** current value as prose; history present in the server-rendered
  source, collapsed. One line per change — what it was, when, why, linked to the
  turn.

### Phase 6 — Vision A-2.0 (non-blind)

- New prompt version with a changelog entry; A-1.0 marked **superseded**, not
  "should be".
- Update Steps 3/4 of the consolidated session flow, which still instruct the
  agent to fire the retired pipeline silently.
- **Existing entries are left as they are.** The note that readings from
  2026-07-11 onward may be artist-context readings is already on record; that is
  the honest version and should not be rewritten retroactively.
- **Every analysis records its conditioning** — what the model had access to —
  so a 2026 entry reading "image plus full record" and a 2028 one reading "image
  only" remain comparable.

---

## 6. Session flow changes

- **Cataloguing runs through chat, not the Payload admin agent.** The in-app
  agent's lack of corpus access is therefore not the bottleneck. The briefing
  file is.
- **The briefing paste is part of the protocol.** Claude states what it needs,
  with the URL in a fenced code block, unbroken, with `https://`. Requests are
  batched, not one at a time. (Turn 26 of The Thinker session is the precedent:
  Bernard pasted the corpus URL because Claude could not reach it.)
- **Short slug + short title are proposed at the moment a throughline or bio
  entry candidate is offered**, and accepted or amended in the same exchange.
  Otherwise every new session creates another paragraph-slug.
- **Revisits:** a session must know what previous sessions committed, so it
  confirms, corrects or adds rather than re-deriving. Brandenburger Tor produced
  four sessions with re-derived tags and colours and contradictory concept copy.
  `fieldsCoveredThisSession` exists and the `/sessions` index selects it, but
  imported sessions arrive with neither it nor `fieldUpdateTimeline` populated —
  hence "0 fields confirmed" on every row. This is an importer gap, not a UI bug.

---

## 7. Open items requiring Bernard

| Item | Note |
|---|---|
| Short titles + slugs for 35 throughlines and 8 bio entries | Writing task. Review as a set first. |
| Review of whether 35 throughlines should merge | Some may be two claims or single-work observations |
| Size floor for the flipped verso | Start at 320px, tune once real content is visible |
| Whether `/record` reaches parity or becomes a reading view | Phase 2 |
| `reasoningStatus` reclassification | Some works `complete` with no intent; others with intent not marked complete |
| Training-crawler policy | robots.txt currently allows. Consistent with project goals, but worth deciding on purpose |

---

## 8. Not yet discussed

- **Search.** In the nav, never specified. It is the other way a person moves
  through 220 works.
- **Re-running the cross-model traversal test.** Nothing records it running
  since the namespace rename. Add a fifth scenario: Claude running an
  Art/Official session in chat and needing a sibling work mid-dialogue.

---

## 9. Constraints for implementing agents

- **Do not** normalise artwork display to fill grid cells. Physical-scale display
  is the core visual principle; size and orientation constraints apply
  simultaneously.
- **Do not** put facts only in `<head>`, JSON-LD, `sr-only`, or client-injected
  DOM.
- **Do not** create a second template that renders the same fields.
- **Do not** slice a long field to produce a short one.
- **Do not** 404 a published URL. Redirect.
- **Do not** rename throughline or bio slugs before redirects exist.
- **Do not** rewrite existing vision entries or transcripts retroactively.
