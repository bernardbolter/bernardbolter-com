# Session transcript and vision analysis — layout spec

**Date:** 2026-10-13
**Scope:** `/{slug}` — the sessions layer and the vision analysis. The record
layers above are unchanged.
**Standing rules apply.** In particular: everything server-rendered regardless
of state, nothing fetched on click, truncate in presentation never in data.

---

## What this fixes

The record section has a designed structure — two columns, labelled blocks,
status and edition panels on the right. Below it, the transcript arrives as an
undifferentiated run of speaker-labelled paragraphs at full width, and the
vision analysis as unbroken prose at the bottom. Both read as raw material
dumped under a designed page.

**Measured shape to design against** (47 sessions, 43 analyses):

| | value |
|---|---|
| Public turns per session | median 59, p90 133, max 178 |
| Turn length | median 184 chars, p90 635, max 3,782 |
| Vision analysis length | median 2,618 chars, max 4,440 |
| Works with >1 analysis | 3 |
| Deutsche Stadt page | transcript 24 KB, vision 3.8 KB |

So: a long run of medium paragraphs against a single much shorter block. The
ratio is roughly six to one, and it inverts on works with a short session and
two analyses.

---

## 1. Two columns

- **Left (wider, ~1.6fr):** the session transcript.
- **Right (~1fr):** the vision analysis.
- Gap generous enough that the two columns read as separate voices.

**The right column is sticky** while the transcript is longer than it. This is
what makes the layout survive the length mismatch — the machine reading stays
beside the dialogue instead of ending a fifth of the way down and leaving a
void.

**Sticky must switch off when the right column is the longer one.** Basel
Switzerland has two analyses and may outrun a short transcript. In that case
the right column scrolls normally. Handle both, and report which works fall on
each side.

**Mobile:** single column, transcript first, vision below. This also preserves
the ordering rule — what survives an agent's truncation should be the artist's
words, not the machine's reading.

---

## 2. Voices by typeface

Replace the `ARTIST` / `ART/OFFICIAL` labels above every turn. At 60 turns they
are visual noise and they make the exchange read as a script.

- **Artist turns: serif.** Slightly larger, primary text colour.
- **Agent turns: sans.** Slightly smaller, secondary text colour.
- No labels, no indentation, no speaker prefix.

**Accessibility:** the speaker must still be identifiable to a screen reader
and in the markup. Use a visually-hidden speaker name or an appropriate
attribute — the distinction must not exist only in the font. Report how you
handled it.

**Check the long-turn case.** Some turns run to 3,782 characters. A serif
paragraph at that length needs a comfortable measure — report whether the left
column is narrow enough or whether the type needs to step down.

---

## 3. Field-write markers (conditional)

Storage holds 618 `update_field` tool calls across the sessions, and
`extractTimelineFromMessages` already reconstructs them — but the public
projection drops `toolUses` entirely.

**If the feasibility check clears it:** under an artist turn that produced
field writes, a small line naming the fields written — e.g. *wrote series,
seriesContext*. Quiet, smaller than the body, secondary colour.

This is what turns the transcript from a log into evidence: a reader can see
which answer produced which field on the record above.

**Privacy check first.** Tool inputs may contain values that are fine (they
became public fields) and values that are not. Audit before surfacing anything,
and surface **field names only, never values**.

**If it isn't feasible cheaply, skip it** — the rest of this spec stands
without it.

---

## 4. The truncation cut

The transcript currently shows 16 turns then hides the rest in `<details>`. 16
is arbitrary.

- Cut at something meaningful — the end of the pre-upload beats is identifiable
  from content even without markers (the upload happens, and the register
  changes).
- If no reliable signal exists, cut at a round number and say so.
- **The full transcript stays in the HTML regardless.** The `<details>` pattern
  already works — an agent fetching the page gets all 64 turns today and must
  continue to.
- The control's label should say how many turns remain: "Show the remaining 58
  turns".

---

## 5. Vision analysis

- Narrower measure than the record prose. It is one unbroken block of
  2,600 characters on average with no internal structure, so the only levers
  are width and type.
- **Conditioning line at the top, always:** model, date, and what the reading
  had access to — e.g. *claude-fable-5 · 2 June 2026 · image and record*.
  This is the thing that distinguishes an honest record from a page with more
  text on it. Now that vision is non-blind, a 2026 reading made with the record
  in hand and a 2028 one made blind must be visibly different, and this line is
  where that shows.
- **Where conditioning is not stored** (the schema holds only `text`, `model`,
  `date`), show what is known and omit the rest rather than guessing. Report
  what it would take to record conditioning going forward.
- Multiple analyses stack, newest first, each with its own conditioning line.
  Note that `world-war-one` has two identical analyses — a duplicate, worth
  flagging separately.
- **Try it without the tinted panel first.** The typeface difference and the
  column position may already do enough separation; a filled background on top
  of that may be too much.

---

## 6. Mentioned sessions

Sessions where this work is only mentioned stay as links below the transcript,
with their existing anchor text (primary work + date). Unchanged by this spec.

---

## Verify

- Deutsche Stadt (1 session, 64 turns, 1 analysis): columns balance, sticky
  holds
- Basel Switzerland (2 analyses): the inverse case — sticky off, right column
  scrolls
- A work with the longest session (nietzche-s-dream, 178 turns)
- A work with a 3,782-character turn: measure still readable
- `nature-vs-nurture` has a session with 0 messages — the layer must not render
  an empty transcript shell
- Screen reader announces the speaker on every turn
- Full transcript still in the server-rendered HTML
- Mobile stacks transcript first
- Dark mode
- Report the HTML delta for `/deutsche-stadt`
