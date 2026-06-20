# Artwork Grid — Return to Column Grid with Tier-Based Span

**Status: this is the active direction.** It replaces the entire free-flow/scatter line of work attempted across `physically-scaled-free-flow-grid-spec.md`, `grid-distribution-and-placement-addendum.md`, `jitter-and-range-correction-addendum.md`, and `packery-placement-library-addendum.md`. None of those four documents should be implemented further — see Section 0.

**Carries forward unchanged:** the original fixed-column masonry foundation from `design-system.md` (column count and gap by breakpoint) and `artist-archive-schema-final.md` Section 1.3 (`sizeTier`, `orientation`, `aspectRatio` fields). This spec is much closer to the project's original grid than to anything in the four superseded documents — it reintroduces column-span, but as a small, fixed, easily-verified rule set rather than continuous size-derived placement.

---

## 0. Why the free-flow direction is abandoned

Four consecutive rounds of free-flow/scatter placement (full continuous area-based sizing, rank-based distribution correction, masonry-with-jitter, Packery bin-packing) each fixed the specific complaint raised against the version before it, but the cumulative direction kept moving further from anything predictable or easy to tune. The most recent build showed edge-to-edge crowding with no usable breathing room, size variance that read as chaotic rather than meaningful, and a broken non-image media element with no size constraint applied at all — a sign the continuous sizing math was not robustly handling every content type in the archive, only the common case.

Diagnosis: free-form placement with size as the sole organizing signal is a hard design problem to get right across a few hundred heterogeneous items, and each fix was trading one failure mode for another rather than converging. A constrained grid with a small, fixed set of span rules is a fundamentally easier problem — fewer states, each one checkable by eye, predictable to reason about, and easy to adjust incrementally. This is the right kind of complexity for this project going forward.

**Do not revisit continuous area-based sizing, rank/magnitude blending, masonry bin-packing, or per-item jitter as the primary layout mechanism.** If finer-grained size expression is wanted again later, treat that as a deliberate, separate future direction to scope fresh — not by resuming any of the four superseded documents.

---

## 1. Foundation — back to the original fixed-column grid

Reinstate exactly the system documented in `design-system.md`'s "Grid responsiveness" section:

| Breakpoint | Columns | Gap |
|---|---|---|
| default | 1 | 5px |
| `s:` 550px | 2 | 7px |
| `m:` 768px | 3 | 9px |
| `l:` 979px | 4 | 11px |
| `xl:` 1200px | 5 | 13px |

Max grid width: 1500px. Grid hidden below 550px (timeline-only at that width — unchanged). This table is the one source of truth for column count and gap; do not modify it as part of this spec.

---

## 2. Span rules — driven directly by `sizeTier`, fixed and small

Confirmed direction: span is read directly from the existing `sizeTier` field (`xs | sm | md | lg | xl`) combined with `orientation`, mapped to a small fixed set of span shapes — not derived from continuous real-dimension math the way the superseded approach attempted.

| `sizeTier` | `orientation` | Column span | Row span |
|---|---|---|---|
| `xl` | any | 2 | 2 |
| `lg` | `landscape` | 2 | 1 |
| `lg` | `portrait` or `square` | 1 | 1 |
| `md`, `sm`, `xs` | any | 1 | 1 |

This is the entire ruleset. Three span shapes total: `2×2` (xl, any orientation), `2×1` (lg landscape only), `1×1` (everything else). Do not add intermediate shapes (e.g. a `1×2` tall span, or an `md`-tier span) without the artist explicitly requesting it after seeing this ruleset in browser — the small fixed set is a deliberate choice, not a placeholder for something more granular.

This ruleset only takes effect at `m:` (3 columns) and above — same reasoning as previously established: a 2-column span in a 2-column grid is just full-width, and span is meaningless at 1 column. Below `m:`, every item renders at standard 1×1 regardless of tier.

### 2.1 Why tier directly, not real cm dimensions

The free-flow attempts used real `widthMm`/`heightMm` specifically to capture fine-grained differences between works of the same tier. That fine-grained differentiation is exactly what produced unpredictable, hard-to-tune results. Tier is a deliberate editorial bucket the artist already assigns — using it directly means the span behavior is fully predictable from data already visible in the CMS, with no derived math to debug or retune. Real dimensions remain available in the schema for other purposes (single artwork page display, JSON-LD, etc.) but are not part of this grid's span logic.

---

## 3. Sizing within a span — fix the height-derivation problem properly this time

This carries forward the never-fully-superseded core problem from the very first audit: a cell's image must not be squeezed into a pre-set card height, height must be derived from the image's real aspect ratio inside whatever width the span produces.

1. Compute the cell's pixel width from its column span: for a `1×1` item, `cellWidth = columnWidth` (standard single-column formula, breakpoint table above). For a `2×1` or `2×2` item, `cellWidth = 2 * columnWidth + gap` (two column widths plus the one gap between them — the gap must be included, this was flagged before and is worth restating since it's an easy arithmetic slip).
2. For row-spanning items (`2×2`, i.e. `xl` tier only), the available height is similarly `cellHeight = 2 * rowUnitHeight + gap`, where `rowUnitHeight` is whatever the grid's implicit row height convention is in the underlying implementation (masonry packing typically doesn't have a fixed row height the way CSS Grid does — confirm with current `ArtworksGrid` implementation whether row height is itself derived from content or needs to become a defined unit for this 2-row-span case to work; this is the one piece of this spec that depends on implementation detail not fully settled in prior docs, flag to Cursor explicitly to check before building).
3. Within that `cellWidth` × `cellHeight` envelope, the artwork's image is sized using its real aspect ratio with `object-fit: contain` — same principle as every prior version of this spec, restated because it's the actual root cause from the original audit and must not regress: do not stretch, do not crop, do not center inside a fixed-height box that leaves dead space. The envelope is the maximum available space; the image fills it according to its own proportions, touching either the width or height boundary of the envelope (whichever the aspect ratio constrains first) and falling short of the other — that shortfall is normal and expected, not a bug, exactly as it would be for a single-column item.
4. Caption sits below the image within the cell, fixed `space-3` top padding from image bottom edge, unchanged from every prior version of this spec.

---

## 4. More room to work with — container and cell padding

Confirmed direction: start with more generous padding around the grid container and within cells, specifically to create room to evaluate spacing adjustments against, rather than trying to nail final spacing values immediately.

- **Container padding**: increase the grid container's side padding beyond whatever the current implementation uses — starting point, add `space-9` (1.5rem) to whatever side padding currently exists at each breakpoint, as a baseline to adjust from once seen against real content. This is explicitly a starting point for iteration, not a final value.
- **Cell internal padding**: if cells currently have zero internal padding (image touches cell edge), consider introducing a small fixed internal padding (`space-3` to `space-5`) between the cell boundary and the image itself, distinct from the inter-cell gap — this gives every artwork a small amount of breathing room even before inter-cell gap is accounted for. Confirm with the artist whether this is wanted after seeing it in browser; it's a reasonable thing to try given the stated goal of "more room to play with," but wasn't explicitly requested, so treat it as a suggestion to evaluate rather than a committed requirement.
- **Inter-cell gap**: keep the original breakpoint-based gap table (Section 1) as the baseline rather than the much larger fixed gap values explored in the free-flow documents — those larger gaps were calibrated for a system with extreme, unpredictable size variance; this system's variance is small and fixed (three span shapes), so the original gap table's modest, breakpoint-scaled values are the right starting point again. If, once built, the artist wants more gap than the original table provides, treat that as a separate, explicit adjustment to the table — not a reason to import the free-flow documents' much larger gap values wholesale.

---

## 5. Do NOT

- Do not implement or reference any part of `physically-scaled-free-flow-grid-spec.md`, `grid-distribution-and-placement-addendum.md`, `jitter-and-range-correction-addendum.md`, or `packery-placement-library-addendum.md` going forward — fully superseded by this document.
- Do not derive span from continuous real-dimension math — span comes directly from the `sizeTier` × `orientation` table in Section 2, nothing else.
- Do not add span shapes beyond the three defined (`2×2`, `2×1`, `1×1`) without explicit artist sign-off after seeing the fixed ruleset in browser first.
- Do not enable spanning below the `m:` breakpoint.
- Do not double column width for a spanning item without including the inter-column gap in the calculation (Section 3, point 1) — flagged previously, restating because it's a likely implementation slip.
- Do not let any image stretch, crop, or sit inside a pre-set fixed-height box with unaccounted dead space — `object-fit: contain` inside a height/width envelope that is itself derived from span × column/row unit, never the reverse.
- Do not import the free-flow documents' large fixed gap values (`space-9` and above for inter-cell gap) — return to the original breakpoint-scaled gap table (5/7/9/11/13px) as the baseline.
- Do not leave any leftover code, utilities, or constants from the superseded free-flow attempts in the codebase (`artworkRelativeSize.ts` and its rank/magnitude/jitter logic, any Packery or bin-packing integration, any lane-spanning placement logic) — remove rather than leave dormant, to avoid confusion in future work on this component.

---

## 6. Verification checklist

- [ ] Confirm column count and gap match the restored breakpoint table exactly at all five breakpoints.
- [ ] Confirm every `xl`-tier artwork renders at `2×2` span regardless of its own orientation.
- [ ] Confirm every `lg`-tier landscape artwork renders at `2×1` span, and that `lg`-tier portrait/square artworks render at standard `1×1`.
- [ ] Confirm no spanning occurs below the `m:` breakpoint (3 columns) — all items render `1×1` at `default` and `s:`.
- [ ] Confirm spanning items' width calculation includes the inter-column gap, not just a doubled column width — measure in devtools against two adjacent non-spanning columns to verify exact alignment.
- [ ] Confirm no image is stretched, cropped, or shows unaccounted dead space within its cell at any span size — spot check at least one example of each of the three span shapes against real archive artworks.
- [ ] Confirm the row-height mechanism for `2×2` items works correctly — this is the one open implementation question flagged in Section 3, point 2; resolve and confirm before considering this checklist complete.
- [ ] Confirm increased container/cell padding is visibly present and reads as intentional breathing room, not as a layout bug — gather the artist's reaction to the new padding starting point before locking in final values.
- [ ] Confirm no remaining code, dependencies, or constants from the four superseded free-flow documents remain in the codebase.
- [ ] Resize across all five breakpoints and confirm reflow is clean with no stale span values or overlapping cells.
