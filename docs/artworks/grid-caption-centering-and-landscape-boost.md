# Grid — Caption Alignment, Landscape Scale & Random Translate

**Companion documents:** `grid-caption-overflow-and-hover-removal.md` (overflow rules), `grid-real-size-within-columns-spec.md` (sizing constants).

**Note:** `grid-caption-and-translate-spec.md` is superseded by this document for Sections 1 and 3. The translate spec in that document was never implemented — the authoritative translate spec is Section 3 below.

Three changes in this document:
1. Caption dot alignment — corrected
2. Landscape scale boost
3. Random translate — full spec (not yet implemented)

---

## 1. Caption — dot on left, title vertically centered to dot

### Correction
The previous addendum incorrectly specified dot-above-title (vertical stack, `flex-direction: column`). That is not what was asked. The correct layout is:

```
● Title text here      ← dot left, title to the right, both vertically centered on the same axis
```

Dot on the left, title text to the right of it, **vertically centered** to the dot's midpoint — so if the title wraps to two lines, the dot sits at the optical center of the text block, not at the top of it.

### Layout
```css
.caption-block {
  display: flex;
  flex-direction: row;
  align-items: center;   /* dot vertically centered to title text, even on multi-line titles */
  gap: space-2;          /* 0.375rem between dot and text */
}
```

`align-items: center` is the key property — it ensures the dot's center aligns with the vertical midpoint of the title text regardless of how many lines the title wraps to.

### Anchor point
Caption block is left-anchored to the image's left edge (from `grid-caption-overflow-and-hover-removal.md` — caption is a child of image-wrapper, inherits its left edge). Title text flows right from the dot, overflowing the image width rightward if needed, bounded by column edge. Overflow rules from that spec unchanged.

### Do NOT
- Do not use `align-items: flex-start` — dot must center vertically to the title, not sit at the top of it.
- Do not stack dot above title (`flex-direction: column`) — horizontal row only.

---

## 2. Landscape images — wider default scale

Landscape artworks are reading smaller than expected. The log-curve area calculation treats a 100×70cm landscape and a 70×100cm portrait identically (same `widthMm × heightMm` area), but landscape works read as visually more significant on screen because width dominates perception. An orientation multiplier corrects for this.

### Fix

After computing `scaleFactor` from the log curve (`grid-real-size-within-columns-spec.md` Section 3.3), apply an orientation multiplier before clamping:

```ts
const LANDSCAPE_BOOST = 1.15  // starting value — tune in browser
const PORTRAIT_BOOST  = 1.0   // no change
const SQUARE_BOOST    = 1.0   // no change

function getOrientationMultiplier(aspectRatio: number): number {
  if (aspectRatio > 1) return LANDSCAPE_BOOST
  if (aspectRatio < 1) return PORTRAIT_BOOST
  return SQUARE_BOOST
}

// Applied after raw scale factor, before clamping:
const boosted = raw * getOrientationMultiplier(artwork.aspectRatio)
return Math.min(MAX_SCALE, Math.max(MIN_SCALE, boosted))
```

Clamps applied after the multiplier — a landscape boosted past `MAX_SCALE` simply renders at `MAX_SCALE`. Tune `LANDSCAPE_BOOST` up toward `1.2` if landscapes still feel narrow, back to `1.1` if they start dominating. One constant, one file.

---

## 3. Random translate — full spec (not yet implemented)

### What it does
Each artwork's image-wrapper is shifted slightly from its grid-exact position via `transform: translate(x, y)`. The shift is small, deterministic per artwork, and bounded so nothing visually escapes its column slot. The outer cell is unchanged — masonry height tracking is unaffected.

### Deterministic seeded random

```ts
function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x) // 0 to 1, stable for any given seed
}

function hashStringToInt(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function getTranslateOffset(artworkId: string, cellPad: number): { x: number; y: number } {
  const seed = hashStringToInt(artworkId)
  const rx = seededRandom(seed)
  const ry = seededRandom(seed + 7)

  const TRANSLATE_FRACTION = 0.4  // up to 40% of CELL_PAD — tune in browser
  const maxOffset = cellPad * TRANSLATE_FRACTION

  return {
    x: (rx - 0.5) * 2 * maxOffset,
    y: (ry - 0.5) * 2 * maxOffset,
  }
}
```

Apply as `transform: translate(${x}px, ${y}px)` on the image-wrapper element only — not the outer cell.

### Why seeded from artworkId
Using `Math.random()` directly would reshuffle offsets on every re-render, resize, sort change, and page reload — reading as a bug. Seeding from the artwork's stable Payload ID means the same artwork always gets the same offset in every session, on every device, regardless of sort order or filter state.

### Boundary constraint
`TRANSLATE_FRACTION = 0.4` means maximum offset is `CELL_PAD × 0.4` in any direction. Since `CELL_PAD` is the guaranteed padding around every image, the image-wrapper stays within the cell's padding envelope — it cannot visually collide with a neighboring column's content.

If the grid still reads as too regular after implementation, raise `TRANSLATE_FRACTION` toward `0.6`. If items appear to visually clip or crowd neighbors, lower toward `0.25`. Do not exceed `0.7` — beyond that, collision with neighbors becomes likely at the smaller gap breakpoints.

### Masonry height tracking
The outer cell element is not translated. Masonry measures the outer cell's dimensions for column height tracking. The image-wrapper moves within the cell visually but the cell's footprint in the layout is unchanged. This is the critical separation — `transform` on the child, not the parent.

### Do NOT
- Do not apply translate to the outer cell — masonry breaks.
- Do not use `margin` or `padding` to achieve the offset — these change cell layout dimensions. `transform: translate` only.
- Do not use `Math.random()` — must be seeded from `artworkId`.
- Do not implement before caption (Section 1) and landscape boost (Section 2) are verified — translate makes layout bugs harder to isolate.

---

## 4. Verification checklist

**Caption:**
- [ ] Dot sits to the left of title text, both on the same horizontal row.
- [ ] On a title that wraps to two lines, dot is vertically centered to the text block midpoint, not pinned to the top line.
- [ ] Overflow still works — long title extends rightward past image edge, bounded by column edge.

**Landscape boost:**
- [ ] A landscape and portrait artwork of identical real area now render with the landscape visibly wider.
- [ ] `xl`-tier landscape works are not disproportionately hitting `MAX_SCALE` — spot-check a few in devtools.
- [ ] Portrait and square artworks visually unchanged.

**Translate:**
- [ ] Every artwork image-wrapper is visibly offset slightly from grid-exact position.
- [ ] Reload the page — same artworks have the same offsets. Sort order change — same offsets. Filter change — same offsets.
- [ ] No image-wrapper visually overlaps a neighboring column's content.
- [ ] Masonry column heights are unaffected — temporarily zero `TRANSLATE_FRACTION` and confirm column bottom edges match the translated version exactly.
- [ ] Grid reads as less mechanically regular overall — the eye should not be able to trace a clean vertical line through any column's image edges.
