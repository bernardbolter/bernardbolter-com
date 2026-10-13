# Artwork block refinement — peel, grid captions, paged verso

**Date:** 2026-10-12
**Scope:** `ArtworkBlock` (timeline), `ArtworkGridImage` (grid), shared
`ArtworkVerso`. Standing rules apply — in particular, everything must be in the
server-rendered HTML regardless of state, and nothing is fetched on click.

Four changes. **1 and 2 are independent and small. 3 is the structural one.**
Do them in order and verify between.

---

## 1. Replace the "Details for {title}" label with a peel

The grey label box sits on the painting and reads as UI dropped on an artwork.
Remove it. Two affordances replace it:

**Desktop — hover peel.**
On hover, the block rotates a few degrees (≈4–8°) around its vertical axis —
enough to reveal the edge of the card behind it. Not a full flip. It should
read as a page lifting, not as a transition starting.

- Use the single-slot 3D mount that already works in Firefox. Do NOT mount the
  3D scene across all 220 slots.
- Ease out, short duration. Reverses on mouse-leave.
- Respect `prefers-reduced-motion`: no peel, show the icon instead.

**Touch — corner icon.**
A small flip/rotate glyph, bottom-right of the painting, low contrast. Always
present on touch, since there is no hover. Tabler `ti-rotate` or similar.

- Icon only, no text.
- `aria-label` keeps the accessible name: "Details for {title}".
- Minimum 44px touch target even if the glyph is smaller.

**Accessibility:** the flip must remain keyboard-reachable and the accessible
name must survive the label's removal. Report how.

---

## 2. Grid captions revert to title and series only

The grid's job is scanning 220 works. Five lines of identity per tile fights
that, and it duplicates what the flip now shows.

- Grid caption: **title + series dot/name only.**
- Year, medium, dimensions move to the verso, which the grid already has.
- The timeline front face stays as it is — no caption there at all.
- `ArtworkIdentityLabel` keeps its full form; the grid mounts it with a reduced
  field set, or passes a variant. One component, two configurations — do not
  fork it.

**SSR check before deploying:** the grid is not the SSR path (`/` renders
timeline-first), so this should not change what an agent receives. Confirm that
— if the grid caption is the only source of year/medium/dimensions in any
rendering path, say so before proceeding.

---

## 3. Paged verso

The back becomes three pages instead of one panel. This solves the cramped
small-work case and makes room for detail currently kept off the card.

| Page | Contents |
|---|---|
| 1 | Title, year, medium, dimensions, series, description |
| 2 | Throughlines and Biography chips (with the existing claim overlay) |
| 3 | Provenance, exhibitions, catalogue status |

**Navigation:**
- Page dots, small, near the bottom.
- Arrows on desktop; swipe on touch.
- Keyboard: left/right arrows move pages when the card is flipped.

**Critical: the record bar appears on every page, not only the last.** Anything
on page 3 is otherwise invisible to most visitors, and the link out is the one
thing that must never be buried.

**Pages must not collide with existing dismissals.** The object now has
front → back → page → overlay. Verify:
- swiping or arrowing between pages never flips the card
- the claim overlay still closes to its page, not to the front
- Escape order: overlay → front (pages do not consume Escape)
- the 10px dead zone around the record bar stays

**SSR:** all three pages render into the HTML at load. Paging is a CSS/JS state
over content that is already there. Report the HTML delta — page 3 adds
provenance and exhibitions for 220 works, which is new weight on a document
already at ~986 KB.

**If the delta is large,** say so before deploying rather than shipping it.
Provenance was deliberately kept off the homepage earlier for exactly this
reason; adding it back is a reversal worth measuring.

---

## 4. Record link label

`OPEN_THE_RECORD_LABEL` becomes **"Everything about the work →"**.

(Was "Open the record", then "See the whole painting →". The back now carries
identity, description and connections, so the link needs to promise what is
actually beyond it: the painting at size, the full record, and the session
transcript.)

---

## Verify

- peel reads as a page lifting on desktop; icon present and tappable on touch
- `prefers-reduced-motion` honoured
- no text label on any painting
- grid reads as a scannable wall again — title and series only
- paged verso works at xs sizes (~426×271 desktop and tighter on mobile), which
  is the case it is meant to fix
- page dots, arrows, swipe and keyboard all work
- record bar present on all three pages
- no dismissal collisions (list above)
- all three pages in the server-rendered HTML
- HTML size delta for `/`, reported before deploy
- dark mode
