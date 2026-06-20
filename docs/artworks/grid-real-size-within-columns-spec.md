# Artwork Grid — Real-Size Scaling Within Fixed Columns

**Status: active direction.** Replaces `grid-return-to-column-span-spec.md` and all four free-flow documents preceding it. Column spans (`2×2`, `2×1`) are abandoned — every item occupies exactly one column slot. Real physical dimensions (`widthMm`/`heightMm`) drive how much of that column slot the image fills, with generous fixed padding around every image so even the largest artwork has visible breathing room, and smaller works have more.

**Carries forward unchanged:** `design-system.md` breakpoint/column/gap table (1/2/3/4/5 columns, 5/7/9/11/13px gap). `artist-archive-schema-final.md` Section 1.3 (`widthMm`, `heightMm`, `aspectRatio`, `sizeTier` as fallback). Masonry placement (existing shortest-column packing — no change to placement engine). Caption treatment (`space-3` top padding, unchanged). Mobile/grid-hidden-below-550px constraint (unchanged).

**Does not carry forward:** any of the rank/magnitude blend, jitter, bin-packing, lane-spanning, or column-span logic from the four free-flow documents and the column-span document. Remove all associated code and utilities (`artworkRelativeSize.ts`, any Packery/imagesLoaded integration, any lane or column-span logic not used elsewhere) rather than leaving dormant.

---

## 1. Core principle

Every artwork cell is the same width (one column width at the current breakpoint). What varies is how much of that cell's interior the image actually occupies. This variation is driven by two things:

1. **Fixed cell padding** — a minimum guaranteed whitespace margin on all four sides of every image, regardless of size tier or real dimensions. This is a design constant, not data-driven.
2. **Real-size scale factor** — within the space left after cell padding, the image's display width is further scaled by a factor derived from its real physical size relative to the archive median. Larger real-world artworks fill more of the available interior; smaller ones fill less, leaving additional whitespace beyond the fixed padding.

Height is always derived from display width × the artwork's intrinsic aspect ratio (`widthMm ÷ heightMm`). Height is never a target or input — it is always an output. This is non-negotiable: the entire history of "dead card space" and "locked row heights" in previous grid versions traced back to treating height as a constraint rather than a result.

---

## 2. Cell padding — `CELL_PAD`

A single constant controlling the minimum whitespace margin on all four sides of every image within its column cell.

```ts
const CELL_PAD = 20 // px — starting value, tune in browser
```

This is the primary "breathing room" lever. The available interior width for any image is:

```ts
const availableWidth = columnWidth - 2 * CELL_PAD
```

`CELL_PAD` applies uniformly to every artwork regardless of size tier or real dimensions — the largest artwork in the archive still has at least `CELL_PAD` of whitespace on each side. Smaller artworks will have more total whitespace simply because their image is narrower within the same cell; `CELL_PAD` is the minimum, not the target.

Starting value `20px` is conservative — deliberately start with visible but not excessive padding and adjust after seeing it against real content. If the artist wants more room, raise this single constant; do not implement per-tier padding overrides.

---

## 3. Real-size scale factor — simple log curve, no rank blending

The scale factor maps each artwork's real physical area to a fraction of `availableWidth`. This is a simpler version of the formula used in the free-flow attempts — no rank component, no magnitude weighting, just a direct log-compressed ratio to the archive median. The complexity of the earlier formula was driven by the free-flow layout's need to express size as the *only* organizing signal in a fully open field; here, the column grid handles structure, so the sizing formula only needs to express relative scale gently, not carry the whole visual hierarchy on its own.

### 3.1 Real area

```ts
function getRealAreaMm2(artwork): number | null {
  if (artwork.widthMm && artwork.heightMm) {
    return artwork.widthMm * artwork.heightMm
  }
  return null
}
```

Primary signal for all `measurementType: physical` works. Fallback chain for non-physical works (digital pixel proxy, then `sizeTier` emergency fallback) is unchanged from `physically-scaled-free-flow-grid-spec.md` Section 2.5 — carry it forward verbatim, it's still needed for the same reasons.

### 3.2 Archive median — computed once per filtered set

```ts
function getMedianArea(artworks): number {
  const areas = artworks
    .map(getRealAreaMm2)
    .filter((a): a is number => a !== null)
    .sort((a, b) => a - b)
  const mid = Math.floor(areas.length / 2)
  return areas.length % 2 !== 0
    ? areas[mid]
    : (areas[mid - 1] + areas[mid]) / 2
}
```

Compute once per filtered/sorted set, not per item, not on resize, not on sort-mode change (unchanged principle from every prior version of this spec).

### 3.3 Scale factor — log ratio to median, clamped

```ts
const COMPRESSION = 0.25  // gentle — less drama than the free-flow attempts needed
const MIN_SCALE   = 0.55  // smallest artwork renders at 55% of availableWidth
const MAX_SCALE   = 0.95  // largest artwork renders at 95% of availableWidth

function getScaleFactor(realArea: number, medianArea: number): number {
  const ratio = realArea / medianArea
  const raw = 1 + Math.log(ratio) * COMPRESSION
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, raw))
}
```

Key differences from the free-flow version:
- `COMPRESSION = 0.25` is gentler than anything tried before — the goal here is a subtle, readable size difference between artworks, not dramatic visual hierarchy. The grid structure and cell padding carry the layout; sizing only needs to whisper "this is physically smaller/larger," not shout it.
- `MIN_SCALE = 0.55` means even the smallest artwork in the archive uses 55% of `availableWidth` — it's clearly visible and recognizable, not a speck.
- `MAX_SCALE = 0.95` means even the largest artwork leaves a little interior space beyond `CELL_PAD`, rather than hitting the cell's padded edge exactly. This keeps the "every image has breathing room" principle even for the biggest pieces.
- Note: `scaleFactor` here is a fraction of `availableWidth`, not a multiplier on a `BASE_DISPLAY_SIZE` constant — this is the key simplification from the free-flow approach, which needed `BASE_DISPLAY_SIZE` because items could be any size in open space. Here, the column width is always the reference, so the scale factor can be expressed directly as a fraction.

### 3.4 Display dimensions

```ts
function getDisplayDimensions(artwork, columnWidth: number, scaleFactor: number) {
  const availableWidth = columnWidth - 2 * CELL_PAD
  const displayWidth   = availableWidth * scaleFactor
  const aspectRatio    = artwork.aspectRatio // widthMm / heightMm, stored field
  const displayHeight  = displayWidth / aspectRatio
  return { displayWidth, displayHeight }
}
```

`displayWidth` and `displayHeight` are the image's actual rendered pixel dimensions. The cell's total height is `displayHeight + 2 * CELL_PAD + captionHeight`. The cell's width is always `columnWidth`. Height is an output — masonry's shortest-column placement then uses `(displayHeight + 2 * CELL_PAD + captionHeight)` as the item's contribution to its column's running height.

### 3.5 Centering within the cell

Since `displayWidth < columnWidth` for every item (always, by design), the image must be explicitly centered horizontally within the column cell. Use `margin: 0 auto` on the image container or `align-items: center` on the cell — confirm which approach fits the existing `ArtworkGridImage` implementation more cleanly. `CELL_PAD` handles the top and bottom spacing; horizontal centering handles the sides.

---

## 4. Tuning constants — workflow

The three constants in `artworkSizeDisplay.ts` (or wherever this utility lives — single file, not duplicated):

| Constant | Starting value | What to adjust if... |
|---|---|---|
| `CELL_PAD` | `20px` | Images feel too cramped → raise. Images feel too isolated/sparse → lower. |
| `COMPRESSION` | `0.25` | Size differences between artworks feel invisible → raise. Differences feel too dramatic → lower. |
| `MIN_SCALE` | `0.55` | Smallest artworks are too small to read clearly → raise. Want more differentiation at the small end → lower carefully. |
| `MAX_SCALE` | `0.95` | Largest artworks look like they're hitting the cell edge → lower. Want the largest pieces to fill more space → raise toward 1.0. |

Adjust one at a time. Check against the real archive, not fixture data. The interdependency to watch: raising `COMPRESSION` makes the formula more sensitive to size differences, which may make `MIN_SCALE` and `MAX_SCALE` clip more artworks at the extremes — if many artworks are hitting the floor or ceiling after a `COMPRESSION` change, that's the signal to also adjust the clamps.

---

## 5. What comes next — random translates (not yet)

The artist confirmed wanting per-item random translate offsets after the sizing is stable. This step is explicitly deferred until the sizing constants above have been tuned and signed off against real content. When that point is reached:

- Apply a small `transform: translate(x, y)` per item, seeded deterministically from the artwork's own ID (not `Math.random()`) so the offset is stable across re-renders, resizes, and page loads.
- Keep offset range proportional to `CELL_PAD` so jitter never moves an image outside its cell's padding envelope.
- This will be a separate, small addendum at that point — do not pre-implement it now.

---

## 6. Do NOT

- Do not implement column spans (`2×2`, `2×1`, or any other) — every item is one column wide, always.
- Do not treat height as an input or target — it is always `displayWidth / aspectRatio`, derived after display width is known.
- Do not center the image by padding rather than by centering the image element itself — padding modifies the cell's layout dimensions and will interfere with masonry height tracking.
- Do not apply different `CELL_PAD` values per tier — uniform padding, every item.
- Do not use `object-fit: cover` — `object-contain` only, there is nothing to contain against since the image is already sized to its own aspect ratio.
- Do not compute `scaleFactor` as a fraction of `columnWidth` directly — it is a fraction of `availableWidth` (`columnWidth - 2 * CELL_PAD`), not of the full column. This matters: a `scaleFactor` of `0.95` should fill `95% of the padded interior`, not `95% of the full column width` (which would spill outside the padding).
- Do not implement the random translate step yet — after sizing is stable and signed off.
- Do not leave any code from the superseded free-flow documents (`artworkRelativeSize.ts`, rank/magnitude/jitter logic, Packery/imagesLoaded, lane-spanning) in the codebase.

---

## 7. Verification checklist

- [ ] Every item renders at exactly one column width — no wider. Confirm in devtools.
- [ ] Every image has at least `CELL_PAD` whitespace on all four sides — measure a few items in devtools, especially the largest artworks (their `MAX_SCALE` should still leave padding, not hit the edge).
- [ ] A small artwork (`xs` or `sm` tier with genuinely small real dimensions) renders noticeably narrower within its column than a large artwork (`xl` tier) in an adjacent column — the real-size signal is visible.
- [ ] Two `lg`-tier artworks of meaningfully different real dimensions render at visibly (if subtly) different display widths — the continuous scaling within a tier is working, not just tier-bucket jumps.
- [ ] No image shows letterboxing dead space (image ends, then empty card space, then caption) — height is derived from display width × aspect ratio with no fixed height container above it.
- [ ] Captions sit immediately below image + `CELL_PAD` bottom margin, consistently across all cells.
- [ ] Masonry column heights are tracking correctly accounting for `2 * CELL_PAD + displayHeight + captionHeight` per item — confirm no columns running visibly out of sync with neighbors due to incorrect height contribution.
- [ ] All three sort modes (recent→oldest, oldest→recent, random) flow correctly — confirm median does not recompute on sort change, only on filter-set change.
- [ ] No leftover code from superseded documents remains in the codebase.
- [ ] Resize across all five breakpoints — column widths recalculate, `availableWidth` follows, displayed image sizes reflow correctly.
