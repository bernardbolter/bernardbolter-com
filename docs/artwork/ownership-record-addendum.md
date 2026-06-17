# Ownership Record — Addendum
## Tier 1 + Tier 2: honest provenance display and claim-to-contact flow
*June 2026 · addendum to artwork-page-directive.md and contact-page-spec.md*

---

## Overview

This addendum closes the loop between the "if you own this work, get in touch" prompt on an artwork page and the existing `ownershipHistory` field, and upgrades the Layer 4 provenance display from a single confidence statement to a full honest ownership timeline.

No new collections. No new Payload fields beyond what `artist-archive-schema-final.md` already defines (`ownershipHistory`, `provenanceOriginKnown`, `provenanceConfidenceLayer`, `currentLocation`). This is a display layer and a contact-flow change only.

**Out of scope (future):** owner-facing self-service update links (Tier 3), collector cataloguing sessions (Tier 4). Do not build toward these now — but do not do anything in this addendum that would make them harder to add later. The `ownershipHistory` array structure already accommodates a future `updateToken` field without migration.

---

## Part 1 — Claim-to-contact flow

### 1.1 Artwork page link

In Layer 4 (`Layer4History.tsx`), the unclaimed-owner appeal already exists per `artwork-page-directive.md`:

> "If you own this work, get in touch. I'll add you to the record and officially connect you to its history."

This text becomes a link: `/contact?claim=[artwork.slug]&title=[artwork.title]`

Both query params are URL-encoded. `title` is included so the contact form can show a human-readable confirmation without an extra fetch.

### 1.2 Contact form changes

**File:** `src/components/Contact/ContactForm.tsx`

On mount, read `claim` and `title` from `useSearchParams()` (Next.js client hook — already client component, no new dependency).

If `claim` is present:

- Pre-select the subject dropdown to `"I own one of your works"`
- Pre-fill the message textarea with: `I believe I own "[title]". `  — cursor placed at end so the person continues typing
- Render a small confirmation line above the form: `Regarding: [title]` — plain text, `text-sm`, `text-[var(--text-muted)]`
- Add a hidden field to the Formcarry payload: `artworkSlug: claim` — so the submission email includes the slug for direct lookup in the admin

If `claim` is absent, the form behaves exactly as currently specified — no change.

### 1.3 Do NOT

- Do not introduce `useArtworks` or fetch artwork data on the contact page — the `title` param carries everything needed for display
- Do not auto-submit
- Do not validate `claim` against real artwork slugs client-side — if the slug is wrong or stale, the email still arrives with the slug string, and you can check manually
- Do not make the subject field read-only when pre-filled — the person can change it if they got there by mistake

---

## Part 2 — Admin workflow (manual, documented — not built)

This is process documentation for Bernard, not a spec for Cursor. Include it in the spec file as a comment block or a short README section so it isn't lost.

When a claim email arrives:

1. Open the artwork record in Payload admin using the `artworkSlug` from the email
2. Add a new entry to `ownershipHistory`:
   - `displayName` — what they want shown (default "Private collection" if they prefer)
   - `city` — if shared
   - `dateAcquired` — their stated acquisition date (approximate is fine)
   - `claimStatus: 'claimed-pending'`
   - `collectorVisible` — `false` until you've corresponded enough to be comfortable, then set `true`
   - `notes` — private notes on how the claim was verified (correspondence, photos of the work in situ, etc.)
3. Once comfortable the claim is genuine, update `claimStatus: 'claimed-confirmed'`
4. If this entry represents the *current* owner, ensure no `dateRelinquished` is set and `currentLocation` is updated to `'private collection'` with `locationDetail` if relevant
5. If an earlier entry in `ownershipHistory` represents the previous holder (e.g. the artist's studio), set its `dateRelinquished` to match this entry's `dateAcquired`

There is no system validation enforcing chain continuity — this is editorial judgement. `provenanceConfidenceLayer` can optionally record the evidence basis for this specific claim if Bernard wants it documented (`evidenceBasis: "Email correspondence, [date]"`, `confidenceLevel: 'credible-inference'` or `'documented-fact'` depending on how it was verified).

---

## Part 3 — Layer 4 display rewrite

**File:** `src/components/artwork/Layer4History.tsx`

Replace the current single confidence-statement provenance section with the following structure. Exhibition history and work state sections are unchanged from `artwork-page-directive.md`.

### 3.1 Section: Ownership

Always rendered if `ownershipHistory` has at least one entry with `collectorVisible: true`, OR if `provenanceOriginKnown === false` (so the honesty statement still shows even with zero visible entries), OR if `currentLocation === "artist's studio"` (so "currently in the artist's studio" can be shown even with empty `ownershipHistory`).

If none of these conditions are true, render nothing for this section — not even a placeholder.

#### 3.1.1 Current holder line

Computed, not stored. Logic:

- If `currentLocation === "artist's studio"` → "Currently in the artist's studio, Berlin" (or `locationDetail` if more specific)
- Else, find the `ownershipHistory` entry with no `dateRelinquished` set:
  - If `collectorVisible === true` → `"Currently held by [displayName], [city] · since [dateAcquired year]"` — omit `, [city]` if city is empty
  - If `collectorVisible === false` or no such entry exists → `"Currently in a private collection"` (generic, no details)
- If `currentLocation === 'on loan'` → append " · currently on loan" to whichever line above applies

Styling: this line is the most prominent element in the Ownership section — `text-base`, `font-medium`, `var(--color-text-primary)`.

#### 3.1.2 Ownership timeline

Condition: render only if there are **two or more** `ownershipHistory` entries total (visible or not) — a single current holder doesn't need a "timeline", just the line above. With two or more entries, the chain becomes meaningful.

For each entry, in chronological order (oldest first):

- If `collectorVisible === true`: render a row — `[displayName] · [city] · [dateAcquired]–[dateRelinquished or "present"]`
- If `collectorVisible === false`: render a row — `Private collection · [dateAcquired]–[dateRelinquished or "present"]` (no name, no city — `displayName` and `city` are not read for non-visible entries even if populated)
- Studio origin: if the first entry's implicit predecessor is the artist's studio (i.e. `dateAcquired` of the first entry is after `yearCreated`), prepend a row: `Artist's studio · [yearCreated]–[first entry's dateAcquired]`

Each row styled as a simple list item — small text, `var(--color-text-secondary)`, with a vertical connecting line between rows (a simple `border-left` on a wrapping div) to suggest a chain.

#### 3.1.3 Origin honesty statement

Condition: render only if `provenanceOriginKnown === false`.

A single line, styled distinctly (slightly more muted, possibly italic): "The early history of this work's ownership is not fully documented." Placed *above* the timeline — if the timeline starts partway through the chain, this statement explains why before the reader gets there.

#### 3.1.4 Unclaimed appeal

Condition: render only if there exists an `ownershipHistory` entry with `claimStatus: 'unclaimed'` AND no `dateRelinquished` (i.e. it's the current state, not historical).

The existing copy, now as a link per Part 1.1:

> "If you own this work, [get in touch](/contact?claim=...&title=...). I'll add you to the record and officially connect you to its history."

Placed after the timeline (or after the current holder line, if no timeline is shown).

### 3.2 Section: Loan history

Unchanged from `artwork-page-directive.md` — condition: render only if `loanHistory` is non-empty.

### 3.3 Section: Work state

Unchanged from `artwork-page-directive.md`.

---

## Part 4 — Visual notes

- The Ownership section sits where the old "Provenance" section was — first in Layer 4's left column (or full-width if exhibition history is short — use judgement based on actual content length)
- The connecting line on the timeline rows should use the series colour at low opacity, consistent with the rest of the page's use of series colour as a quiet structural signal
- Do not use icons for ownership entries — text only, consistent with the restrained register of Layer 4
- The current holder line and the timeline together should read as a continuous story, not as two separate UI elements — minimal visual separation between them

---

## Part 5 — Do NOT (consolidated)

- Do not show `ownerPrivate`, sale price, `transactionId`, or any `salesRecord` field — ever, under any condition
- Do not show `displayName` or `city` for entries where `collectorVisible === false`
- Do not render a timeline that implies completeness when `provenanceOriginKnown === false` — the honesty statement must appear first
- Do not show the unclaimed appeal if the work is currently in the artist's studio (no ownership gap to fill)
- Do not build any owner-facing update mechanism in this pass — Tier 3, future work
- Do not add new Payload fields — everything needed already exists in `ownershipHistory`, `provenanceOriginKnown`, `currentLocation`

---

## Verification checklist

- [ ] `/contact?claim=slug&title=Title` pre-selects "I own one of your works" and pre-fills the message
- [ ] Hidden `artworkSlug` field included in Formcarry payload when `claim` param present
- [ ] Contact page behaves identically to current spec when no `claim` param present
- [ ] Current holder line correct for: artist's studio / visible single owner / private (non-visible) owner / on loan
- [ ] Timeline renders only with 2+ `ownershipHistory` entries
- [ ] Timeline correctly omits `displayName`/`city` for non-visible entries
- [ ] Origin honesty statement appears when `provenanceOriginKnown === false`, placed above timeline
- [ ] Unclaimed appeal links to `/contact?claim=...` with correct slug and title
- [ ] Unclaimed appeal does not show when work is in artist's studio
- [ ] No private fields (`ownerPrivate`, `salesRecord`, sale prices) appear in any rendered output or page source

---

*Ownership Record Addendum · June 2026*
*Read alongside: artwork-page-directive.md, contact-page-spec.md, artist-archive-schema-final.md*
