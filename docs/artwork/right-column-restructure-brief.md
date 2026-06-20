# Cursor Brief — Right Column Visual Restructuring
## bernardbolter.com · Artwork Page · Focused Implementation Brief
*June 2026 · Bernard Bolter × Claude*

---

## Read first

Before writing any code, read:
- `artwork-page-layer-reorganization-addendum.md` — the full spec this brief implements a subset of
- `ownership-record-addendum.md` — the existing ownership/provenance pattern being ported
- `design-system.md` — token reference

This brief is **scoped specifically to the right column** of the artwork page — the `artwork-image__info--details` div in the current `ArtworkPage.tsx`. It does not touch `Layer3ArtistAccount`, `Layer0Image`, or the overall two-column layout proportions yet (that comes later). The goal is to get the right column looking and functioning correctly using the existing layout structure, before the full page restructure.

---

## What exists right now

The right column currently contains three components stacked in order:
1. `Layer1ObjectRecord` — renders the fact grid (Medium, Support, Dimensions, etc.)
2. `Layer2WorldPresence` — renders availability status, editions, documentation, location, external links. Currently renders mostly invisibly for records with sparse data.
3. `Layer4History` — renders exhibition history, ownership, loan history, work state.

These three components stay in the right column. This brief restructures their visual treatment and merges their content into a cleaner sequence, without changing the overall two-column layout or touching the left column.

---

## What changes

### 1. `Layer1ObjectRecord.tsx` — two small additions

**Add "Made in" row** in the right-hand sub-column (where Year and Series already sit), directly below Year:
- Label: `"Made in"`
- Value: `artwork.locationCreated?.city` if populated, optionally followed by `, ${artwork.locationCreated?.country}` if country is not Germany (since the artist is Berlin-based, Germany is implied; only show it for non-German works)
- Render only when `artwork.locationCreated?.city` is non-empty — no row at all if absent

**Do NOT** add a "Made in" row if `locationCreated.city` is empty.

---

### 2. Replace `Layer2WorldPresence.tsx` with `Layer2StatusAndProvenance.tsx`

Build a new component at `src/components/artwork/Layer2StatusAndProvenance.tsx`. Once it is verified working, delete `Layer2WorldPresence.tsx` entirely. Do not leave both files in the codebase.

**Visual idiom — series-colour left-border narrative block:**
- `border-left: 3px solid [series colour]`, `padding-left: 1rem` — no background fill, no full card border, no rounded corners on the accent
- Section label: small caps, `var(--text-tertiary)`, same pattern as the object record's section labels above it
- One strong opening line (the current holder / status) at ~15-16px, `font-weight: 500`
- Supporting prose at 13-14px, `var(--text-secondary)`, `line-height: 1.6`
- Provenance confidence statement in 12-13px italic, `var(--text-tertiary)`
- Hairline dividers (`0.5px solid var(--color-border-tertiary)`) between sub-sections within this block

**Section order within this component:**

**a) Status & ownership block** — always rendered if `currentLocation` is present

Resolve the status headline from `currentLocation.category`:
- `artists-studio` → `"Currently in artist's studio, [artist.workCity1]"`
- `private-collection` → current holder display name from the most recent `ownershipHistory` entry where `collectorVisible: true`, defaulting to `"Private collection"`
- `institution` → `artwork.currentLocation.locationDetail` or `"Institution"`
- `on-loan` → `"Currently on loan"`
- `on-consignment` → `"Available via [artwork.galleryReference || 'gallery']"` — this is the one case where availability is mentioned, since it's genuinely relevant. No price. No CTA. One quiet line.

Provenance confidence statement — always shown when any `provenanceConfidenceLayer` data exists:
- All entries `documented-fact` → `"Provenance: fully documented"`
- Mixed → `"Provenance: partially documented"`
- `provenanceOriginKnown === false` → `"Provenance: origin undocumented"`
- Follow with: `"Ownership history is held privately."`

Ownership timeline — from `ownershipHistory` entries where `collectorVisible: true`:
- Show `displayName`, city, date range as simple text rows
- Never show `ownerPrivate`, sale price, `transactionId`

Provenance origin honesty — when `provenanceOriginKnown === false`:
- Render before the timeline: `"The early history of this work's ownership is not fully documented."`

Unclaimed appeal — when `ownershipHistory` is empty or all entries are `claimStatus: 'unclaimed'`, AND `currentLocation.category !== 'artists-studio'`:
- `"If you own this work, [get in touch](/contact?claim=[artwork.slug]&title=[artwork.title]). I'll add you to the record and officially connect you to its history."`

**b) Documentation & media block** — render only if `documentationVideoUrl` or `arEnabled` or `installationShots.length > 0`

- Section label: `"Documentation & media"`
- Documentation video link: `"▶ Documentation video"` linking to `artwork.documentationVideoUrl`, new tab
- AR experience: `"◈ AR experience — available on the series site"` linking to the series site — **but only render this if `artwork.arEnabled === true` AND a real series site URL exists in `getSeriesSiteUrl(seriesSlug)`.** Do not render if no series site URL exists. Currently no series sites are live, so this line should not render for any record right now.
- Installation shots: small image thumbnails, `object-contain`, same as current `Layer2WorldPresence` behaviour

**c) Loan history** — render only if `artwork.loanHistory` is non-empty

Simple list: institution, date range, linked event if `eventId` present.

**d) External links** — render only if `sameAs` URIs exist

Small pill links, domain-derived labels, new tab. Same logic as current `Layer2WorldPresence`.

**Do NOT:**
- Do not show `askingPrice`, `salesRecord`, raw `ownerPrivate`, raw `provenanceConfidenceLayer` array — ever
- Do not show any "buy," price, or shipping copy under any condition
- Do not show the AR experience line if no series site URL is available — this applies to all records right now since no series sites are live
- Do not show the unclaimed appeal if `currentLocation.category === 'artists-studio'`

---

### 3. Simplify `Layer4History.tsx`

Remove from `Layer4History.tsx`:
- The entire Ownership block (currentHolderLine, origin honesty, timeline, unclaimed appeal) — this now lives in `Layer2StatusAndProvenance`
- Loan history — this now lives in `Layer2StatusAndProvenance`

Keep in `Layer4History.tsx`:
- Exhibition history (unchanged)
- Work state record (unchanged)

The component becomes significantly shorter. Do not leave dead code from the removed blocks.

**Visual treatment for exhibition history rows:**
- Each row: `[year] — [event title]` where `event.hasPage === true` renders the title as a link to `/events/[event.slug]`, otherwise plain text
- Venue and city as secondary text: `· [venueName], [venueCity]` in `var(--text-secondary)`
- Simple hairline-divided list, no striping, no background colour alternation

---

### 4. `SeriesCard.tsx` — suppress CTA entirely

Currently the CTA links to `getSeriesSiteUrl(topSeries.slug)`. No series sites are live yet, so this function returns null or a placeholder for all series.

**Change:** render the CTA `<a>` element only when `getSeriesSiteUrl(topSeries.slug)` returns a real, non-null URL. If it returns null, render nothing in place of the CTA — no placeholder text, no disabled link, no "coming soon." The series name, description, and AR pill (if `arEnabled`) still render as normal; only the CTA link is suppressed.

This is already partially the intent of the existing `{siteUrl ? (...) : null}` pattern in `SeriesCard.tsx` — confirm it is working correctly and that `getSeriesSiteUrl` returns null for all series that don't yet have a live site.

---

### 5. `ArtworkPage.tsx` — update component references

Replace the `Layer2WorldPresence` import and usage with `Layer2StatusAndProvenance`:

```tsx
// Remove:
import Layer2WorldPresence from '@/components/artwork/Layer2WorldPresence'

// Add:
import Layer2StatusAndProvenance from '@/components/artwork/Layer2StatusAndProvenance'
```

In the render:
```tsx
// Remove:
<Layer2WorldPresence artwork={artwork} artist={artist} hideEditions />

// Add:
<Layer2StatusAndProvenance artwork={artwork} artist={artist} />
```

Remove the `PrintEditionsSection` import and usage entirely — it is no longer needed since it duplicated the editions display that will eventually be handled by the Edition registry. For now, editions display is simply absent until the `EditionTierRegistry` component is built in the next pass.

The overall layout structure (`artwork-image__info--about-section` left, `artwork-image__info--details` right) stays exactly as it is — do not touch the two-column layout classes or proportions in this brief.

---

## What this brief deliberately does NOT include

These are out of scope for this pass and will be handled separately:

- `EditionTierRegistry.tsx` — the full per-copy ownership accordion. No edition display at all in this pass.
- The 55/45 column ratio change
- `Layer3ArtistAccount` internal reordering (art-historical refs moving up, classification cluster at bottom)
- The CLIP accordion conversion
- The single-column fallback for stub records
- The `altTitle` line in Layer0Image
- Any changes to the hero/image section

---

## Visual reference

The three idioms in play for this brief:

**Object record (Layer1) — flat panel, unchanged:**
Already rendering correctly. No visual changes in this brief.

**Status & provenance (Layer2StatusAndProvenance) — series-colour left border:**
```
[3px series-colour left border, padding-left: 1rem]

STATUS & PROVENANCE                    ← 10-11px caps, var(--text-tertiary)

Currently in artist's studio, Berlin  ← 15-16px, font-weight: 500
[location detail prose if present]    ← 13px, var(--text-secondary)
[italic provenance statement]          ← 12px italic, var(--text-tertiary)

────────────────────────────────────  ← 0.5px hairline
DOCUMENTATION & MEDIA                 ← 10-11px caps, var(--text-tertiary)
▶ Documentation video
◈ AR experience — on the series site  ← only when series site URL exists

────────────────────────────────────
EXTERNAL LINKS
Artsy ↗
```

**Exhibition history (Layer4, simplified) — hairline list:**
```
EXHIBITION HISTORY                     ← 10-11px caps, var(--text-tertiary)

2022 — Galerie Nord, Berlin            ← 12-13px
       · Mitte, Berlin                 ← secondary text
```

---

## Verification checklist

- [ ] `Layer2StatusAndProvenance.tsx` exists; `Layer2WorldPresence.tsx` is deleted
- [ ] `PrintEditionsSection` is removed from `ArtworkPage.tsx`
- [ ] "Made in" row renders in Layer1 near Year, only when `locationCreated.city` is present
- [ ] No price, "buy," or shipping copy appears anywhere in the right column
- [ ] Series-colour left border appears on the Status & Provenance block using the artwork's resolved series colour
- [ ] AR experience line does not render when no series site URL exists (currently: never renders)
- [ ] Unclaimed appeal does not render when `currentLocation.category === 'artists-studio'`
- [ ] Ownership timeline rows never expose `ownerPrivate`, sale price, or `transactionId`
- [ ] `Layer4History` no longer contains ownership or loan history code
- [ ] Exhibition history rows link to `/events/[slug]` only when `event.hasPage === true`
- [ ] SeriesCard CTA is suppressed when `getSeriesSiteUrl` returns null — currently suppressed for all series
- [ ] Right column on the Basel Switzerland page renders visibly: object record → status block → exhibition history (if any) → work state (if any), with no empty invisible sections

---

*Right Column Visual Restructuring Brief · June 2026*
*Scoped brief — read alongside: artwork-page-layer-reorganization-addendum.md, ownership-record-addendum.md, design-system.md*
*Next pass: EditionTierRegistry, 55/45 column ratio, Layer3 reorder, CLIP accordion, single-column fallback*
