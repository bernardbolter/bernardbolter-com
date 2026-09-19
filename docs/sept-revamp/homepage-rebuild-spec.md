# Homepage Rebuild Spec

**Date:** 2026-09-19
**Depends on:** `archive-model-revision-brief.md` (read §2.3 standing rules first)
**Scope:** `/` — timeline view, grid view, mobile timeline. No other pages.

---

## 1. What the homepage is for

It is the most-linked, most-indexed page in the archive, and the page agents land
on from search. It should therefore carry the corpus-level facts for **every**
work, not a title list.

**What it delivers today** (verified by fetch, 2026-09-19): all 220 works are in
the server-rendered HTML as real links — good, no lazy-load gate — but each entry
carries only the title, printed twice (alt text duplicates the label). No year,
no series, no medium, no dimensions, no gist. The timeline card is client-side:
only the currently-selected work's details reach the markup.

**Goal:** every work is a self-contained block in the HTML containing its
identity fields, so an agent that fetches `/` once has the whole archive at
triage depth.

---

## 2. Data

### 2.1 Already client-side (Phase A — rendering only)

`ArtworkProvider` holds full `CATALOGUE_ARTWORK_SELECT` rows
(`src/lib/payload/artworks.ts`) for every published work:

| Field | Note |
|---|---|
| `yearCreated` | |
| `seriesSlug` | colour via `getSeriesColor()`; **no series name in the payload** |
| `medium`, `mediumOther` | |
| `widthMm` / `heightMm` / `widthPx` / `heightPx` / `measurementType` | `widthWhole` is not selected; the overlay falls through to mm |

### 2.2 Requires widening `CATALOGUE_ARTWORK_SELECT` (Phase B)

- `descriptionShort`
- `intent`
- Series **name** (currently slug only)
- `primaryImageAltText`
- Throughline and bio-entry links per work

Throughlines are **not** on the artwork. They arrive via `timelineMarkers` from
the artist record (`src/lib/payload/layoutData.ts` → `mapTimelineMarkers`) as
`{ id, text, permalinkHref, linkedArtworkIds }` — drawing data for the connector
overlay, not card copy, and only resolving when exactly two linked works are in
the current filtered timeline. Do not reuse them as card copy; attach
throughlines per work instead.

### 2.3 Weight

Phase B adds prose for up to 220 works. Currently 35 works have
`descriptionShort` or `intent`, so the real near-term cost is small. Measure
after. If it grows, the first thing to move back to `/{slug}` is the
description — identity fields stay.

**Provenance and exhibitions are explicitly out of scope for the homepage.**
They are record-level detail and belong on `/{slug}`.

---

## 3. The artwork block — one block, two presentations

Each work is **one element** in the markup, holding every field. Front and back
are CSS states of that element, not two elements and not two templates. If the
card must sit elsewhere on screen, position it with grid or transforms — do not
create a second copy.

Currently three separate pieces: `TimelineArtworkSlot` (image + crawler title),
`ArtworkTitle` (single overlay for the focused work), `Timeline` (axis, markers,
SVG). The identity fields move into the per-work slot; the overlay reads from it.

**Front (the wall label — what you read while looking):**

- Title
- Year
- Medium
- Dimensions (both units)
- Series dot + **series name in small text, linking to `/series/{slug}`**

**Back (the verso — what the archive knows and where to go next):**

- Title, as heading (the only field that repeats)
- Short description — `descriptionShort`, else `intent`, else **nothing**
  (never a sliced vision sentence)
- Throughline and bio-entry links, by short title
- Catalogue status — one of:
  - `Not yet catalogued`
  - `Catalogued July 2026`
  - `Last catalogued July 2027` (where more than one session exists)
- Link to `/{slug}` — unmissable, not a small line among the fields

Both faces are in the server-rendered source regardless of flip state. Flip is a
CSS transform. **Never fetch on click.**

---

## 4. Timeline view

- Click the image → it **flips**. The back holds the fields above.
- The image is **not** a direct link to `/{slug}`. The route to the artwork page
  is the explicit link on the back. (The title on the front may also link, for
  anyone who wants the direct route.)
- The floating card **fades out** while the back is showing — it would otherwise
  sit beside a painting that is turned around. It may shrink to a small "front"
  affordance so there is always a visible way back.
- The front needs a **flip affordance** — nothing currently announces the image
  is interactive at all.
- **Size floor:** the back grows to a minimum readable width (start at
  **320px**, as a single variable) while larger works keep their true physical
  footprint. Small works at physical scale otherwise give a back too small for a
  label block. Degrade in one direction only; no scrolling inside a
  postcard-sized face.

### Mobile

- Mobile is timeline-only (no grid). The full archive with year ticks loads on
  the vertical scrubber, so it is genuinely browsable.
- The bottom-anchored card is the natural flip control — thumb-reachable, and it
  does not compete with scroll the way the image does.
- There is space above and below the painting, so the back may break the
  footprint here if needed.
- Because there is no grid on mobile, **everything a machine gets from the
  homepage on mobile comes through this view** — which makes §3's "all works in
  the markup" requirement more important, not less.

---

## 5. Grid view

**No flip here.** Twenty flippable tiles is fussy, the labels want to be visible
for scanning, and flipping hides the images that are the point of the view.

- **Label lines visible at rest** under every tile: title, year, series dot +
  name, medium, dimensions.
- Click a tile → it **grows by a constant factor**, neighbours **dim**
  (reduce opacity of the other tiles — not a full-screen overlay; modal reads
  heavy), and the **fixed card** appears with the short description, throughline
  links and a direct link to `/{slug}`.
- **Constant factor, not a fixed size.** If every selected work grew to the same
  size, a small watercolour and a large canvas would look alike — the exact thing
  the physical-scale system exists to prevent.
- **Grow over the dimmed neighbours**, do not reflow the grid.
- **Dismiss:** click anywhere outside, or Escape. The card itself is exempt, so
  clicking inside it to read or follow a link does not close it. Clicking another
  tile does **not** switch selection directly — dismiss first.
- **Card position:** fixed corner, first pass. Test the worst case — selection
  bottom-left, card top-right — and judge whether dimming plus enlargement makes
  the relationship clear. If not, anchored positioning is the targeted fix
  (CSS anchor positioning, Popover API, or Floating UI). A brief transition on
  the card helps more than proximity does.

---

## 6. Series colour

The colours are an ambient system, not a legend: filter swatches, background tint
shifting as the timeline scrolls, part of the nav taking the current series
colour. Keep it. Fix two things.

### 6.1 Fill the greys

`src/helpers/seriesColor.ts` maps 11 slugs and returns `#999999` for anything
missing. `drawings`, `performances` and `watercolors` are unset — so three
published series get no ambient signal at all.
(`docs/filters/right-nav-filter-fix-spec.md` claims they have entries; it is
wrong relative to the live helper.)

| Series | Current | Set to | Change |
|---|---|---|---|
| A Colorful History | `#79C7C5` | keep | — |
| Art Collision | `#93C3A5` | keep | — |
| Breaking Down Art | `#7B1E2B` | keep | — |
| Digital City Series | `#F0A030` | keep | anchor orange |
| **Drawings** | unset → `#999999` | `#8A93A0` | graphite blue-grey |
| Installations | `#D9A7B0` | keep | — |
| Megacities | `#F4623A` | `#E8453C` | clear red, away from DCS orange |
| OG Oil Paintings | `#2E7D1E` | keep | — |
| **Performances** | unset → `#999999` | `#C0714E` | terracotta |
| Vanishing Landscapes | `#7B8CE8` | keep | — |
| Videos | `#A9601E` | `#8B5A2B` | deepen, to separate from terracotta |
| **Watercolors** | unset → `#999999` | `#9FC5D8` | washed blue |
| *Available (status, not a series)* | `#D9A521` | keep | group separately in the panel, above a divider; keep the same circle/square indicator |

Hexes for "keep" rows are eyeballed from a screenshot — use the live Sass values.
Check two things once in: how the four new colours behave as a low-opacity
background tint, and whether Art Collision's sage and OG Oil Paintings' green
hold apart at dot size.

### 6.2 Ambient goes environmental only when there is one subject

| View | Behaviour |
|---|---|
| Timeline (incl. mobile) | Background tint + nav accent follow the current work's series. One work in view, so this works. |
| Grid, unfiltered | **Neutral.** Six series on screen means the background can only pick one arbitrarily. |
| Grid, series filter active | Page may take that series' colour — it confirms the filter state. |
| Grid, work selected | Card may carry the series colour as a small accent. |

### 6.3 The colour teaches itself

Series name in small text beside the dot under every work is what teaches the
mapping — repetition across twenty tiles, with the works themselves supplying the
reinforcement. **No auto-opening filter panel on load.** It moves while people
are trying to look, causes mis-clicks, and is noise on a second visit. The panel
stays closed; by the time someone opens it the swatches are already familiar.

---

## 7. Alt text

Currently `ArtworkImage.tsx` uses `artwork.title` only, so every work's name is
printed twice in the HTML and no image has a description.

- **Alt describes what the image looks like.** It is not intent, and not the
  title. A screen-reader user hearing intent gets no picture.
- Source order: `primaryImageAltText` → first sentence of a vision analysis →
  fall back to the label line (title, year, medium).
- Keep under ~125 characters. Longer descriptions live as visible page text.
- `firstImpression` is session-only and never on the artwork, so it is not
  available here without a session lookup. Alt text *can* be staged in a session
  (it is on the artwork allowlist, catalogued as automatic/agent) — worth doing
  going forward.

This gives the vision layer a concrete public job: alt text for 200-odd works
that would otherwise have none.

---

## 8. Entry points and the count line

- **Series names** beside each dot, linking to `/series/{slug}`. The filter
  panel's twelve names stay filter controls — that is not the place for a link.
- **Throughline and bio-entry sets** are reachable from the existing Bio and
  Statement nav links. Nothing new is needed on the homepage. Confirm both pages
  present their sets as scannable lists of short titles rather than buried in
  prose.
- **Remove the eight bio-entry links currently rendered on the homepage**
  (between the artwork links and the year ticks, each with a full paragraph as
  both link text and `title`). They are invisible to people and fully visible to
  crawlers. If they were intended as timeline markers, that belongs on the bio
  page's own timeline.
- **The count line** becomes the coverage sentence:
  `220 artworks · 29 fully catalogued` — currently `${state.filtered.length} artworks`
  in `src/components/artworks/Artworks.tsx`.

---

## 9. Meta fixes

| Tag | Currently | Problem |
|---|---|---|
| `description` | "…Original art for sale and exhibitions." | commercial framing; the site is an archive |
| `twitter:description` | "Explore abstract artworks from 1980 to present." | wrong — not abstract, not 1980 |
| `title` | "Bernard Bolter's Web Portal" | inconsistent with `og:title` "Bernard Bolter's Art Portfolio" |

These are the strings search engines display.

---

## 10. Acceptance tests

Run by fetching `https://bernardbolter.com` as plain HTML (no JS execution) —
this is literally what an agent receives.

1. **All 220 works present** with title, year, series name, medium and
   dimensions. Not just the selected one.
2. **Alt text is not a duplicate of the title** for any work.
3. **Both faces of the artwork block present** in the source, regardless of flip
   state.
4. **Phase B:** `descriptionShort`/`intent` present for the 35 works that have
   one; **nothing** in that slot for the other 185 — no sliced vision sentences.
5. **Coverage line present** as visible text.
6. **No `#999999`** in the rendered series colours for published series.
7. **Meta description and title** match the archive framing.
8. **Page weight** measured before and after Phase B.

A useful final check: paste the homepage URL to Claude in chat and ask what it
can tell you about the archive. If it can name the corpus size, the coverage,
several works with their series and years, and the fact that throughlines exist —
the page is doing its job.

---

## 11. Sequencing

**Phase A** (rendering only, no data changes): identity fields into the per-work
block, one-block-two-states structure, flip as a CSS state from the start, size
floor as a variable, series colours filled, alt text, meta fixes, count line,
remove the stray bio links.

**Phase B** (widen the select): `descriptionShort`, `intent`, series name,
throughline links per work, `primaryImageAltText`.

**Phase C** (interaction polish): grid selection behaviour, card positioning
judgement, ambient colour rules.

Build the flip as a CSS state over both rendered faces from the first commit —
retrofitting it after is the expensive version.
