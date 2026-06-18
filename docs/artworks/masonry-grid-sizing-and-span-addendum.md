# Masonry Grid — Sizing Correction & Column-Span Addendum

**Companion documents:** `design-system.md` (grid responsiveness table, spacing/breakpoint rules), `porting-guide.md` (`useArtworkDimensions`, `ArtworkGridImage`, `ArtworksGrid`), `artwork-page-directive.md` (size-tier display logic, `artworkSizeDisplay.ts`)

**Trigger for this addendum:** visual audit of the live masonry grid showed landscape artworks rendering at full column width with a tall slab of empty card space beneath the image before the caption — orientation/size-tier logic is not yet correctly driving grid cell dimensions. This must be fixed before column-span is introduced, because column-span amplifies whatever the per-item height logic already does, correct or not.

This addendum is two parts, in required build order:

1. **Part 1 — Sizing correction.** Make `ArtworkGridImage` cell height derive honestly from real aspect ratio × size-tier factor, inside a fixed column width. No span logic yet — single column width throughout.
2. **Part 2 — Column-span.** Once Part 1 is verified in the browser, allow sufficiently wide landscape works to span two grid columns, with packing logic that keeps the masonry coherent.

Do not begin Part 2 until Part 1 has been visually verified against real archive data (see verification checklist, Part 1).

---

## Part 1 — Sizing correction

### Diagnosis

`ArtworkGridImage` is presumed to currently size the image to fill the column width and let height follow `object-contain`'s natural letterboxing inside a taller fixed-height card — or some other path that does not consult `useArtworkDimensions` per the directive in `artwork-page-directive.md`. The result: landscape works look the same height as portrait/square works in the same row position, with dead card space absorbing the difference.

The fix is not a new system — `useArtworkDimensions` and the size-tier factor table already exist (`design-system.md` Section 6, `artworkSizeDisplay.ts`). The grid view is simply not calling it correctly, or is calling it but then not letting the *card* height follow the result.

### Required behaviour

For each artwork in the grid:

1. Column width is fixed by the current breakpoint (`columnWidth = (gridWidth - (columns - 1) * gap) / columns`, gap and column count from the `design-system.md` table — 1/2/3/4/5 columns, 5/7/9/11/13px gap).
2. The artwork's **intrinsic aspect ratio** (`imageWidth / imageHeight` from CMS data, never measured from a loaded `<img>` at render time) determines orientation per the existing rule:
   - `aspectRatio > 1` → landscape, width is the constraining dimension
   - `aspectRatio < 1` → portrait, height is the constraining dimension
   - `aspectRatio === 1` → square, square factors apply
3. The artwork's `size` field (`sm | md | lg | xl`) selects the factor from the existing table (landscape/portrait factors: xl 0.95, lg 0.85, md 0.75, sm 0.65 — square factors: xl 0.90, lg 0.80, md 0.70, sm 0.60). Grid view uses `useImageFactors: false` (these are the non-single-artwork-page factors).
4. Call `useArtworkDimensions` with `artworkContainerWidth = columnWidth`, `artworkContainerHeight = columnWidth` (the grid cell is treated as a square container at the column width, consistent with how the hook is used elsewhere — container is always square, image respects its own ratio inside it), `imageWidth`, `imageHeight`, `artworkSize`, `useImageFactors: false`.
5. The hook returns `displayWidth` and `displayHeight`. **The card's actual rendered height in the grid is `displayHeight` plus caption height plus card padding — not a fixed or pre-set card height that the image is then centered inside.** This is the core of the fix: height must be an output of the calculation, not an input the image is squeezed into.
6. `object-fit: contain` only — no `object-cover`. This is already a hard constraint from `artwork-page-directive.md`; restating because the grid context made it easy to drift from.

### What this produces visually

A small portrait work and a large landscape work will have visibly different card heights in the same row, by design — that's the masonry's job. A landscape work's image area will be shorter (relative to its width) than a portrait work's, and the card should be exactly as tall as `displayHeight + caption + padding`, with no extra blank space absorbing the difference. If two adjacent cards in different columns end up close in height, that's coincidence from the data, not the layout fighting the data.

### Do NOT

- Do not set a fixed or min card height and center the image within it — card height is derived, not assigned.
- Do not measure aspect ratio from the loaded image at runtime as the primary source — use CMS-stored `imageWidth`/`imageHeight` (this also avoids layout shift on load; reserve space using the calculated `displayHeight` immediately).
- Do not introduce a second sizing calculation specific to grid view — `useArtworkDimensions` / `artworkSizeDisplay.ts` is the single source, called with grid-appropriate container values. If the hook's current implementation cannot be cleanly reused for grid (e.g. it assumes timeline-only inputs), fix the hook to accept a generic square container size — do not fork the logic.
- Do not use `object-cover` anywhere in this component.
- Do not let caption height vary unpredictably from card to card (see spacing note below) — that introduces a second, uncontrolled source of height variance on top of the intentional one.

### Caption spacing — minor fix bundled here

The audit also noted inconsistent gap between image bottom edge and caption text across cards. Caption block gets a fixed `space-3` (0.5rem / 8px) top padding from the image's bottom edge, every card, every breakpoint — this is layout consistency, not part of the size-tier system, so it does not scale with breakpoint the way grid gap does.

### Verification checklist — Part 1

- [ ] Load the grid with a mix of real archive landscape, portrait, and square works at `lg` and `sm` size tiers.
- [ ] Confirm no card shows visible empty space between image bottom and caption beyond the fixed `space-3` padding.
- [ ] Confirm a `sm`-tier landscape work and an `xl`-tier landscape work at the same column width show visibly different image heights, proportional to the factor table.
- [ ] Confirm `object-fit: contain` is in effect (no cropping) by checking a few extreme aspect ratios (very wide panorama-style work, very tall narrow work) if any exist in the archive.
- [ ] Resize through all five breakpoints and confirm column count/gap match the table exactly, and that height recalculates correctly at each column width.
- [ ] Confirm no layout shift / image pop-in — height should be known before the image finishes loading (derived from CMS `imageWidth`/`imageHeight`, not the loaded image element).

Do not proceed to Part 2 until this checklist passes in browser with real data, not placeholder/fixture data.

---

## Part 2 — Column-span for wide landscape works

### Goal

Artworks whose aspect ratio is wide enough that single-column display under-represents their actual scale (the original ask: works "twice as wide as tall") span two grid columns instead of one, at `m:` breakpoint and above only (3+ columns — spanning is meaningless/harmful at 1 or 2 columns, see below).

### Why this is harder than it sounds

This is a fixed-column-count masonry with pixel-precise gap math (not CSS Grid with native row/column spanning, and not a `column-span: all`-style multi-column layout — see `design-system.md`'s grid responsiveness table, which this depends on exactly). Introducing spanning items into a fixed-column masonry means the packing algorithm — wherever it currently decides "next item goes in the shortest column" — now needs to handle items that occupy two adjacent column slots and add their height to both.

### Span determination — data-driven, not manual

**Do NOT** add a manual "span this artwork" checkbox or field to the CMS for editorial per-artwork control. Span is **derived automatically** from the same intrinsic `imageWidth`/`imageHeight` data already used for size-tier display — this keeps it permanently in sync with reality and removes any maintenance burden on future uploads.

Rule: an artwork spans 2 columns when `aspectRatio >= 1.8` (i.e. width is at least 1.8× height). This threshold is a starting value — if it produces too many or too few spanning items once tested against the real archive, adjust the single constant in `artworkSizeDisplay.ts` and re-verify; do not scatter the threshold across multiple files.

This rule applies **only** at `m:` (768px, 3 columns) and above. Below that — 1 or 2 columns — spanning is disabled entirely (a 2-column span in a 2-column grid is just "full width," which defeats the masonry's visual rhythm at that breakpoint, and is meaningless at 1 column). The grid item simply renders at standard single-column width below `m:`, using the Part 1 sizing logic unmodified.

### Sizing a spanning item

When an item spans 2 columns at the current breakpoint:

1. Effective container width for that item = `2 * columnWidth + gap` (two column widths plus the one gap between them — not the simple double, the gap must be included or the spanning item will appear slightly narrower than its two columns combined).
2. Run the same `useArtworkDimensions` calculation as Part 1, but with this doubled-plus-gap width as `artworkContainerWidth` (height input stays consistent with the square-container convention — use the same value for height, i.e. treat it as a square container at the *spanned* width, not the single-column width).
3. The resulting `displayHeight` will be considerably shorter relative to its width than a single-column item, which is correct — a landscape work spanning two columns should look proportionally wide and comparatively short, not be forced into the same height band as single-column items.

### Packing logic

The masonry placement algorithm (wherever the current `ArtworksGrid` decides per-item column placement) needs to change from "place this item in the single shortest column" to:

- For a non-spanning item: place in the single shortest column (unchanged behaviour).
- For a spanning item: find the two **adjacent** columns whose current combined height profile makes the best placement — practically, this means: for each possible adjacent column pair, take the *taller* of the two current column heights (since the item will start at the taller one's height to stay level), and choose the pair that minimizes this value. After placement, both columns in the pair are set to `(starting height) + (item's displayHeight) + caption + padding + gap`.
- This produces the same kind of small bottom-edge raggedness across the chosen pair's "shorter" column that any masonry already tolerates — Pinterest-style layouts handle exactly this case the same way. Do not try to backfill that gap with another item; masonry is allowed to be ragged at column bottoms, that's already true of the existing layout.

### Reflow on resize

When the breakpoint crosses a column-count boundary (e.g. resizing from `l:` 4-column to `m:` 3-column), the entire placement must be recalculated from scratch — which items span, which columns they land in — not incrementally adjusted. This is consistent with how the grid already must behave today for column count changes (Part 1 doesn't change this), but is called out explicitly here because spanning adds another reason a naive "just reflow in place" approach would produce visibly broken layouts (an item spanning columns 2–3 at one breakpoint has no coherent meaning at a different column count).

### Do NOT

- Do not add a manual per-artwork span toggle in the CMS — derive from aspect ratio via the single threshold constant.
- Do not enable spanning below the `m:` breakpoint (3 columns).
- Do not double the column width without adding the inter-column gap — this produces a visibly-too-narrow spanning item.
- Do not attempt to use CSS multi-column (`column-span: all`) or rely on native CSS Grid masonry (`grid-template-rows: masonry`) as a shortcut — neither supports "span exactly 2 of N columns" with the kind of explicit packing control this fixed-column system needs, and switching layout systems is out of scope for this addendum.
- Do not let a spanning item's height calculation skip the gap-inclusive width — this is the single most likely arithmetic mistake in implementation, call it out in code review.
- Do not change non-spanning item behaviour or the Part 1 sizing logic — Part 2 only adds a new path for the subset of items that qualify, it does not touch the baseline.

### Verification checklist — Part 2

- [ ] Confirm at `m:`, `l:`, and `xl:` breakpoints, only artworks with `aspectRatio >= 1.8` span two columns; everything else behaves exactly as in Part 1.
- [ ] Confirm spanning is fully disabled below `m:` (single column at default, two equal columns at `s:`, no spanning items at either).
- [ ] Confirm a spanning item's rendered width visually matches two column widths plus the gap — measure in devtools against a non-spanning item in the same row for a sanity check.
- [ ] Confirm column heights stay reasonably balanced after several spanning items are placed — no single column should run dramatically taller than its neighbours after a full page of real archive data.
- [ ] Resize across the `l:` → `m:` boundary (4 columns → 3 columns) with spanning items present and confirm full reflow happens cleanly, no leftover phantom gaps or items rendered at stale span widths.
- [ ] Spot-check the actual threshold (1.8) against 5–10 real archive works near that ratio — adjust the constant if the line falls in a visually wrong place, then re-run the full checklist.
