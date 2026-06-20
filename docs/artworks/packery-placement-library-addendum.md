# Physically-Scaled Grid — Placement Library Addendum

**Supersedes, within `grid-distribution-and-placement-addendum.md`:** Section 2 in full ("Revised placement — masonry/scatter, not flex-wrap"). The bespoke "shortest-lane-group" placement algorithm specified there is replaced by an existing, documented placement library rather than continuing as custom logic.

**Unaffected:** Section 1 of that addendum (rank/magnitude scale-factor formula) and everything in `jitter-and-range-correction-addendum.md` (MIN_SCALE correction, jitter mechanism). The sizing math is this project's genuinely novel contribution and stays exactly as specified. What changes is only how computed sizes get placed on the page.

**Why this change:** the placement problem this project kept re-deriving by hand — fit rectangles of arbitrary width and height into available space without a fixed column grid — is a well-known, well-documented problem with mature existing solutions. Continuing to hand-roll and re-tune a bespoke lane-spanning algorithm through several rounds of trial and error was solving an already-solved problem. Referencing the established approach directly is more reliable and easier for Cursor to implement correctly on the first pass than further bespoke iteration.

---

## 1. The reference implementation: Packery (Metafizzy)

[Packery](https://packery.metafizzy.co/) is the specific prior art to build against. It is the sibling library to Masonry.js (same author, David DeSandro), and it solves precisely the case this project needs: items of variable width *and* height, placed without forcing a fixed-column constraint.

Key facts about how it actually works, confirmed from its own documentation:

- Packery's placement is a genuine bin-packing algorithm, not simple shortest-column placement — it actively fills empty gaps left by irregular item sizes, which is a meaningfully better fit for this project's wide range of item sizes than the simpler "always pick the single shortest column" logic Masonry.js uses for uniform-width items.
- It supports items with both custom widths and custom heights specified per item (`width2`, `height2`-style modifier classes in its own documentation, multiples of a base unit) — directly analogous to what this project needs, except here the "multiple" isn't a discrete `1` or `2` but a continuous value derived from the rank/magnitude formula (Section 2 below).
- It explicitly supports `percentPosition: true`, positioning items in percentages rather than fixed pixels — this is the right mode for this project's responsive requirement, since it avoids recalculating absolute pixel positions on every resize.
- Through Isotope (the filtering/sorting framework built on the same author's layout engines), Packery layout mode has documented, built-in support for `sortBy: 'random'` alongside normal sort fields — this lines up directly with the project's existing three-mode sort requirement (recent→oldest, oldest→recent, random) without needing custom integration work.
- Packery is a paid/licensed library for commercial use (free for noncommercial and open-source-licensed projects under its terms) — confirm licensing fits the project's needs before adopting it wholesale; if licensing is a blocker, the open-source alternative is to implement the same underlying approach directly (see Section 3).

## 2. How this project's sizing math feeds into Packery

This is the only genuinely project-specific integration work — everything else is configuring an existing library, not building new placement logic.

1. Compute `displayWidth` / `displayHeight` per artwork exactly as already specified (`physically-scaled-free-flow-grid-spec.md` Section 2.4, using the rank/magnitude blend from `grid-distribution-and-placement-addendum.md` Section 1, with the corrected `MIN_SCALE: 0.55` from `jitter-and-range-correction-addendum.md` Section 1).
2. Rather than snapping each item's width to a discrete multiple of a fixed column unit (Packery's own documented convention — `width2`, `width3` etc.), set each item's CSS width/height directly to its computed `displayWidth`/`displayHeight` as a percentage of the container (consistent with `percentPosition: true`). Packery's column-multiple convention is a common usage pattern in its own docs, not a hard requirement of the underlying bin-packing algorithm — the library accepts arbitrary item sizes; the discrete-multiple convention exists because most Packery users have a small fixed set of size tiers (e.g. a CMS "featured/normal" flag), not because the algorithm itself requires it. This project's continuous size values are an unusual but supported input.
3. Re-run Packery's layout method whenever the filtered/sorted item set or each item's size changes — this corresponds to the same triggers already specified for median/rank recomputation (`grid-distribution-and-placement-addendum.md` Section 1.4's principle: recompute on filtered-set change, not on sort-mode toggle or resize alone, though resize does require Packery's own internal `resize` handling regardless of whether sizes changed, since container width changing affects wrap points).
4. Image loading must be sequenced correctly — Packery's own documentation flags that unloaded images can throw off layout and cause overlapping items, and recommends triggering layout again after each image loads (commonly via the companion `imagesLoaded` library). This matters more here than in a typical Packery gallery, since item dimensions are derived from real artwork data already known at render time (not measured from the loaded image), but layout should still re-run once images are confirmed loaded to avoid any visual jump if image aspect ratio in the browser ever drifts from stored `aspectRatio` data (e.g. a data entry error) — treat this as a defensive measure, not the primary sizing path.

## 3. If licensing rules out adopting Packery directly

If commercial licensing terms don't fit, the fallback is not a return to the bespoke lane-spanning logic from the superseded addendum — it's implementing the same underlying approach Packery itself is built on, which is also documented, named prior art: the **Maximal Rectangles algorithm**, from Jukka Jylänki's paper on practical 2D rectangle bin-packing. Several MIT-licensed or permissively-licensed implementations of this exact algorithm exist as standalone packages (search for "maxrects" or "rectangle bin packing" packages in the npm registry) independent of Packery's commercial license, since the algorithm itself is published academic prior art, not Packery's proprietary invention. Either path — Packery directly, or a standalone Maximal Rectangles implementation — is preferable to further bespoke placement logic; the choice between them is a licensing/budget decision, not a technical one, since both solve the same underlying problem the same documented way.

## 4. Jitter still applies on top

Bin-packing placement (Packery or a Maximal Rectangles implementation) is, if anything, *more* gap-efficient and orderly-looking than the abandoned lane-spanning approach — it's explicitly optimizing for minimal wasted space. This means the jitter mechanism from `jitter-and-range-correction-addendum.md` Section 2 remains necessary, not optional, on top of whichever placement engine is used. Apply the same deterministic, seeded-per-artwork-id offset as a post-placement visual transform, exactly as already specified — nothing about switching placement engines changes that reasoning or its implementation.

## 5. What this means for prior addenda

`grid-distribution-and-placement-addendum.md` Section 2 (the bespoke lane-spanning algorithm, lane count by viewport, lane-span derivation) is now dead — remove it from implementation rather than building it, since it was a stopgap manual reimplementation of part of what an existing library already does correctly. Section 1 of that same document (the rank/magnitude size formula) is unaffected and is still the authoritative sizing math. `jitter-and-range-correction-addendum.md` is unaffected in full.

---

## 6. Do NOT (additions)

- Do not build or continue tuning the bespoke lane-spanning placement algorithm from the now-superseded section — adopt Packery or a Maximal Rectangles implementation instead.
- Do not snap computed `displayWidth`/`displayHeight` values to Packery's conventional discrete column multiples (`width2`, `width3`) — feed in the actual continuous computed percentage width/height per item; the discrete-multiple pattern is a common convention in Packery's own docs, not a requirement of the algorithm.
- Do not skip checking Packery's commercial licensing terms against this project's needs before committing to it as a dependency — confirm this explicitly before implementation begins, not after.
- Do not drop the jitter mechanism on the assumption that switching to a "real" bin-packing library makes it unnecessary — bin-packing's gap-filling efficiency if anything increases the need for a deliberate randomization pass on top.
- Do not re-measure or re-derive image aspect ratio from loaded `<img>` elements as the primary sizing path — stored `widthMm`/`heightMm`/`aspectRatio` data remains authoritative; `imagesLoaded`-triggered re-layout (Section 2, point 4) is a defensive safeguard against load-order visual glitches, not a data source.

## 7. Verification checklist (additions)

- [ ] Confirm Packery (or chosen Maximal Rectangles implementation) is correctly receiving each item's continuous computed width/height rather than a snapped discrete multiple.
- [ ] Confirm `percentPosition: true` (or equivalent in a non-Packery implementation) is set, and resizing the viewport doesn't cause a visible "snap" or jump in already-placed items.
- [ ] Confirm gap-filling behavior is visible — check whether placement order in the DOM ever differs from final visual position (a sign gap-filling is actually engaging, not just falling back to simple top-to-bottom placement).
- [ ] Confirm layout re-runs correctly after images load (`imagesLoaded` or equivalent) with no visible overlap or mis-sized items during the loading window.
- [ ] Re-run all three sort modes (recent→oldest, oldest→recent, random) through the new placement engine and confirm no leftover dependency on the removed lane-spanning logic remains anywhere in the codebase.
- [ ] Confirm jitter is still applied on top of the new placement engine's output and still reads as scattered, not as a layout glitch (carry forward checklist items from `jitter-and-range-correction-addendum.md`).
- [ ] If using Packery commercially, confirm licensing terms have been explicitly reviewed and accepted before this ships to production — flag to the artist directly if this hasn't happened yet.
