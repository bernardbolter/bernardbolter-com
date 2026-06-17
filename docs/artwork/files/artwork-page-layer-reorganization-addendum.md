# Artwork Page — Layer Reorganization & Provenance/Editions Addendum
## bernardbolter.com · Single Artwork Page · Cursor Implementation Spec
*June 2026 · Bernard Bolter × Claude*

---

## Read first

Before writing any code, read:
- `artwork-page-directive.md` — the base spec this addendum modifies
- `ownership-record-addendum.md` — the existing ownership/provenance pattern this spec extends to editions
- `artist-archive-schema-final.md` / `master-schema-spec.md` — field definitions
- `design-system.md` — token names (see note under Design constraints — token mismatch)

This document **supersedes** the layer order, component responsibilities, and Layer 2/4 content described in `artwork-page-directive.md` and `ownership-record-addendum.md`. Field-level rules from those documents (what's private, what's never shown) remain in force unless explicitly changed below.

---

## Why this change

The current render order in `ArtworkPage.tsx` is Layer0 → SeriesCard → Layer3 (artist's account) → PrintEditions → Layer1 (object record) → Layer2 (world presence) → Layer4 (history). On mobile, this puts the longest, most interpretive content (Layer3) immediately after the hero — before a visitor has even seen the basic facts of what the work is.

This archive is not a sales channel. Availability now means one thing: *is this viewable, in higher detail or AR, on the relevant series site* — not a price-and-inquiry flow. That collapses what Layer2 used to do (availability + editions + location) and frees provenance to take a more central position, since provenance — and the invitation for an unknown owner to surface and correct the record — is one of the clearest places where this project's actual mission becomes visible to a reader.

---

## Visual structure — three distinct idioms

The page previously risked reading as one undifferentiated scroll of hairline-bordered rows. This addendum introduces deliberate visual variance between section types so a reader feels a shift in register when moving between them, without introducing a fourth competing style or abandoning the page's overall restraint.

Three idioms, used consistently across the page wherever that *kind* of content appears:

**1. Object record idiom — flat panel, two-column fact grid**

Used by: Layer1ObjectRecord.

- Whole block sits on `var(--color-background-secondary)` (or equivalent new-token surface), `border-radius: var(--border-radius-lg)`, padding `1.25rem 1.5rem`
- Two-column grid, each row `label / value`, 0.5px hairline dividers between rows, last row in each column has no bottom border
- No icons, no pills, no colour accents beyond the small series-colour dot already used for the Series row
- This idiom reads as "facts," and should stay the flattest, quietest section on the page

**2. Status & provenance idiom — series-colour accent, narrative block**

Used by: Layer2StatusAndProvenance's Status & Ownership block (and, by extension, the existing ownership-timeline pattern it absorbs).

- Left border accent: `border-left: 3px solid [series.colour]`, `padding-left: 1.25rem` — no background fill, no full border, no rounded corners on this accent (per the general rule that single-sided borders stay square)
- One strong opening line — the current-holder or current-status statement — at `17px / 500`, more typographic weight than anything in the object record
- Supporting prose at `14px`, generous `line-height: 1.7`
- Provenance confidence statement in `13px`, `var(--color-text-tertiary)`, italic, no border-left of its own (the section's outer accent already carries that signal — don't double it up on the statement specifically)
- A light hairline-divided footer row for short status fragments (e.g. "No edition released yet" / "No external links") when the section is otherwise sparse
- This idiom reads as "the work's current chapter" — narrative tone, not a form

**3. Edition registry idiom — bordered card, interactive disclosure**

Used by: EditionTierRegistry only.

- This is the one component on the page that departs from the "no card borders" convention used elsewhere, deliberately — because it is also the only genuinely interactive (accordion) component on the page, and benefits from looking like a control surface rather than static prose
- Whole registry wrapped in a single card: `var(--color-background-primary)`, `0.5px solid var(--color-border-tertiary)`, `border-radius: var(--border-radius-lg)`, `overflow: hidden`
- Each tier is a row inside the card: a button-style header (tier label left, claimed-count pill + chevron right), hairline divider between tiers
- Claimed-count summary renders as a small pill: `background: var(--color-background-secondary)`, `color: var(--color-text-secondary)`, `font-size: 12px`, `padding: 3px 9px`, `border-radius: 999px`
- Chevron icon (`ti-chevron-down` when open, `ti-chevron-right` when closed) signals disclosure state — this is the one place on the page where an icon is permitted, scoped specifically to this component
- Opened tier content (claimed-copy rows + claim CTA) sits inside the same card, indented to align with the header label, hairline divider below before the next tier

### Do NOT

- Do not apply the Edition registry's card-and-icon treatment anywhere else on the page — it is scoped to `EditionTierRegistry.tsx` only
- Do not add a left border accent to the provenance confidence statement specifically — the section-level accent already carries that signal once
- Do not introduce a fourth visual idiom for any new section added later without deciding deliberately which of these three it should match — the goal is exactly three registers, not one per component



## New layer order — two persistent columns, not one linear sequence

The live site already runs a genuine two-column layout below the hero: a wide left column carrying the long prose (the artist's account), and a narrower right column carrying structured facts, that stays visible alongside the prose for the full scroll length. This addendum keeps that pattern — it does not flatten the page into one single-column sequence — but corrects what each column holds and fixes the mobile order, which currently puts the long prose first.

### Desktop — two columns, both persistent for the full page length

**Left column:** Layer3ArtistAccount only — the artist's account essay, classification chips, art historical references, similar works, CLIP note, reasoning badge. Nothing else lives here. See "Layer3 internal reordering" below for the required internal sequence change.

**Column ratio:** 55% left / 45% right. The live site currently runs roughly 60/40, but the right column now carries substantially more content than it used to (Status & Provenance, Edition Registry, Documentation & media, External links, Exhibition history, Work state — not just four object-record fields), so it needs more breathing room than the original ratio gives it. 55/45 is still asymmetric, not an even split — do not square it off to 50/50.

Because the right column now holds more sections than before, its internal spacing should run tighter than the left column's prose spacing (smaller gaps between sections, slightly smaller font sizes for labels) so the added content doesn't force the column wider than its 45% allowance or cause horizontal overflow/clipping at standard desktop widths.

**Right column, top to bottom:**
1. Layer1ObjectRecord (the essentials — medium, dimensions, year, "Made in," etc.)
2. Layer2StatusAndProvenance's Status & Ownership block
3. EditionTierRegistry
4. Exhibition history (moved from Layer4)
5. Work state record (moved from Layer4)

The right column is accepted to run longer than the left column for records with substantial provenance/edition/exhibition data and a short prose account, or vice versa for records with a long essay and little structured history. **No height-matching or column-balancing logic is required** — if one column finishes well before the other, the shorter column simply ends and the longer one continues; this is acceptable and should not be "fixed" with padding tricks, sticky positioning, or artificial truncation.

SeriesCard sits above both columns, full width, as it does today.

### Single-column fallback for stub records

Many records in the archive currently have only an image and basic facts — no prose has been written yet. For these, the two-column layout should collapse to one column on desktop rather than leaving a long empty left column beside a short right column.

**Collapse condition:** Layer3 is treated as "empty" — triggering the single-column fallback — when none of the prose/intent fields (Contribution, About, Intent, Direct inspiration, Making, Context of making, Where it went, In the practice, Process, Why these materials, What this isn't, In the series, Source material) and no art-historical context/references are populated. The presence of tags, similar works, the CLIP note, or the reasoning status line **alone does not count** as enough to keep the two-column layout — the reasoning badge in particular renders on every record (including stubs, where it reads "Record not yet fully catalogued"), so treating any Layer3 content as sufficient would mean the fallback almost never triggers.

**When collapsed:** the right column's content (Object Record → Status & Provenance → Edition Registry → Documentation & media → Exhibition history → Work state, in that order) becomes the only content on the page, centered, at roughly 75-80% of the normal two-column container's total width — wider than a single object-record-only mockup would need, narrower than full bleed, so Edition registry cards and other right-column content don't stretch awkwardly thin or run uncomfortably wide.

If Layer3 does have tags/similar-works/CLIP/reasoning-badge content but no prose, that residual content still renders — just at the bottom of the single centered column, below the right-column sections, rather than disappearing. Do not discard it.

#### Do NOT

- Do not require literally zero Layer3 content (including tags and the reasoning badge) to trigger the single-column fallback — only the prose/intent fields and art-historical context/references should gate this
- Do not stretch the collapsed single column to full container width, and do not constrain it to the same narrow width as an isolated object-record mockup — use the intermediate width specified above
- Do not silently drop tags/similar-works/CLIP/reasoning-badge content when Layer3's prose is empty but these residual fields are populated

### Layer3 internal reordering

Two of Layer3's existing sub-sections change position relative to each other; nothing else about Layer3's content changes.

**Current order** (per `Layer3ArtistAccount.tsx`): Contribution → intent fields (About, Intent, Direct inspiration, Making, Process, etc.) → tags/chips → art historical context + references → similar works → CLIP note → reasoning badge.

**New required order:**
1. Contribution
2. Intent fields, unchanged internal sequence (About, Intent, Direct inspiration, Making, Context of making, Where it went, In the practice, Process, Why these materials, What this isn't, In the series, Source material)
3. **Art historical context + references** — moves up to sit directly after the intent fields, with nothing between them. This keeps the artist's-voice content and the comparative/scholarly content reading as one continuous critical narrative.
4. A visually distinct lower cluster, in this order: **tags/chips → similar works (CLIP-derived) → CLIP explainer (now an accordion, see below) → reasoning status line**

The effect: the top of Layer3 reads as one continuous voice (the artist's own account, immediately followed by where the work sits art-historically), and the bottom becomes a distinct "classification & machine-readability" cluster — tags, visual-similarity, and the CLIP explanation, ending on the plain-text reasoning status line.

### CLIP explainer becomes an accordion

`ClipEmbeddingNote.tsx` currently renders as a static paragraph with two inline links. It becomes a collapsed-by-default accordion:

- Closed state: a single line, e.g. "This work has a machine-readable visual fingerprint" (when `hasClipEmbedding`) or "Visual similarity data not yet generated for this work" (when not) — same copy logic as today, just collapsed behind a disclosure control
- Opened state: the existing explanatory paragraph plus both existing links (the external CLIP explainer link, and "View this work's embedding →")
- Visual treatment: this is the one other place on the page (besides EditionTierRegistry) permitted a disclosure chevron — but it should NOT adopt the full bordered-card idiom; keep it as plain text with a chevron only, since it's a single line, not a multi-row registry

#### Do NOT

- Do not insert tags, similar works, or the CLIP note between the intent fields and the art historical context/references — they must read as one uninterrupted block
- Do not give the CLIP explainer accordion a card border — chevron-plus-text only, distinct from the Edition registry's fuller card treatment

### Mobile — single stacked sequence, different order than the desktop columns imply

1. SeriesCard
2. Layer1ObjectRecord
3. Layer2StatusAndProvenance's Status & Ownership block + EditionTierRegistry (these two stay adjacent to each other)
4. Layer3ArtistAccount (the prose)
5. Exhibition history + Work state record

This is a deliberate split: the scannable, structured content (facts, status, claim opportunities) surfaces before the long-form essay on mobile, while exhibition history and work-state — the least urgent, most archival material — stay at the very end on both viewports.

```
src/components/artwork/
  ArtworkPage.tsx                 ← UPDATED: two-column desktop layout, reordered mobile stack
  Layer0Image.tsx                 ← UPDATED: altTitle line
  SeriesCard.tsx                  ← placeholder treatment only in this pass — see note below
  Layer1ObjectRecord.tsx          ← UPDATED: "Made in" row
  Layer2StatusAndProvenance.tsx   ← NEW — replaces Layer2WorldPresence
  Layer3ArtistAccount.tsx         ← unchanged content; now the sole occupant of the left column on desktop
  Layer4History.tsx               ← UPDATED: ownership/loan history removed; exhibition history + work state only, now rendered in the right column, not as a separate full-width section
  EditionTierRegistry.tsx         ← NEW — used inside the right column
PrintEditionsSection.tsx          ← REMOVED — superseded by EditionTierRegistry
Layer2WorldPresence.tsx           ← REMOVED — superseded by Layer2StatusAndProvenance
```

### Series card — deferred design

SeriesCard's actual visual design (per-series art direction, pulling from each series' own visual identity rather than one shared template) is **out of scope for this addendum** and will be specced separately. This document only specifies SeriesCard's function (wayfinding, deep link to the series site) — see the SeriesCard section below — not its final look. Treat its appearance in any mockup as a placeholder.

### Do NOT

- Do not keep `Layer2WorldPresence.tsx` and `Layer2StatusAndProvenance.tsx` both in the codebase — delete the former once the latter is verified
- Do not keep `PrintEditionsSection.tsx` once `EditionTierRegistry.tsx` is in place — there is no longer a need for editions to render in two places
- Do not change anything inside `Layer3ArtistAccount.tsx`'s field content or wording — only its column placement, exclusivity, and the two internal reorderings specified under "Layer3 internal reordering" change
- Do not add column height-matching, sticky positioning, or truncation logic to compensate for uneven column lengths
- Do not attempt to finalize SeriesCard's visual design as part of implementing this addendum

---

## Layer0 — addition: alternate title

`altTitle` (schema: optional alternate title, "displayed as 'also known as'") currently has no display anywhere on the page.

- Render directly below `h1` (title), above `h2` (year)
- Small text, secondary colour — quieter than the year/medium lines, not a second headline
- Format: `also known as [altTitle]`
- Condition: render only if `altTitle` is non-empty. No placeholder, no empty space.

### Do NOT

- Do not give `altTitle` equal visual weight to the title
- Do not render this line if `altTitle` is empty

---

## SeriesCard — reframed as wayfinding, not cross-promotion

**Visual design deferred** — see note above. The content/function rules below apply regardless of final visual treatment.

The series site is where a richer view of this work lives — larger image treatment, AR where enabled. The archive is the source-of-truth record and the home of the in-depth essay (Layer3) and the honest provenance record (new Layer2). Each site should send visitors to the other for what it does better.

### Content changes

- The CTA changes from a general "Go to [Series Name] →" link to the series site's homepage/section, to a **deep link to this specific artwork's page on the series site**, using the same slug: `https://[series-site-domain]/[slug]`
- Series sites are not yet built. Until a series has a live site, omit the CTA entirely rather than link to a non-existent page — do not link to a placeholder or a series homepage as a fallback
- Add a one-line framing above the CTA so the purpose of the link is clear, e.g.: "See this work in full scale, with AR where available, on the [Series Name] site →" — copy to be finalised with artist, but the function (this is the higher-fidelity view, not a sales page) must be clear
- The AR pill logic is unchanged: shown only when `arEnabled === true`, still routes through the series site, never links to the AR experience directly from the archive

### Required reciprocal note (not implemented in this repo)

When series sites are eventually built, each artwork view there must link back to `bernardbolter.com/[slug]` for the full essay and provenance record. This is a contract for the series-site spec, not something to build here — flag it in that spec when it's written, do not attempt to implement a placeholder for it now.

### Do NOT

- Do not link to a series site that doesn't exist yet — omit the CTA instead
- Do not duplicate Layer3's essay content here — this card's job is wayfinding, not context

---

## Layer1ObjectRecord — addition: "Made in"

`city` / `country` (where the work was made) currently feeds JSON-LD only (`locationCreated`) with no human-facing display anywhere on the page. This is a fact about the work's origin, distinct from `currentLocation` (where it is now, handled in the new Layer2).

- New row in the right-hand column, near **Year** (directly above or below it — implementer's choice based on visual balance)
- Label: "Made in"
- Value: `city` alone if `country` is the artist's home country (Germany), otherwise `city, country`
- Condition: render only if `city` is present

### Confirmed out of scope

- `weight` is **not** displayed anywhere on this page. This is a deliberate decision (the practice does not include sculpture; the field has no display value here) — not an oversight. Optionally raise with the artist separately whether to remove the field from the schema entirely; do not remove it as part of this spec without explicit confirmation.

### Do NOT

- Do not add a "Made in" row if `city` is empty
- Do not display `weight` anywhere on this page

---

## Layer2StatusAndProvenance — new component

**Replaces** `Layer2WorldPresence.tsx`. **Absorbs** the Ownership and Loan-history sections previously specified in `Layer4History.tsx` / `ownership-record-addendum.md`.

This is the most substantially changed part of this addendum. It is the single section that answers: *where is this work, who has it, is any part of the record unclaimed, and can a visitor do anything about that.*

Visual treatment: see "Status & provenance idiom" under Visual structure above — series-colour left border, narrative tone, no card background.

### Section order within this layer

1. Documentation & media block (unchanged from old Layer2 — video, AR pointer, installation shots)
2. **Status & Ownership block** (new — for unique/original works; absorbs old Location block + old Layer4 Ownership block)
3. **Edition Tier Registry** (new component, `EditionTierRegistry.tsx` — only renders if the artwork has edition tiers)
4. Loan history (moved here from old Layer4, content unchanged)
5. External links block (unchanged from old Layer2)

### What is removed from this layer

- The old "Availability" block (coloured status indicator, asking price, EU shipping note, email CTA) is **removed entirely**. Availability-as-a-sales-concept no longer exists on this page. If a unique original is genuinely for sale through a gallery (on-consignment), that fact can still appear as a quiet line in Status & Ownership (see below) — but there is no price, no "buy" framing, no shipping note.
- The standalone editions grid from old Layer2 is removed — superseded by the Edition Tier Registry.

### Documentation & media block

Unchanged from `artwork-page-directive.md`'s Layer2 spec: render only if `documentationVideoUrl`, `arEnabled`, or `installationShots` are present. Content and conditions identical to the existing spec.

### Status & Ownership block

For the unique original object (not edition copies — those are handled by the registry below).

Condition: always rendered for any artwork with a `currentLocation` value or `ownershipHistory` entries.

- `currentLocation === "artist's studio"` → "Currently in artist's studio, [artist.workCity1]"
- `currentLocation === "private collection"` → current holder line, per the existing ownership-addendum logic: show `displayName` (defaults to "Private collection") if the most recent `collectorVisible === true` entry exists; otherwise show only the provenance confidence statement
- `currentLocation === "institution"` → institution name from `locationDetail`
- `currentLocation === "on loan"` → "Currently on loan"
- If `availabilityStatus === 'on-consignment'`: add a quiet secondary line — "Available via [galleryReference if public, else 'gallery']" with a contact link. No price. No shipping note. This is information, not a sales pitch.

**Provenance confidence statement** — always shown when provenance data exists (unchanged from `artwork-page-directive.md` Layer4 spec, relocated here):

- Derived from `provenanceConfidenceLayer`: all `documented-fact` → "Provenance: fully documented"; mixed → "Provenance: partially documented"; `provenanceOriginKnown === false` → "Provenance: origin undocumented"
- One-line note: "Ownership history is held privately. This statement reflects the level of documentation on record."

**Ownership timeline** (public portion) — unchanged from `ownership-record-addendum.md`:

- From `ownershipHistory` entries where `collectorVisible === true`: `displayName`, city, date range
- Never show `ownerPrivate`, sale price, or `transactionId`
- Origin honesty statement appears above the timeline when `provenanceOriginKnown === false`

**Unclaimed appeal** — unchanged condition and copy from `ownership-record-addendum.md`:

> "If you own this work, [get in touch](/contact?claim=...&title=...). I'll add you to the record and officially connect you to its history."

- Do not show if the work is currently in the artist's studio (no ownership gap to fill)

### Edition Tier Registry — `EditionTierRegistry.tsx`

Renders below the Status & Ownership block, only if the artwork has one or more entries in its edition-tier structure (see Schema additions below for the data shape this depends on).

This component must exist as a separate file from the Status & Ownership block — they have different display rules (accordion vs. narrative) and different data shapes (single ownership record vs. array of numbered copies).

Visual treatment: see "Edition registry idiom" under Visual structure above — bordered card, chevron disclosure, claimed-count pill. This is the one component on the page permitted to use a card border and an icon; everything else stays in the flatter idioms.

**All numbered tiers (Tier 1 top edition, Tier 2 mid, Tier 3 lower — e.g. 3+1AP, 100, 500, 9+2AP, 200) share the same display logic.** There is no longer a distinct "always visible, show unclaimed rows" treatment for Tier 1 — all numbered-copy tiers behave identically:

- Collapsed inside an accordion, closed by default (this now applies to the top tier too, not just mid/lower)
- Accordion header (always visible, not inside the collapsed content): a claimed-count summary derived by counting `claimStatus === 'claimed-confirmed'` entries against `editionSize` (the AP, if present, is excluded from this count — see AP visibility rule below)
  - If zero copies are claimed: header reads as a quiet availability note, e.g. "Edition of [editionSize] — available" — **no price, no shipping note, no CTA beyond the claim/inquiry link already present for claimed tiers**
  - If some are claimed: "12 of 100 prints claimed"
  - If all numbered copies are claimed: "[editionSize] of [editionSize] claimed — edition complete"
- When opened: **only render rows for copies where `claimStatus === 'claimed-confirmed'` and `collectorVisible === true`**. Do not render unclaimed copies as visible rows, even inside the open accordion, regardless of tier.
- Below the claimed-copy rows (or in place of them if none are claimed yet), a quiet claim CTA: "Do you own one of these? [Claim yours →]" linking to `/contact?claim=[slug]&tier=[tierLabel]`
- The claim flow does not require the visitor to know their copy number — see Schema additions, `claimedCopyNumberKnown`

**Artist's Proof (AP) visibility rule** — applies specifically to AP copies within a tier (most relevant at Tier 1, but the rule is general):

- An AP row is **suppressed entirely** (not shown as "unclaimed," not rendered at all, not counted in the tier's claimed-count summary) until **all non-AP numbered copies in that tier reach `claimStatus === 'claimed-confirmed'`**
- Once that condition is met, the AP row appears with default state `claimStatus: 'artist-held'`: "AP — held by the artist." No owner name. This is not noise to suppress once shown — it's the honest current state of the record once the edition is complete.
- The AP row is visually set apart from the numbered-copy rows above it by a dashed top divider (distinct from the solid hairlines used between numbered copies) — signalling it is a different kind of entry, not a fourth numbered print, without requiring extra explanatory text
- **If the AP is later sold, this is a distinct transaction type from the numbered-copy sales — a secondary-market sale of the artist's own retained copy, not a first sale of an edition print, and very likely at a different price point.** It must not be recorded or rendered as `claimed-confirmed` (which implies a first-sale claim like the numbered copies). Instead it gets its own state: `claimStatus: 'sold-secondary'`.
  - Display for `sold-secondary`: "AP — sold by the artist" (no buyer name shown by default; `collectorVisible` defaults to `false` for this state, distinct from the numbered-copy default, since this is a more private kind of transaction unless the artist chooses otherwise)
  - If the artist explicitly sets `collectorVisible: true` for a `sold-secondary` AP, it may show a buyer display name, but this is an opt-in, not the default
- Rationale: while the numbered edition is still selling, mentioning the AP is sales-irrelevant noise; once the edition is complete, omitting the AP would itself look like an undisclosed gap in the record, so it surfaces at that point to close the record honestly. If it's later sold, the record should not blur that sale into looking like a fourth "edition copy" sale — it was never offered as part of the edition, and treating it identically would misstate the work's actual sales history.

**Untracked/informal print note**

- If the artwork has an `untrackedEditionsNote` field populated, render it as a single quiet prose line below the registry (or in place of it, if there are no structured tiers at all): e.g. "Small-format prints of this work were also sold informally in the past; these were not consistently numbered and are not individually tracked."
- This is prose, not a registry entry — it exists so the record is honest about its own limits rather than silent about a distribution channel that existed

### Loan history

Unchanged content from `artwork-page-directive.md`'s old Layer4 spec — institution, date range, linked event if present. Condition: render only if `loanHistory` is non-empty. Relocated here, no logic changes.

### External links block

Unchanged from old Layer2 spec — `sameAs` URIs as small pill links, domain-derived labels, open in new tab.

### Do NOT

- Do not show `askingPrice`, `salesRecord`, raw `ownershipHistory` private fields, raw `provenanceConfidenceLayer` array — ever, under any condition (unchanged rule, restated because this component now does the job two former components did)
- Do not render unclaimed copies as visible rows in Tier 2/3 — only the claimed-count summary represents them
- Do not render a price, "buy", or shipping-related copy anywhere in this layer
- Do not show the unclaimed appeal (unique-original version) if the work is in the artist's studio
- Do not build any owner-facing self-service update mechanism here — claims still route through the existing contact form flow

---

## Layer4History — reduced scope

Now contains only:

1. Exhibition history (unchanged)
2. Work state record (unchanged)

Ownership, ownership timeline, unclaimed appeal, and loan history are removed from this component — they now live in Layer2StatusAndProvenance.

### Do NOT

- Do not leave dead/duplicate ownership-rendering code in this component after the move

---

## Schema additions

These are new fields, not yet present in `artist-archive-schema-final.md` / `master-schema-spec.md`. They should be added there as part of implementing this spec, not invented ad hoc in component code.

### `editionTiers` (array, on Artwork)

Each entry:

```
{
  tierLabel: string              // e.g. "Original edition", "A0 edition", "A1 edition"
  tierOrder: number               // 1 = top, 2 = mid, 3 = lower — informational only; all tiers share the same accordion display logic
  editionSize: number              // numbered copies only — excludes AP count
  apCount: number
  format: string                  // size/substrate description
  copies: [
    {
      copyNumber: string          // "1/3", "AP", "47/100"
      isArtistProof: boolean      // true for AP copies — gates the AP visibility rule
      owner: string | null        // display name; null/absent = unclaimed; defaults to "the artist" when isArtistProof and unsold
      claimStatus: 'unclaimed' | 'claimed-pending' | 'claimed-confirmed' | 'artist-held' | 'sold-secondary'
      collectorVisible: boolean
      dateAcquired: string | null
      claimedCopyNumberKnown: boolean   // whether the claimant knew their own copy number, or it was assigned on confirmation
      notes: string | null
    }
  ]
}
```

`visibilityMode` from the original draft of this field is removed — all tiers now use the same accordion behaviour, so a per-tier override is unnecessary. If a future case genuinely needs a different display mode, add it back deliberately rather than leaving unused flexibility in the schema now.

This structure reconciles — but does not yet fully merge with — the existing `editions` array (`artist-archive-schema-final.md` / `master-schema-spec.md`, format/price/stock metadata) and the series-specific `editionTiers` arrays already specified separately in `dcs-tab-schema-spec.md` and `print.editions` in `megacities-payload-schema.md`. **Reconciling these three shapes into one is a separate schema task and should not be done silently as part of implementing this page spec** — flag it as follow-up work. For this page's purposes, `EditionTierRegistry.tsx` should be built against the shape above; if the underlying field name differs once the schema reconciliation happens, only the data-fetching layer should need to change, not the component's rendering logic.

### `untrackedEditionsNote` (text, on Artwork)

Plain prose. Public. No structured data — see Edition Tier Registry section above.

### `componentCount` (number, on Artwork, optional)

For artworks physically realized as multiple components sold/owned as a single unit (e.g. a triptych). Purely descriptive — does not affect ownership, edition, or sale logic, which all still operate at the single-artwork-record level.

- When present and greater than 1, Layer0's gallery may label each image as "Panel [n] of [componentCount]"
- Does not require any change to ownership/edition schema — the triptych is one artwork record with one set of edition tiers, same as any other artwork

### Do NOT

- Do not build a separate "edition release" record spanning multiple artwork records for the triptych case — `componentCount` on a single artwork record is sufficient since the components are always sold and owned together
- Do not retrofit `copies` registries for past, informally-sold, unreliably-numbered print runs — use `untrackedEditionsNote` instead
- Do not count the AP copy toward a tier's claimed-count summary, or render it as a row, until every non-AP copy in that tier is `claimed-confirmed`
- Do not require an owner name on the AP row while it remains artist-held — "AP — held by the artist" is sufficient and correct
- Do not record or render an AP sale as `claimed-confirmed` — it is a distinct secondary-market transaction and must use `claimStatus: 'sold-secondary'`, with `collectorVisible` defaulting to `false` rather than `true`

---

## JSON-LD additions

`generateArtworkJsonLd.ts` needs two additions beyond what's specified in `artwork-page-directive.md`:

- `artism:editionClaimSummary` — an array of derived public summary strings, one per tier, e.g. `["Original edition: 2 of 4 claimed", "A0 edition: 12 of 100 claimed"]`. Derived the same way the human-facing accordion header is derived. Never includes individual unclaimed copy data — same honesty-without-implying-completeness principle as `artism:provenanceConfidenceLevel`.
- `artism:componentCount` — integer, only output when present and greater than 1

### Do NOT

- Do not output raw `copies` array data in JSON-LD — only the derived summary string, same rule as `ownershipHistory`/`provenanceConfidenceLayer`

---

## Design constraints — token mismatch flagged

The components reviewed for this spec (`Layer1ObjectRecord.tsx`, `Layer2WorldPresence.tsx`, `Layer4History.tsx`, etc.) reference CSS variables like `var(--color-border-tertiary)`, `var(--color-text-secondary)`, `var(--color-background-secondary)`. The current `design-system.md` token system uses a different naming convention (`text-*`, `surface-*`, `ui-*`, `series-*`, `status-*` — e.g. `$text-secondary`, `$surface-panel`).

**This spec does not resolve that mismatch.** When implementing `Layer2StatusAndProvenance.tsx` and `EditionTierRegistry.tsx`, use whichever token set is current in the actual codebase at build time — but flag the inconsistency to the artist if both naming conventions are still in active use across different components, since it suggests the Sass-to-Tailwind token migration is incomplete and other ported components may have the same issue.

### Do NOT

- Do not silently introduce a third token naming pattern — use the codebase's current convention, whichever of the two it turns out to be at implementation time

---

## Verification checklist

- [ ] Desktop: left column contains only Layer3ArtistAccount; right column contains Layer1 → Status & Provenance → Edition Registry → Exhibition history → Work state, in that order, persisting alongside the left column for the full scroll
- [ ] Desktop: uneven column lengths are left as-is — no height-matching, sticky positioning, or truncation added
- [ ] Mobile: stacked order is SeriesCard → Layer1 → (Status & Provenance + Edition Registry) → Layer3 prose → Exhibition history + Work state
- [ ] Desktop column ratio is 55% left / 45% right, not 50/50 or the old 60/40
- [ ] Right column's internal spacing is tighter than the left column's prose spacing, avoiding overflow/clipping at standard desktop widths
- [ ] AP row, once visible, is set apart from numbered-copy rows by a dashed divider, not a solid hairline
- [ ] Art historical context + references sit directly after the intent fields with no tags/similar-works/CLIP content between them
- [ ] Tags, similar works, and CLIP explainer form one cluster at the bottom of Layer3, in that order, ending with the plain-text reasoning status line
- [ ] CLIP explainer renders as a collapsed-by-default accordion (chevron + text only, no card border)
- [ ] SeriesCard renders with placeholder/current visual treatment — no new bespoke per-series design implemented as part of this addendum
- [ ] Layer1ObjectRecord uses the flat panel/two-column fact grid idiom — no icons, no pills, no left-border accent
- [ ] Layer2StatusAndProvenance uses the series-colour left-border narrative idiom — no card background, no full border
- [ ] EditionTierRegistry uses the bordered-card/chevron-disclosure idiom — the only component on the page with a card border and an icon
- [ ] `Layer2WorldPresence.tsx` and `PrintEditionsSection.tsx` are deleted, not just unused
- [ ] `altTitle` renders quietly below the title only when present; no empty space when absent
- [ ] SeriesCard CTA links to the series site's same-slug artwork page; CTA is omitted entirely when no series site exists yet
- [ ] "Made in" row appears in Layer1 near Year, only when `city` is present
- [ ] `weight` does not render anywhere on the page
- [ ] No price, "buy," or shipping copy appears anywhere on the page
- [ ] Status & Ownership block correctly handles all four `currentLocation` values plus on-consignment
- [ ] Provenance confidence statement always shown when provenance data exists; never implies completeness when `provenanceOriginKnown === false`
- [ ] All edition tiers (including the former "Tier 1") render as closed-by-default accordions with a claimed-count summary header
- [ ] Tier accordion header shows a quiet "available" note with no price when zero copies are claimed
- [ ] Tier accordions, when opened, show only claimed+visible copies — never unclaimed rows, at any tier
- [ ] AP row is fully suppressed (not shown, not counted) until all non-AP copies in its tier are `claimed-confirmed`
- [ ] AP row, once visible, defaults to `claimStatus: 'artist-held'` ("AP — held by the artist") unless sold
- [ ] AP sale is recorded as `claimStatus: 'sold-secondary'`, never `claimed-confirmed`; renders as "AP — sold by the artist" with `collectorVisible` defaulting to `false`
- [ ] Claim CTA on tier accordions links to `/contact?claim=[slug]&tier=[tierLabel]`
- [ ] `untrackedEditionsNote` renders as prose only, never as registry rows
- [ ] No private fields (`ownerPrivate`, `salesRecord`, `askingPrice`, raw `provenanceConfidenceLayer`, raw `copies` claim detail beyond claimed+visible) appear anywhere in rendered output or page source
- [ ] Layer4's content scope is limited to Exhibition history and Work state record (ownership/loan history removed) — and this content renders inside the right column, not as a separate full-width section
- [ ] Single-column fallback triggers correctly: when no prose/intent fields and no art-historical context/references are populated, the page collapses to one centered column at ~75-80% of the normal container width
- [ ] Single-column fallback does NOT trigger merely because tags/similar-works/CLIP/reasoning-badge are empty — only the prose fields gate it
- [ ] Residual Layer3 content (tags, similar works, CLIP note, reasoning badge) still renders below the right-column sections in the collapsed single-column case, even when prose is absent
- [ ] JSON-LD includes `artism:editionClaimSummary` as derived strings only, never raw copy data
- [ ] JSON-LD includes `artism:componentCount` only when present and > 1

---

*Artwork Page — Layer Reorganization & Provenance/Editions Addendum · June 2026*
*Read alongside: artwork-page-directive.md, ownership-record-addendum.md, artist-archive-schema-final.md, master-schema-spec.md, design-system.md*
