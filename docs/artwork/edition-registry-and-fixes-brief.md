# Cursor Brief — Edition Registry + Right Column Fixes
## bernardbolter.com · Artwork Page · Focused Implementation Brief #2
*June 2026 · Bernard Bolter × Claude*

---

## Read first

- `artwork-page-layer-reorganization-addendum.md` — full spec, especially the "Visual structure" section and "Edition Tier Registry" section
- `right-column-restructure-brief.md` — the previous brief this one follows on from
- Test data: `__fixture-gates-iii` and `__fixture-basel-dcs` (both already seeded with `ownershipRegistry`, `ownershipHistory`, and `loanHistory` data — use these to verify each fix below)

This brief covers four items, in priority order. Test each one against both fixture records as you go — they're seeded with deliberately different states so you can confirm both branches of every conditional.

---

## 1. Build `EditionTierRegistry.tsx`

New component. Renders inside `Layer2StatusAndProvenance`, below the Documentation & media block (or wherever the addendum's section order places it — confirm against `artwork-page-layer-reorganization-addendum.md`'s "Section order within this layer").

**Data source:** `artwork.ownershipRegistry` — an array of tier objects, each with `tierLabel`, `tierOrder`, `editionSize`, `apCount`, `copies[]`. Render nothing if `ownershipRegistry` is empty or absent.

**Visual idiom — bordered card, chevron disclosure.** This is the only component on the page permitted a card border and an icon — everything else on the page stays in the flatter idioms from Brief #1.

```css
/* Outer card wrapping the whole registry */
background: var(--color-background-primary);
border: 0.5px solid var(--color-border-tertiary);
border-radius: var(--border-radius-lg);
overflow: hidden;
```

**Each tier renders as a row inside the card:**

```css
/* Tier header — clickable button */
width: 100%;
display: flex;
align-items: center;
justify-content: space-between;
background: transparent;
border: none;
border-bottom: 0.5px solid var(--color-border-tertiary); /* omit on last tier */
padding: 0.85rem 1.05rem;
cursor: pointer;
text-align: left;
font-size: 14px; /* tier label */
```

**Claimed-count pill**, sits in the header next to the chevron:

```css
font-size: 12px;
background: var(--color-background-secondary);
color: var(--color-text-secondary);
padding: 3px 9px;
border-radius: 999px;
```

**Chevron icon** — `ti-chevron-down` when that tier's accordion is open, `ti-chevron-right` when closed. 14-16px, `var(--color-text-tertiary)`.

**Pill copy logic:**
- Zero copies with `claimStatus: 'claimed-confirmed'` → `"Edition of [editionSize] — available"` (no price, no other commercial language)
- Some claimed → `"[claimedCount] of [editionSize] claimed"`
- All numbered claimed → `"[editionSize] of [editionSize] claimed — edition complete"`

`editionSize` excludes AP copies — count only non-AP copies toward both the numerator and denominator.

**When a tier is opened:**
- Render a row for every copy where `claimStatus === 'claimed-confirmed'` AND `isArtistProof === false` (or false-y): `copyNumber` on the left, `owner` on the right. Simple text row, no background, hairline divider between rows.
- **Never render rows for unclaimed copies.** If a tier has 0 claimed, opening it shows only the claim CTA below (see next point) — no placeholder rows, no "—" rows, nothing implying an empty list to scroll through.
- Below the claimed rows (or in place of them if none), render a claim CTA: `"Do you own one of these? "` followed by a link reading `"Claim yours →"`, linking to `/contact?claim=[artwork.slug]&tier=[tierLabel]`.

**AP visibility rule** — this is the part most likely to be implemented incorrectly, so read carefully:

- Find all copies in the tier where `isArtistProof === true`.
- An AP copy renders as a row **only if every non-AP copy in that same tier has `claimStatus === 'claimed-confirmed'`**. If even one numbered copy is still unclaimed, the AP row(s) do not render at all — not as "unclaimed," not as a placeholder, completely absent from the DOM.
- AP rows are also excluded from the claimed-count pill math entirely, in both the suppressed and visible states.
- When an AP row *is* visible: default display is `"AP — held by the artist"` (no owner name) for `claimStatus: 'artist-held'`. If `claimStatus === 'sold-secondary'`, display `"AP — sold by the artist"` instead, and only show an owner name if `collectorVisible === true` on that specific copy.
- **Visual treatment for the AP row:** separate it from the numbered-copy rows above it with a dashed divider instead of the solid hairline used between numbered copies:
  ```css
  border-top: 0.5px dashed var(--color-border-tertiary);
  /* applied only to the AP row itself, not between numbered copies */
  ```

**Untracked editions note** — render `artwork.untrackedEditionsNote` as a single quiet prose line below the registry card (outside the card, not inside it), only if the field is non-empty:

```css
font-size: 12px;
color: var(--color-text-tertiary);
margin-top: 0.6rem;
line-height: 1.5;
```

### Verify against fixtures

- `__fixture-gates-iii`, Tier "Large giclée": 0 claimed → header reads "Edition of 5 — available", opening shows only the claim CTA, no rows
- `__fixture-gates-iii`, Tier "Small giclée": 2 of 10 claimed → header reads "2 of 10 claimed", opening shows exactly 2 rows, both APs absent (10 numbered not fully claimed)
- `__fixture-basel-dcs`, Tier "Original edition": 1 of 3 claimed, AP present in data but should not render (2 of 3 numbered still unclaimed)
- `untrackedEditionsNote` prose line appears below the registry on `__fixture-basel-dcs` only (Gates III has this field set to null)

### Do NOT

- Do not render unclaimed copies as visible rows under any condition, at any tier
- Do not render an AP row until every non-AP copy in its tier is `claimed-confirmed`
- Do not show price, "buy," or shipping copy anywhere in this component
- Do not use the flat-panel or left-border idioms here — this component is the one exception that gets a full card border

---

## 2. Fix: unclaimed appeal showing when an owner is already confirmed

Currently showing on `__fixture-basel-dcs` even though that record has a `claimed-confirmed`, `collectorVisible: true` entry in `ownershipHistory`. It should not appear there.

**Correct condition:** the unclaimed appeal renders only when:
- `currentLocation.category !== 'artists-studio'`, AND
- `ownershipHistory` is empty, OR every entry in `ownershipHistory` has `claimStatus !== 'claimed-confirmed'`

If even one `ownershipHistory` entry has `claimStatus === 'claimed-confirmed'`, the appeal must not render — the record already has a confirmed owner, there's no gap to invite someone to fill.

### Verify against fixtures

- `__fixture-basel-dcs`: has one `claimed-confirmed` entry → appeal should be **absent**
- `__fixture-gates-iii`: `currentLocation.category === 'artists-studio'` → appeal should be **absent** (different reason — studio rule, not a confirmed-owner rule)

Both fixtures should currently show no appeal, for two different reasons. If you need a fixture that *does* show the appeal to confirm the positive case, temporarily set `ownershipHistory: []` and `currentLocation.category: 'private-collection'` on a test record — an empty array with a non-studio location is the one combination that should trigger it.

---

## 3. Fix: ownership timeline row and loan history not rendering

Both `__fixture-basel-dcs` fields are populated but not appearing on the page.

**Ownership timeline:** for each entry in `ownershipHistory` where `collectorVisible === true`, render a row showing `displayName`, `city` (if present), and `dateAcquired` (formatted as a year or month-year, your existing date formatting convention). This should render as a sub-line under the main Status headline, not replace it — the headline already shows "Private collection" or similar from `currentLocation`; the timeline row adds the acquisition detail.

Check: is the component currently only rendering `currentLocation`-derived text and never actually mapping over `ownershipHistory` at all? That would explain why the headline word is right but no timeline detail shows.

**Loan history:** render a row per entry in `loanHistory` — `institution`, then `dateOut`–`dateReturned` as a range, in the existing secondary-text style. Section label "Loan history" only when the array is non-empty.

### Verify against fixtures

- `__fixture-basel-dcs`: ownership timeline should show one row, "Private collection, Zurich · Zurich · 2012" (or your existing date format)
- `__fixture-basel-dcs`: loan history should show one row, "Kunsthalle Basel · 2015-04-01 – 2015-07-15" (or your existing date format)
- `__fixture-gates-iii`: both sections should be **absent** — `ownershipHistory` is empty and `loanHistory` is empty on that record

---

## 4. Add `altTitle` line to `Layer0Image.tsx`

Per the original addendum spec: render `artwork.altTitle` as a quiet line directly below the `h1` title, above the year/medium lines. Render only when `altTitle` is non-empty.

```css
font-size: 13px; /* smaller than h2 year line */
color: var(--color-text-secondary);
font-weight: 400;
```

Format: `"also known as [altTitle]"`

### Verify against fixtures

- `__fixture-gates-iii`: `altTitle: "Tore der Wahrnehmung III"` → should show "also known as Tore der Wahrnehmung III" below the title
- `__fixture-basel-dcs`: `altTitle: "Basel, Schweiz"` → should show "also known as Basel, Schweiz" below the title

---

## Verification checklist

- [ ] `EditionTierRegistry` renders as a bordered card with chevron disclosure, distinct from the flatter idioms elsewhere on the page
- [ ] Claimed-count pill shows correct copy for zero/partial/complete states
- [ ] Opening a tier shows only `claimed-confirmed` + non-AP rows, never unclaimed rows
- [ ] AP rows are fully suppressed until all non-AP copies in their tier are claimed, in both data and render
- [ ] Visible AP rows are set apart by a dashed divider, and read "held by the artist" or "sold by the artist" depending on `claimStatus`
- [ ] `untrackedEditionsNote` renders as prose below the registry card, only when populated
- [ ] Unclaimed appeal is suppressed on `__fixture-basel-dcs` (confirmed owner present)
- [ ] Unclaimed appeal is suppressed on `__fixture-gates-iii` (artist's studio)
- [ ] Ownership timeline row renders on `__fixture-basel-dcs`, absent on `__fixture-gates-iii`
- [ ] Loan history renders on `__fixture-basel-dcs`, absent on `__fixture-gates-iii`
- [ ] `altTitle` line renders on both fixtures, correctly formatted and positioned
- [ ] No price, "buy," or shipping language appears anywhere introduced by this brief

---

*Edition Registry + Right Column Fixes · Brief #2 · June 2026*
*Read alongside: artwork-page-layer-reorganization-addendum.md, right-column-restructure-brief.md*
*Next pass: Layer3 internal reordering, CLIP accordion, 55/45 column ratio, single-column fallback*
