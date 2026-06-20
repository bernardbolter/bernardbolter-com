# Physically-Scaled Free-Flow Grid — Specification

**Supersedes:** Part 2 ("Column-span for wide landscape works") of `masonry-grid-sizing-and-span-addendum.md` in full. That approach — deriving column-span from aspect ratio inside a fixed-column masonry — is abandoned. The column-span implementation already attempted in the live grid produced an inverted hierarchy (wide landscape works at 2-column span visually outweighed true `xl`-tier Megacities works at 1-column span), and the underlying ask turned out to be a different problem than "which items get to span more columns."

**Carries forward:** Part 1's principle that height must be *derived*, never assigned — this spec generalises that principle to both dimensions, derived from real-world size rather than from a 4-tier bucket.

**Companion documents:** `artist-archive-schema-final.md` Section 1.3 (Size and orientation — `sizeTier`, `orientation`, `aspectRatio`, and the physical dimensions block with `widthMm`/`heightMm`), `design-system.md` (existing grid responsiveness table — largely superseded by this doc for the grid view specifically; spacing scale and breakpoint names remain in force), `right-nav-filter-fix-spec.md` (existing Sort section: recent→oldest, oldest→recent, random — this spec consumes that sort order, does not change it).

---

## 1. What changed and why

The previous approach tried to express two different things — orientation (wide/tall/square) and real-world scale (`sizeTier`) — through one mechanism (grid footprint), and they fought each other. A `md`-tier landscape work spanning two columns ended up larger on screen than an `xl`-tier Megacities work confined to one column, which is backwards: tier should dominate, and orientation should only shape how that dominance is expressed, not compete with it.

The artist's own framing, confirmed in conversation: relative size between artworks matters more than maintaining a grid structure at all. Since every artwork has real, normalised width/height (`widthMm`/`heightMm`, already computed server-side regardless of whether the artist entered cm or inches — see schema Section 1.3), there is no need to route through the 4-value `sizeTier` bucket as a proxy for scale in this view. Real dimensions are a strictly better signal: two `lg`-tier works of genuinely different size will now render at genuinely different sizes, which a 4-bucket system can never express.

This view moves from a column-constrained masonry to a **free-flowing field of independently-sized boxes**, each box's size derived from that artwork's real area relative to the whole archive's median area, compressed through a log curve, and clamped at both ends. No grid columns exist underneath. Items flow left-to-right, wrapping naturally, in the order produced by whichever sort mode is currently active (recent→oldest, oldest→recent, or random — unchanged, see Section 6).

---

## 2. Core sizing algorithm

This lives in a new utility, `artworkRelativeSize.ts`. Single source of truth — no duplication into the component.

### 2.1 Real area per artwork

```ts
function getRealAreaMm2(artwork): number | null {
  if (artwork.widthMm && artwork.heightMm) {
    return artwork.widthMm * artwork.heightMm
  }
  return null // see Section 2.5 for fallback chain
}
```

`widthMm`/`heightMm` are populated for all `measurementType: physical` works via the existing `beforeChange` hook (schema Section 1.3). This is the primary signal.

### 2.2 Dataset median — computed once per grid load, not per item

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

Compute this **once** for the full filtered/sorted set currently being displayed (i.e. if the artist applies a series filter, the median recalculates against that filtered subset — not the whole archive). This is what makes a filtered Megacities-only view, for example, still show meaningful relative variation among Megacities works rather than everything in that subset reading as uniformly "large" against an archive-wide median that includes small drawings. Recompute on every filter/sort change that alters the item set; do not recompute on resize alone (resize only affects wrap width, not relative sizing — see Section 4).

### 2.3 Scale factor — log-compressed ratio to median

```ts
const COMPRESSION = 0.35 // tuning constant — see Section 2.6
const MIN_SCALE = 0.45   // floor — smallest items never shrink past this
const MAX_SCALE = 3.2    // ceiling — largest items never grow past this

function getScaleFactor(realArea: number, medianArea: number): number {
  const ratio = realArea / medianArea
  const raw = 1 + Math.log(ratio) * COMPRESSION
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, raw))
}
```

At `realArea === medianArea`, `ratio === 1`, `Math.log(1) === 0`, so `raw === 1` exactly — the median-sized artwork always renders at exactly `baseDisplaySize` with no special-casing required. This was a deliberate design goal, not a coincidence of the formula: confirm it stays true if `COMPRESSION` is retuned.

### 2.4 Display dimensions — area-correct, aspect-ratio-exact

```ts
const BASE_DISPLAY_SIZE = 220 // px — edge length of a square at scale factor 1; tune in browser

function getDisplayDimensions(artwork, scaleFactor: number) {
  const aspectRatio = artwork.aspectRatio // existing computed field, widthMm / heightMm
  const baseArea = BASE_DISPLAY_SIZE * BASE_DISPLAY_SIZE
  const displayArea = baseArea * scaleFactor
  const displayWidth = Math.sqrt(displayArea * aspectRatio)
  const displayHeight = Math.sqrt(displayArea / aspectRatio)
  return { displayWidth, displayHeight }
}
```

This guarantees the rendered box has exactly the artwork's true aspect ratio (a wide painting stays proportionally wide, a tall one stays proportionally tall — orientation is never distorted) while its overall area honestly reflects `scaleFactor`. A square `xl` Megacities work and a square `sm` drawing will both be perfect squares, just at very different edge lengths — this is what naturally produces the "2 columns and 2 rows" effect described in conversation, without ever encoding "2 columns and 2 rows" as a rule. It falls out of the math.

### 2.5 Fallback chain for works without `widthMm`/`heightMm`

Not every record is `measurementType: physical`. Apply in order, use the first that resolves:

1. `widthMm` / `heightMm` present → use directly (Section 2.1).
2. `measurementType` includes `digital`, `widthMm`/`heightMm` absent → derive a proxy area from `widthPx` × `heightPx` (already on every digital work per schema Section "Digital dimensions"), scaled by a single constant so digital-proxy areas land in a comparable numeric range to physical mm² areas before computing the median. This constant needs tuning once real archive data is loaded — start with `proxyArea = (widthPx * heightPx) * DIGITAL_AREA_SCALE_CONSTANT` and adjust `DIGITAL_AREA_SCALE_CONSTANT` until digital works visually interleave sensibly with physical works rather than clustering at one extreme.
3. Neither resolves (e.g. legacy stub record with only `sizeTier` set, no dimensions yet) → fall back to a fixed area-per-tier lookup (`sm`→small fixed area, `md`→medium, `lg`→large, `xl`→x-large, using the existing tier semantics purely as an emergency stand-in) so the item still renders at a sane size and doesn't break the layout, rather than being excluded from the median calculation or crashing. Flag this artwork's box with a subtle internal marker (not user-facing UI, just a `data-` attribute or console note in dev) — `usingFallbackSizing: true` — so it's easy to find which records still need real dimensions during the cataloguing push.

Do not let fallback-tier items poison the median calculation — exclude `usingFallbackSizing` items from the `getMedianArea` input set (Section 2.2), but still include them in the rendered output at their fallback size. The median should reflect the archive's real, known dimensions.

### 2.6 Tuning workflow

`COMPRESSION`, `MIN_SCALE`, `MAX_SCALE`, and `BASE_DISPLAY_SIZE` are starting values, not final. Per this project's existing pattern (`design-system.md`: "if something looks off, adjust the value and update this table, then have agents re-implement"), load the grid against real archive data and check:

- Does the median-area artwork look like a sensible "normal" size, not too small or dominant?
- Does the largest real Megacities work read as clearly, dramatically larger than a median piece — without overwhelming the viewport?
- Does the smallest real drawing stay legible — recognisable as an artwork, not a speck?
- Is the visual jump from smallest to median roughly as proportionally felt as the jump from median to largest? (If one side of the curve feels much more dramatic than the other, `COMPRESSION` is fine but `MIN_SCALE`/`MAX_SCALE` may be asymmetric in a way that doesn't match how the real data is distributed — check whether the archive's size distribution is itself skewed before assuming the constants are wrong.)

Adjust constants in `artworkRelativeSize.ts` only — never duplicate or override them per-view.

---

## 3. Layout mechanics — free-flow, not grid

### 3.1 No column structure

Remove the column-count/gap-by-breakpoint system for this view entirely (the table in `design-system.md`'s "Grid responsiveness" section no longer applies to the artwork grid — confirm with the artist whether that table should be struck from the doc or annotated as superseded-for-this-view once this ships, since other parts of the doc may still reference it for context).

### 3.2 Flow behaviour

Each artwork box has a fixed pixel `displayWidth`/`displayHeight` from Section 2.4 — that's the entirety of its layout footprint. Render as a simple wrapping flow: `display: flex; flex-wrap: wrap` (or equivalent), boxes placed left-to-right in sort order, each box sized exactly to its own computed dimensions (not flex-grow, not flex-basis percentage — literal fixed `width`/`height` per box), wrapping to the next line when the current line runs out of horizontal room. No JavaScript packing/placement algorithm needed — this is literally what flex-wrap already does once every child has an explicit size.

### 3.3 Gap

Use a single generous fixed gap value — larger than the current grid's largest breakpoint gap (13px), since the artist explicitly said spacing can be big and doesn't need to look tidy or grid-like. Starting value: `space-9` (1.5rem / 24px) at minimum; consider scaling up further once seen against real data with extreme size variance — large gaps next to a big size jump will read as intentional negative space, which is the desired effect, not a layout bug.

Do not implement gap that scales dynamically per neighbour-pair size difference — this was considered and explicitly set aside; a single fixed gap value is sufficient and far simpler to maintain.

### 3.4 Container width

Free-flow wrap needs an outer container width to wrap against. Use the same max-width convention as the rest of the site's content areas (check `design-system.md` for the existing max-width token used elsewhere — do not invent a new one for this view) with standard responsive side padding. The container does not need a fixed pixel width per breakpoint the way the old column system did — it just needs *a* width for the browser's flex-wrap to wrap against, and that can be simple percentage-based responsive width like most other page containers on the site.

---

## 4. Responsive behaviour

Because there's no column count to switch between breakpoints, responsive behaviour is much simpler than the old system:

- `displayWidth`/`displayHeight` per artwork are computed once from real data and do not change with viewport width — an artwork's *relative* size to its neighbours is constant regardless of screen size.
- What changes with viewport width is purely how many boxes fit per visual row before wrapping — handled automatically by `flex-wrap`, no manual breakpoint logic required.
- On narrow/mobile viewports, consider whether `BASE_DISPLAY_SIZE` itself should scale down via a single responsive multiplier (e.g. a CSS variable swapped at the `s:` breakpoint) so the median-sized artwork doesn't take up the full mobile viewport width on its own — test this in browser once built; it may turn out fine without intervention since the largest items will simply each occupy their own row on narrow screens, which is an acceptable look.
- This view's known mobile-availability constraint from the prior system (grid hidden below 550px, timeline-only at that width) is unchanged unless the artist decides otherwise — re-confirm intent before removing that restriction, since it was a deliberate decision for the old masonry's column-math reasons, and the reasoning may or may not still apply once there's no column math at all.

---

## 5. Caption treatment

Carries forward unchanged from the prior spec: fixed `space-3` (0.5rem / 8px) top padding between image bottom edge and caption text, consistent across every box regardless of its computed size. Caption font size does not scale with box size — a tiny artwork's caption should remain legible, not shrink proportionally with its image.

---

## 6. Sort order interaction

This view does not introduce or change sorting. It consumes whichever of the three existing sort modes (recent→oldest, oldest→recent, random — `right-nav-filter-fix-spec.md`) is currently active, and flows items in that order through the free-flow layout. Confirmed default: recent→oldest on first load, reversed for the oldest→recent toggle. Random sort flows items in whatever order the random shuffle produces — no special handling needed, the free-flow layout doesn't care what determined the order, it only consumes the resulting array.

Re-running `getMedianArea` (Section 2.2) on every sort change is unnecessary — sort order doesn't change which items are in the set, so the median is unaffected. Only recompute on a change to the *filtered set* (e.g. series filter applied/cleared), not on sort toggle.

---

## 7. Do NOT

- Do not bring back column-span, fixed column counts, or column-width-derived sizing for this view — fully superseded.
- Do not use `sizeTier` as the primary input to display size for any artwork that has real `widthMm`/`heightMm` — tier is now a fallback-only signal (Section 2.5), not the main driver.
- Do not use linear scaling from real area to display area — must be log-compressed per Section 2.3, or small works vanish and large works blow out the layout, which is exactly the failure mode the artist flagged.
- Do not compute the median across the whole archive when a filter is active — compute against the currently filtered/sorted set (Section 2.2).
- Do not let fallback-sized items (Section 2.5, item 3) skew the median calculation.
- Do not implement neighbour-pair-dependent dynamic gap sizing — single fixed gap value only (Section 3.3).
- Do not distort any artwork's true aspect ratio in service of fitting a target area — width and height must both be derived via `sqrt(displayArea * aspectRatio)` / `sqrt(displayArea / aspectRatio)` so true proportions are preserved exactly (Section 2.4).
- Do not duplicate the sizing constants (`COMPRESSION`, `MIN_SCALE`, `MAX_SCALE`, `BASE_DISPLAY_SIZE`) anywhere outside `artworkRelativeSize.ts`.
- Do not use `object-cover` — `object-contain` remains the rule for every artwork image on the site, this view included.
- Do not recompute the median on resize or on sort-mode change — only on filtered-set change (Section 6).

---

## 8. Verification checklist

- [ ] Load the grid with the full real archive (not fixture data) and confirm a true `xl`-tier Megacities work renders dramatically larger than a `sm`-tier drawing — the inversion seen in the column-span attempt must not reproduce here.
- [ ] Confirm two different `lg`-tier works of genuinely different real cm dimensions render at visibly different sizes (this is the key capability a 4-bucket tier system could never offer — confirm it's actually working, not just coincidentally close).
- [ ] Confirm the median-area artwork in the current filtered set renders at `BASE_DISPLAY_SIZE` exactly (spot-check by finding the actual median artwork and measuring its rendered box in devtools).
- [ ] Apply a series filter (e.g. Megacities only) and confirm the median recalculates against that subset — works within Megacities should show meaningful relative size variation among themselves, not all read as uniformly maximal.
- [ ] Confirm no artwork box falls below `MIN_SCALE` or above `MAX_SCALE` regardless of how extreme its real dimensions are.
- [ ] Confirm aspect ratio is visually exact for several wide, tall, and square works — no stretching or squashing in service of area targets.
- [ ] Confirm flow wraps correctly at several viewport widths with no fixed-column artifacts remaining.
- [ ] Confirm gap reads as intentionally generous, not as a layout bug, when a very large item sits next to a very small one.
- [ ] Confirm all three sort modes (recent→oldest, oldest→recent, random) flow correctly through the new layout with no leftover column-grid logic interfering.
- [ ] Identify any records currently relying on the Section 2.5 fallback chain (digital proxy or tier-fallback) and confirm they render sanely — use this as a worklist for which records most need real dimensions filled in next.
- [ ] Resize across breakpoints and confirm relative sizing between items stays constant — only wrap point changes, not relative scale.
