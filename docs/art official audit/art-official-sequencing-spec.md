# Art/Official — Sequencing & Timeline Dates

## Build spec — order, honest dates, and the proportional timeline

*May 2026 · bernardbolter.com · Cursor-ready*

**Companion docs:** `artist-archive-schema-final.md`, `art-official-dialogue-spec.md`, `art-official-status.md`, `art-official-legacy-lookup-spec.md` (seeds dates into the fields defined here), `art-official-audit-view-spec.md`.

---

## Why this exists

The public Timeline view spaces works proportionally to the time between them, so it needs real date *values* to measure gaps. But the exact making dates of most works aren't known — what *is* known, and more reliably, is the **order** they were made in. In WordPress this was solved by bending one `dateCreated` field until the ordering looked right, which made one field do two incompatible jobs: positioning the work and stating when it was made.

This spec separates those jobs. Order is captured as the thing you actually know; a positioning date is *computed* from that order plus a few real anchors; and the date shown to the world stays honest about how much is actually known. The timeline sorts and spaces on the computed values and labels with the honest one, so the fudging never has to happen again.

This sits inside the schema's existing "no false precision" principle — it applies the same honesty the system already demands of `jsonld_dateCreated` to the whole question of when a work was made.

---

## Hard constraints — do NOT

- **Never let `timelineDate` leak into `jsonld_dateCreated` or any public/semantic date claim.** The positioning date is precise *because* it's an internal layout value, not a statement about reality. Public dates derive from `yearCreated` + `datePrecision` only.
- **Never have the model invent a date.** `timelineDate` is deterministic interpolation over order + anchors. The agent *proposes the computed estimate for confirmation*; it does not guess years.
- **Never renumber the whole corpus on an insert.** `sortIndex` is a float — insert between two works by taking the midpoint of their indices.
- **Never recompute `timelineDate` on every record save.** Changing one anchor reshuffles many positions — recompute is an explicit batch over the ordered set, not a per-row `beforeChange` hook.
- **Never make "what year was this?" the primary question.** Ask comparative before/after — it's what the artist can actually answer. Dates are derived, not interrogated.
- **Never require anchors.** With zero known dates the timeline must still work, falling back to `yearCreated`.

---

## The data model

New and clarified fields on the Artworks collection.

| Field | Type | Layer | Definition |
|---|---|---|---|
| `sortIndex` | number (float) | agent/system | **Authoritative order.** The timeline sorts on this. Float so a work can be inserted between two others (10 and 11 → 10.5) without renumbering. Captured via comparative placement. |
| `datePrecision` | select | artist | `exact` \| `month` \| `year` \| `circa` \| `decade` \| `unknown`. How precisely the making date is known. Drives `dateDisplay`. |
| `dateKnown` | date | artist | A concrete known date, when one exists (a dated show, sale, photo). Null when unknown. A work with `dateKnown` set at `exact`/`month`/`year` precision is an **anchor**. |
| `dateEarliest` | date | artist | Optional lower bound (made no earlier than). |
| `dateLatest` | date | artist | Optional upper bound (made no later than). |
| `timelineDate` | date | agent/system | **Computed positioning date.** Drives proportional spacing only. `= dateKnown` for anchors; interpolated from neighbouring anchors by `sortIndex` otherwise. Never a public claim. |
| `dateDisplay` | text | agent/computed | Honest human label derived from `yearCreated` + `datePrecision` (+ bounds / `yearCompleted`). What the viewer sees. |

`yearCreated` (existing, required) remains the honest year. `yearCompleted` (existing) still marks multi-year works. Anchor status is **derived** (`dateKnown != null && datePrecision ∈ {exact, month, year}`) — no separate boolean.

### `dateDisplay` formatting

| `datePrecision` | Output |
|---|---|
| `exact` | `12 March 2019` |
| `month` | `March 2019` |
| `year` | `2019` (or `2019–2021` when `yearCompleted` differs) |
| `circa` | `c. 2019` |
| `decade` | `2010s` |
| `unknown` | `date unknown` (or the series range if available) |
| bounds only | `2018–2020` (from `dateEarliest`/`dateLatest`) |

---

## The interpolation

A pure utility that recomputes `timelineDate` for the whole ordered set. Runs as an explicit batch — after a sequencing session commits, after any `sortIndex` change, or after any anchor change — never per-save.

```ts
type DatePrecision = 'exact' | 'month' | 'year' | 'circa' | 'decade' | 'unknown';

interface DatedWork {
  id: string;
  sortIndex: number;
  dateKnown: Date | null;
  datePrecision: DatePrecision;
  yearCreated: number;
  seriesYearStart?: number;
  seriesYearEnd?: number;
}

function computeTimelineDates(works: DatedWork[]): Map<string, Date>;
```

Algorithm:

1. Sort by `sortIndex`. Identify **anchors** (`dateKnown` set, precision ∈ {exact, month, year}). Anchors keep their `dateKnown` as `timelineDate`.
2. **Between two consecutive anchors** A (date `dA`, index `sA`) and B (date `dB`, index `sB`), assign each non-anchor work `w` between them:
   `timelineDate(w) = dA + (dB − dA) × (sortIndex(w) − sA) / (sB − sA)` — linear on order position.
3. **Before the first anchor / after the last:** extrapolate using the cadence of the nearest interval, then clamp to the series `yearStart` / `yearEnd` (or the present) so nothing lands in an impossible range.
4. **No anchors at all:** fall back to `yearCreated` — place each work at mid-year of its `yearCreated`, spreading works that share a year across that year by `sortIndex`. Coarse, but the timeline still renders.

The result is monotonic with `sortIndex` by construction, so order and spacing never disagree.

**Recompute entry point:** an admin action / route (e.g. `POST /api/art-official/recompute-timeline`, optionally scoped to a series) that loads the ordered works, runs `computeTimelineDates`, and writes `timelineDate` back. Idempotent.

---

## Capturing order — the agent's job

Comparative placement, not date interrogation. Two contexts:

### Inline placement (within `artwork-cataloguing`)

Near the end of a session, the agent places the work in the existing order using **binary insertion** — it doesn't ask about every other work, it narrows: "did this come before or after [title]? … before or after [title]?" Placing one work among *n* takes about log₂(*n*) questions, not *n*. It also captures an anchor opportunistically: "anything that pins this one in time — a show, where you were living?"

### Dedicated sequencing session (new session type)

A `sequencing` session for ordering the back-catalogue in bulk. The agent walks a **series at a time** — order is clearest within a series — building the order through comparative questions, then series get stitched together by their `yearStart`/`yearEnd` plus a few cross-series anchors. The corpus is never sorted all at once.

### Tools

| Tool | Purpose |
|---|---|
| `place_in_sequence` | Input `{ beforeSlug?, afterSlug? }` (or a single reference + `before`/`after`). Stages `sortIndex` as the midpoint between the neighbours. |
| `set_date_anchor` | Input `{ date, precision }`. Stages `dateKnown` + `datePrecision` for the current work, making it an anchor. |

After placement, the agent **proposes the computed estimate for confirmation** — "this sits between your 2018 and 2020 shows, so it lands around mid-2019; does that feel right?" The number comes from the interpolation, not the model. On confirmation, values stage and commit through the normal path; `timelineDate` is recomputed in the batch at commit.

Add a placement block to `buildSystemPrompt.ts`: lead with comparative questions, use binary insertion, capture anchors opportunistically, present computed dates for confirmation, never ask "what year" as the opener, never invent a date.

---

## Migration seeding (from the legacy lookup)

The old WordPress dates already encode the ordering worked out by hand — reuse them as the starting point, so sequencing becomes *confirm and correct*, not build-from-zero:

- WP post `date` → seed `timelineDate` **and** an initial `sortIndex` (order the corpus by post date).
- WP `year` → `yearCreated`, `datePrecision: year` pending confirmation.
- Date conflicts surfaced by `lookup_legacy_record` (e.g. year vs a stray date in free text) become anchor/precision decisions the artist resolves in the session.

The seed is provisional order + provisional positions; the agent tightens it with comparative questions and turns the few genuinely-known dates into anchors.

---

## Timeline view consumption (porting note)

The existing Timeline view (coded, pending port) should read these fields:

- **Sort** by `sortIndex` (fallback `timelineDate`, then `yearCreated`).
- **Space** consecutive works by the difference in `timelineDate`.
- **Label** each with `dateDisplay` — never `timelineDate`.

So the layout is driven by the computed positions while every label tells the truth about precision.

---

## The honesty boundary

One rule, stated plainly so it isn't lost: `timelineDate` exists only in the timeline layer. It never becomes `jsonld_dateCreated`, never appears as a date claim in markup or exports, never displays as the making date. `jsonld_dateCreated` keeps deriving from `yearCreated` + `datePrecision` ("no false precision"); `dateDisplay` is what humans read. The precise positioning value and the honest stated date are different fields on purpose.

---

## Build steps (ordered)

1. Add the fields above to the Artworks collection (single migration pass). `timelineDate` and `dateDisplay` are system/computed — not artist-editable in the admin except via override.
2. `src/lib/artOfficial/computeTimelineDates.ts` — the pure interpolation utility, with the no-anchor fallback.
3. `src/lib/artOfficial/formatDateDisplay.ts` — `dateDisplay` from precision + bounds + `yearCompleted`. Pure.
4. Recompute action — `POST /api/art-official/recompute-timeline` (staff-only), optionally series-scoped.
5. `place_in_sequence` + `set_date_anchor` tools in `agentTools.ts`; handlers in `applyAgentTool.ts` (stage `sortIndex` / `dateKnown` / `datePrecision`).
6. Placement prompt block in `buildSystemPrompt.ts`; add `sequencing` to the session-type enum + routing + commit target.
7. Migration seeding: extend the legacy import path to set initial `sortIndex` + `timelineDate` from WP post dates.
8. Port the Timeline view to sort on `sortIndex`, space on `timelineDate`, label on `dateDisplay`.
9. Unit tests (below).

## Verification checklist

- [ ] `computeTimelineDates` interpolates linearly between two anchors and is monotonic with `sortIndex`.
- [ ] No-anchor fallback places works by `yearCreated` and still renders.
- [ ] Inserting a work between two others sets a midpoint `sortIndex` and renumbers nothing else.
- [ ] `formatDateDisplay` produces `c. 2019`, `2010s`, `2018–2020`, etc. per the table.
- [ ] `timelineDate` never appears in JSON-LD output or any public date field (assert in a serialization test).
- [ ] A `sequencing` session can order a series via comparative placement and commit `sortIndex` values.
- [ ] Recompute is idempotent — running it twice yields identical `timelineDate` values.
- [ ] Legacy seeding produces a provisional order from WP post dates that a session can then correct.

---

## Operating note

1. Build the fields, the interpolation utility, and the recompute action first — that's the engine.
2. Seed order + positions from the legacy dump (already specced) so you start from your old hand-ordering, not a blank slate.
3. Run a `sequencing` session per series: answer before/after questions, drop in the few real dates you remember as anchors, confirm the estimates the agent proposes.
4. Recompute, then check the Timeline view — works should sit in the right order with believable gaps, each labelled honestly (`c. 2019`, not a fake exact date).
5. As you catalogue new work, inline placement keeps the order current without a separate pass.

---

*Art/Official Sequencing & Timeline Dates · build spec · May 2026*
