# Grid Caption Overflow & Hover Removal Addendum

**Companion documents:** `grid-caption-and-translate-spec.md` (caption alignment, title treatment, translate — this addendum refines Section 1 and 2 of that document).

Two things addressed here:
1. Caption overflow behavior when title text is wider than the image
2. Remove existing image hover effects entirely

---

## 1. Caption overflow — title wider than image

### The situation
Because image display width is driven by real physical size (55%–95% of available column interior), small artworks render at a noticeably narrow width. A title like "Stern Grove Watercolor No. 8" may be wider than the image above it. The caption must handle this gracefully.

### Layout rule
The caption block (series dot + title text) is **left-anchored to the image's left edge** and **allowed to overflow rightward** beyond the image width, up to the column boundary. It does not wrap to stay under the image. It does not center itself under the image.

```
[column width]
  [image-wrapper — centered via margin: 0 auto]
    [image — displayWidth wide]
    [caption-block — left: 0, width: unconstrained, overflow rightward]
      ● Series dot
      Title text that may extend beyond image edge →→→
```

### Implementation

The image-wrapper is centered in the column with `margin: 0 auto` and `width: displayWidth`. The caption block sits inside the image-wrapper but must be allowed to overflow it rightward:

```css
.image-wrapper {
  width: var(--display-width); /* computed per artwork */
  margin: 0 auto;
  overflow: visible; /* critical — do not clip caption */
}

.caption-block {
  display: flex;
  align-items: flex-start;
  gap: space-2; /* 0.375rem between dot and text */
  width: max-content; /* takes only what it needs */
  max-width: calc(columnWidth - leftOffsetOfImageWrapper);
  /* leftOffsetOfImageWrapper = (columnWidth - displayWidth) / 2 */
  /* This prevents caption from overflowing the column's right edge */
  margin-top: space-3; /* 0.5rem gap below image */
}
```

The `max-width` on the caption block is the key constraint — it prevents the title from running past the column's right edge even on very small images with long titles. The formula: `columnWidth - ((columnWidth - displayWidth) / 2)` — i.e. the column width minus the left offset of the image-wrapper. This is the maximum rightward reach from the image's left edge before hitting the column boundary.

In practice this can be expressed as a CSS variable set inline alongside `--display-width`:
```tsx
style={{
  '--display-width': `${displayWidth}px`,
  '--caption-max-width': `${columnWidth - (columnWidth - displayWidth) / 2}px`,
}}
```

### Dot anchoring
The series dot is the visual anchor — it always sits at the image's left edge, regardless of title length. Title text flows right from the dot. If the title is shorter than the image width, dot + title sits neatly below the image left-aligned. If the title is longer, it extends past the image edge to the right. In both cases the dot is the stable left reference point that ties the caption to the image above it.

### Do NOT
- Do not set `overflow: hidden` on the image-wrapper — this clips the caption.
- Do not constrain the caption block to `width: displayWidth` — title must be free to extend beyond the image width.
- Do not center the caption block under the image — left-align to image left edge, always.
- Do not allow caption to overflow the column's right edge — the `max-width` formula above prevents this.
- Do not right-align title text — the spec says explicitly it flows left-to-right from the dot, not right-justified.

---

## 2. Remove existing image hover effects

The current grid has hover effects on artwork images (exact effects visible in the live site — likely a color overlay, opacity change, or scale transform based on the existing Sass/component implementation). These are to be removed entirely. No replacement hover effect on the image itself.

What remains on hover (from `grid-caption-and-translate-spec.md` Section 2):
- Year text fades in below title (`opacity: 0` → `opacity: 1`, `@media (hover: hover)` only)

What is removed:
- Any `transform: scale()` on the image on hover
- Any color or opacity overlay on the image on hover
- Any border or box-shadow that appears on hover
- Any other visual change applied to the image element or its direct wrapper on hover

The image itself is inert on hover — no visual feedback beyond the cursor changing to a pointer (which indicates it's a link to the single artwork page, as before). The only hover response is the year text appearing in the caption below.

### Finding existing hover effects
Search the codebase for hover styles on `ArtworkGridImage`, `ArtworkCard`, or equivalent grid item components. Check both Tailwind `hover:` utility classes and any CSS/Sass applied via className or stylesheet. Remove all of them. If any are shared with non-grid contexts (e.g. the same component used in timeline view), scope the removal to the grid context only — do not inadvertently remove hover effects from other views.

---

## 3. Verification checklist

- [ ] Find two or three real artworks in the archive with long titles (e.g. "Stern Grove Watercolor No. 8") and confirm their caption extends rightward past the image edge without clipping.
- [ ] Confirm caption never overflows past the column's right edge even for the narrowest image + longest title combination in the archive.
- [ ] Confirm series dot always sits at the image's left edge regardless of title length — it is the stable anchor.
- [ ] Confirm image-wrapper `overflow: visible` is set — check in devtools that caption text is not clipped.
- [ ] Confirm all existing image hover effects (scale, overlay, opacity, shadow) are removed from grid items — hover over several items and confirm the image itself shows no visual change.
- [ ] Confirm year still fades in on hover (caption hover behavior from `grid-caption-and-translate-spec.md` Section 2 is unaffected).
- [ ] Confirm removal of hover effects did not accidentally affect the timeline view or any other view that reuses the same components.
