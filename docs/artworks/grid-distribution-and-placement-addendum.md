# Physically-Scaled Grid — Distribution & Placement Addendum

**Supersedes, within `physically-scaled-free-flow-grid-spec.md`:** Section 2.3 (scale factor formula), Section 3.2 (flow behaviour). Sections 1, 2.1, 2.2, 2.4 (aspect-ratio-exact dimension derivation), 2.5 (fallback chain), 2.6 (tuning workflow), 5, 6, and 7 remain in force except where explicitly revised below.

**Trigger:** built version of the free-flow spec showed two distinct problems once tested against the real archive. First, flex-wrap inherently aligns items into visual rows once item heights are similar within a horizontal run — it cannot produce a scattered feel no matter how the gap or sizing constants are tuned, because row-alignment is a structural property of wrap layout, not a tuning artifact. Second, and more important: the archive's real size distribution is heavily clustered (many similarly-scaled cityscape paintings, few true extremes at either end), which means a log-of-ratio-to-median curve has almost nothing to amplify for the bulk of the archive — `log(ratio)` near `ratio = 1` is near zero regardless of the compression constant, so mid-range works necessarily look similar to each other under that formula no matter how it's tuned. This is a distribution problem, not a curve-shape problem, and needed a different fix than re-tuning constants.

Confirmed direction: more dramatic spread at both true extremes, *and* more visible variety among mid-range works, achieved via real masonry/scatter placement rather than row-wrap.

---

## 1. Revised scale factor — rank-based, not pure ratio-to-median

### 1.1 Why ratio-to-median alone fails on clustered data

The original formula (`physically-scaled-free-flow-grid-spec.md` Section 2.3) scales each artwork by how far its real area sits from the dataset median, log-compressed. This works well when areas are spread out, but when most works sit close together in actual size — confirmed true of this archive — most `ratio` values land close to `1`, and `Math.log(ratio)` for `ratio` near `1` is close to `0` by definition. No value of `COMPRESSION` fixes this: it scales the (already tiny) log output, it can't manufacture variance that isn't there in the linear ratios to begin with.

### 1.2 The fix — blend rank position with magnitude

Replace pure ratio-to-median with a blend of two signals:

- **Rank** — where this artwork sits in the sorted order of all real areas in the current set, as a percentile (0 to 1). This is what stretches the clustered middle: even if two cityscapes differ in real area by only 4%, if one is at the 40th percentile and the other at the 60th percentile, rank-based scaling treats that ordering as meaningful and gives them visibly different sizes. Rank-based scaling is, by construction, immune to clustering — it only cares about order, not raw magnitude gaps.
- **Magnitude** — the original ratio-to-median signal, kept specifically to preserve true extremity at the tails. Rank alone has a failure mode of its own: it would make the *smallest* item in a tightly-clustered set look just as dramatically small as if it were a true outlier, even if it's barely smaller than its neighbours. Magnitude keeps the tails honest — a true Megacities outlier should look more extreme than a cityscape that merely ranks last among similar-sized peers.

```ts
function getScaleFactor(artwork, allRealAreas: number[], realArea: number, medianArea: number): number {
  const sorted = [...allRealAreas].sort((a, b) => a - b)
  const rankIndex = sorted.findIndex(a => a >= realArea)
  const percentile = rankIndex / (sorted.length - 1) // 0 to 1

  // Rank component: stretches clustered middle, maps percentile to a wide curve centered at 0.5
  const RANK_SPREAD = 1.6 // tuning constant — controls how much rank alone can move size
  const rankComponent = (percentile - 0.5) * 2 * RANK_SPREAD // roughly -RANK_SPREAD to +RANK_SPREAD

  // Magnitude component: original log-ratio signal, kept for true tail extremity
  const MAGNITUDE_WEIGHT = 0.7 // tuning constant — how much raw magnitude still matters
  const ratio = realArea / medianArea
  const magnitudeComponent = Math.log(ratio) * MAGNITUDE_WEIGHT

  const raw = 1 + rankComponent + magnitudeComponent

  const MIN_SCALE = 0.3   // lowered from 0.45 — confirmed direction: smaller small works acceptable
  const MAX_SCALE = 5.0   // raised from 3.2 — confirmed direction: bigger xl works acceptable
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, raw))
}
```

Note the function signature changed — it now needs the full sorted array of real areas in the current set, not just the single median value, since rank requires knowing this artwork's position among all of them. Compute `allRealAreas` once per filtered/sorted set (same place `getMedianArea` was already being computed in the prior spec — compute both from the same single pass over the data, do not iterate the dataset twice).

### 1.3 Why this produces both effects the artist asked for at once

- **Mid-range variety**: two cityscapes close in real size but different in rank will now visibly differ in display size, because `rankComponent` only cares about relative order, not the (small) absolute gap between them.
- **Tail drama**: a true outlier (rare large Megacities work, rare small drawing) gets both the maximum rank pull *and* a large magnitude contribution stacked on top, since it's simultaneously at an extreme rank and far from the median in raw terms — these compound rather than competing the way the prior formula's single signal could not.

### 1.4 Tuning workflow for the new constants

`RANK_SPREAD` and `MAGNITUDE_WEIGHT` trade off against each other and need to be tuned together, in browser, against the real archive — not in isolation:

- If mid-range works still look too similar after this change, raise `RANK_SPREAD` first (this is the lever that directly addresses that complaint).
- If true extremes (the largest Megacities, the smallest drawings) don't feel dramatic enough even with `MIN_SCALE`/`MAX_SCALE` widened, raise `MAGNITUDE_WEIGHT`.
- Raising both simultaneously without checking in browser risks `raw` exceeding the clamps for most of the archive, which would flatten everything to `MIN_SCALE`/`MAX_SCALE` and ironically *reduce* visible variety (everything pinned at the ceiling or floor looks as uniform as everything pinned at the middle did before). Check the actual distribution of `raw` values across the real archive before finalizing — if a large fraction are hitting the clamps, the constants are too aggressive, not too conservative.

This replaces Section 2.6 of the original spec's tuning guidance for these specific constants (`BASE_DISPLAY_SIZE` tuning guidance from the original spec is unaffected and still applies).

---

## 2. Revised placement — masonry/scatter, not flex-wrap

### 2.1 Why flex-wrap cannot be fixed for this goal

Flex-wrap (or any left-to-right line-wrapping flow) fundamentally aligns all items in a horizontal run to a shared top edge before starting a new line. Even with high size variance, items that happen to land in the same horizontal run will visually share a baseline, which reads as "rows" regardless of how different their individual sizes are. This is structural, not a tuning artifact — no gap value or size variance fixes it. Confirmed direction: move to real masonry-style placement instead.

### 2.2 Placement algorithm — shortest-lane packing with computed (not fixed) item sizes

This is mechanically similar to a Pinterest-style masonry, but with one important difference from a typical implementation: lane width is not fixed/uniform. Each item already has its own true `displayWidth`/`displayHeight` computed per Section 1 above and the original spec's Section 2.4 (aspect-ratio-exact derivation) — placement just needs to find where each item goes, not resize it to fit a column.

```
1. Divide the container into N vertical lanes of EQUAL width (N depends on viewport width — 
   see 2.3). This lane width is a PLACEMENT aid only — it does not constrain item size. 
   An item wider than one lane is allowed to overlap into neighbouring lane(s); see 2.4.
2. Track current height-so-far for each lane.
3. For each item in sort order:
   a. Determine how many lanes this item's displayWidth spans (see 2.4).
   b. Find the contiguous group of that many lanes whose MAXIMUM current height 
      (the tallest among that group, since the item must start below all of them 
      to avoid overlap) is lowest, across all valid contiguous groups.
   c. Place the item at that height, spanning that lane group's horizontal position.
   d. Update every lane in that group to (placement height + item's displayHeight + gap).
4. Continue until all items placed.
```

This produces genuine vertical staggering — items of similar size landing in different lanes will end up at different heights depending on what's already above them in that lane, breaking the row-alignment effect entirely. Large items naturally create more vertical offset in their neighbouring lanes, which is the scattered, non-grid feeling described in conversation.

### 2.3 Lane count by viewport width

Lane count is a placement convenience, not a visual column grid the user is meant to perceive — keep lanes narrow enough that most items span multiple lanes, so the lane structure itself stays invisible in the final result. Starting point: lane width roughly equal to `BASE_DISPLAY_SIZE / 3` (so a median-sized item spans about 3 lanes, giving the placement algorithm meaningful sub-item positioning granularity). Recalculate lane count on resize: `laneCount = Math.floor(containerWidth / laneWidth)`, minimum 3 lanes even on narrow viewports.

### 2.4 Items spanning multiple lanes

An item's lane span is `Math.ceil(displayWidth / laneWidth)`, clamped to `laneCount` (an item can never span more lanes than exist). This is a continuous derived value, not a discrete "spans 2" flag like the abandoned column-span approach — the difference matters: here, lane span is purely a placement implementation detail operating at fine granularity (lanes are narrow), not a visible structural unit the way 2-of-4 grid columns were. The user should never be able to identify "lanes" by looking at the page; they're only a coordinate system the algorithm uses internally.

### 2.5 Gap

Apply gap both horizontally (between lanes, already factored into lane width math) and vertically (added to each lane's height-so-far after every placement, per step 3d above). Keep the original spec's direction (Section 3.3: generous, larger than the old masonry's largest gap) — given the new placement algorithm relies on visible negative space to read as scattered rather than packed, lean toward the larger end of what was previously suggested. Increase from the prior `space-9` (1.5rem) starting point to roughly `space-11`–`space-12` (2–3rem) as a new starting point, then tune in browser.

### 2.6 What this replaces

Original spec Section 3.2 ("Flow behaviour" — flex-wrap based) is fully replaced by the algorithm above. Section 3.1 ("No column structure") is still directionally correct — there is still no *visible* column/grid structure — but should be read alongside this addendum's clarification that lanes exist internally as a placement aid; "no column structure" refers to what the user perceives, not to the absence of any coordinate system in the implementation.

### 2.7 Performance note

Shortest-lane-group placement is `O(items × laneCount)` in the simplest implementation (checking every valid lane-group position per item) — fine for archive sizes in the hundreds. If the archive grows substantially and this becomes a measurable render cost, this is a candidate for memoization (recompute placement only when the filtered/sorted item set or viewport lane count changes, not on every render) — flag as a future optimization, not required for initial implementation.

---

## 3. Do NOT (additions to original spec's Section 7)

- Do not revert to flex-wrap or any line-wrapping flow layout — confirmed structurally incapable of the desired scattered effect, not a tuning question.
- Do not tune `COMPRESSION` (the original single-signal constant) further — it has been replaced by `RANK_SPREAD` and `MAGNITUDE_WEIGHT` per Section 1.2. Remove the old constant from `artworkRelativeSize.ts` rather than leaving it dead in the file.
- Do not let visible lane boundaries leak into the design — if at any point lanes become perceptible as a grid to the end user, lane width is too coarse; narrow it (Section 2.3).
- Do not raise `RANK_SPREAD` and `MAGNITUDE_WEIGHT` together without checking the resulting `raw` value distribution against the clamps first (Section 1.4) — risk of flattening variety rather than increasing it.
- Do not apply rank-based scaling using the archive-wide item order when a filter is active — rank, like the median before it, must be computed against the currently filtered/sorted set (carries forward original spec's Section 2.2 principle to the new formula).

---

## 4. Verification checklist (additions to original spec's Section 8)

- [ ] Confirm visual row-banding is gone — pick any horizontal band of the page and confirm items within it do not share a visible top or bottom edge the way the flex-wrap version did.
- [ ] Confirm several real mid-range cityscape works, close in actual size, now render at visibly different display sizes from each other (the core complaint this addendum addresses).
- [ ] Confirm the largest real Megacities work and smallest real drawing both feel more dramatically sized than in the previous version — compare side by side against the prior screenshot if helpful.
- [ ] Check the distribution of computed `raw` scale-factor values across the real archive before finalizing constants — confirm it isn't disproportionately clustered at `MIN_SCALE` or `MAX_SCALE` (Section 1.4).
- [ ] Confirm lane structure is not visually perceptible at any tested viewport width — items should look scattered, not aligned to invisible-but-detectable columns.
- [ ] Confirm gap reads as generously spaced, consistent with the artist's direction that spacing can be large.
- [ ] Re-run original spec's filter-recalculation checks (median/rank recompute on filtered-set change, not on sort-mode change or resize) against the new rank-based formula — same principle, new implementation, must still hold.
- [ ] Resize across several viewport widths and confirm lane count recalculates and placement reflows sensibly with no overlapping items or broken height tracking.
