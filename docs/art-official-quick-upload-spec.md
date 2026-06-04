# Art/Official — Quick Upload & Unreasoned Queue
## Spec for Cursor implementation
*June 2026 — addendum to art-official-handoff.md*

---

## Overview

This document specifies two additions to the Art/Official UI:

1. **Quick Upload** — a no-AI intake form for getting artwork records into the CMS fast, with optional pre-population from a WordPress JSON export
2. **Unreasoned Queue** — a persistent list of all artworks that have not yet had a full Art/Official dialogue session, with direct launch into the full session from each row

These live inside the existing Art/Official custom Payload view at `/admin/art-official` as additional tabs alongside the existing session interface. No new routes are needed.

---

## Schema addition required first

Before building either UI, add one field to the Artworks collection config in `src/collections/Artworks.ts`:

```ts
{
  name: 'reasoningStatus',
  type: 'select',
  defaultValue: 'stub',
  options: [
    { label: 'Stub — quick upload only', value: 'stub' },
    { label: 'Partial — some sessions completed', value: 'partial' },
    { label: 'Complete — full Art/Official session done', value: 'complete' },
  ],
  admin: {
    position: 'sidebar',
    description: 'Tracks how deeply this artwork has been catalogued through Art/Official.',
  },
}
```

This field is set automatically by the system — never by the artist directly. Quick Upload sets it to `stub`. A completed full Art/Official session sets it to `complete`. The field is visible in the standard Payload admin sidebar for reference.

---

## Tab structure

The Art/Official view gains a tab bar at the top with three tabs:

| Tab | Label | Route state |
|---|---|---|
| 1 | Quick Upload | `?tab=upload` |
| 2 | Unreasoned Queue | `?tab=queue` |
| 3 | Session | `?tab=session` (existing UI) |

Tab state is managed via URL query param so that refreshing the page returns to the correct tab. Default tab on first load is **Queue** — this is the home screen of Art/Official.

---

## Tab 1 — Quick Upload

### Purpose

Fast intake of artwork records with no AI involved. Target: under 3 minutes per artwork. Creates a `published` Artworks record with `reasoningStatus: stub`.

### WordPress import

The Payload project contains a WordPress JSON export file. The agent (Cursor) must locate this file — it will be in the project directory, likely named something like `wordpress-export.json` or similar. Inspect its structure to understand the field mapping below.

At the top of the Quick Upload tab, render a toggle:

> ☐ Pre-populate from WordPress export

When toggled on, a searchable dropdown appears, populated from the WordPress JSON file. The dropdown is loaded once on component mount — read the JSON file via a Next.js API route at `/api/art-official/wordpress-import` that reads the file from the filesystem and returns the parsed artwork list. Do not bundle the JSON into the client.

The dropdown displays each entry as: **Title — Year** (e.g. `Gates VII — 2019`). It is searchable by title. On selection, the form fields below auto-populate with the mapped values (see mapping section). The artist reviews and corrects before submitting.

### WordPress field mapping

The WordPress JSON structure is unknown at spec time — Cursor must inspect the actual file. The general mapping intent is:

| WordPress field (inspect file for exact key) | Target Payload field | Notes |
|---|---|---|
| Post title / artwork title | `title` | Direct map |
| Year / date field | `yearCreated` | Extract year integer if stored as full date |
| Medium / material taxonomy or field | `medium` | Map to nearest select option; leave blank if no match |
| Width dimension | `widthCm` | Parse numeric value; handle unit conversion if stored as inches |
| Height dimension | `heightCm` | Parse numeric value; handle unit conversion if stored as inches |
| Category / series taxonomy | `series` | Match to existing Series records by name; leave blank if no match |
| Featured image URL | displayed as reference only | Not uploaded automatically — shown so artist knows which image to drop in |

**If a WordPress field value cannot be confidently mapped to a Payload select option, leave the field blank.** Do not guess. The artist will fill it in. A blank field is better than a wrong one.

After mapping, always show the pre-populated form in full so the artist can review every field before submitting. Never auto-submit.

### Form fields

All fields below are shown regardless of whether WordPress import is used.

| Field | Type | Required | Notes |
|---|---|---|---|
| Primary image | File drop / upload | Yes | Standard Payload image upload. Accepted formats: JPG, PNG, TIFF. |
| WordPress reference image | URL display only | No | Shown when a WordPress record is selected. Read-only — shows the old image URL so the artist knows what to upload. Hidden when no WordPress record selected. |
| Title | Text input | Yes | — |
| Year created | Number input | Yes | Four-digit year. |
| Year completed | Number input | No | Only shown if work spans multiple years. Toggle to reveal: "Work spans multiple years". |
| Series | Relation select | Yes | Fetched from existing Series collection via `/api/series`. Searchable dropdown. |
| Medium | Select | Yes | Must use the same select options defined in the Artworks collection `medium` field. Do not use free text. |
| Width | Number + unit select | Yes | Number field + unit toggle (cm / in). Stored as `widthCm` — convert from inches if needed (× 2.54). |
| Height | Number + unit select | Yes | Same as width. Stored as `heightCm`. |
| Depth | Number + unit select | No | Optional. Same pattern. |
| Availability | Select | Yes | Options: `not for sale` (default) / `available` / `sold` / `on loan`. |

**Auto-derived fields** (computed in the browser on width/height input, shown as read-only confirmation before submit):

- `orientation` — if width > height: `landscape`; height > width: `portrait`; equal: `square`
- `sizeTier` — derived from the larger of width/height in cm:
  - < 30cm → `sm`
  - 30–80cm → `md`
  - 80–150cm → `lg`
  - > 150cm → `xl`
- `aspectRatio` — widthCm ÷ heightCm, rounded to 4 decimal places

These three fields are shown to the artist as confirmation ("This work will display as: **landscape · lg**") with an override option for each. The artist can change any derived value before submitting.

### Submit behaviour

On submit:

1. Validate all required fields are present
2. Upload the primary image to Payload's media collection first; get back the media document ID
3. Call `POST /api/artworks` (Payload local API) with the assembled record:
   - All form fields as mapped above
   - `status: 'published'`
   - `reasoningStatus: 'stub'`
   - `primaryImage`: the media document ID from step 2
4. On success: show confirmation with a link to the new record in the standard Payload admin, and a "Add another" button that clears the form (retaining the series selection, since consecutive uploads are likely in the same series)
5. On error: show the error message inline; do not clear the form

No confirmation step is needed — this is a fast intake form, not a session. The artist is reviewing the fields in the form itself before hitting submit.

---

## Tab 2 — Unreasoned Queue

### Purpose

A persistent list of all artworks with `reasoningStatus: stub` or `reasoningStatus: partial`. This is the gateway to the full Art/Official session — the artist works through the queue over time, deepening the record for each work.

### Data fetch

On mount, fetch from Payload:

```
GET /api/artworks?where[reasoningStatus][in][]=stub&where[reasoningStatus][in][]=partial&limit=200&sort=-yearCreated
```

Refresh the list whenever the tab is activated (not only on mount) so that records completed in another tab disappear from the queue.

### Layout

A table/list with the following columns:

| Column | Source | Notes |
|---|---|---|
| Thumbnail | `primaryImage` (thumbnail size) | 48×48px, aspect-ratio preserved, not cropped |
| Title | `title` | — |
| Year | `yearCreated` | — |
| Series | `series.title` | — |
| Status | `reasoningStatus` | Shown as a pill: grey = stub, amber = partial |
| Missing | Computed | Count of key intent fields that are blank (see below) |
| Action | — | "Begin session" button |

**Missing field count** — count how many of these fields are blank on the record: `intent`, `artHistoricalContext`, `seriesContext`, `consciousRejections`, `formalContributionAssessment`. Display as e.g. "5 fields unwritten" or "2 fields unwritten". This gives the artist a sense of how much work remains per artwork at a glance.

### Filtering and sorting

Above the list, provide:

- **Series filter** — dropdown of all series with counts (e.g. "Gates (12)", "Painted Fields (8)"). Default: All.
- **Status filter** — All / Stub only / Partial only
- **Sort** — Year (newest first, default) / Year (oldest first) / Series / Missing fields (most first)

### Begin session

Clicking "Begin session" on any row:

1. Switches to the Session tab (`?tab=session`)
2. Pre-loads that artwork's existing record into the session — image already shown, existing fields already populated in the sidebar panel, conversation starts with the agent already briefed on what's known

The session tab must accept an `artworkId` parameter to support this. When launched from the Queue, the agent's opening turn should acknowledge the existing record: it already knows the physical facts and should move directly to intent and context questions rather than repeating the intake process.

When a full session is completed and the record is confirmed, the system sets `reasoningStatus: 'complete'` on the artwork. The artwork then disappears from the queue on next refresh.

### Empty state

When the queue is empty: display "All artworks have been fully catalogued." with a prompt to use Quick Upload to add new works.

---

## API routes required

| Route | Method | Purpose |
|---|---|---|
| `/api/art-official/wordpress-import` | GET | Reads WordPress JSON file from filesystem, returns parsed array of `{ id, title, year, medium, widthCm, heightCm, seriesName, featuredImageUrl }`. File path should be configurable via environment variable `WORDPRESS_EXPORT_PATH`. |
| `/api/series` | GET | Returns all Series records (`id`, `title`, `slug`). Used to populate the series dropdown in Quick Upload. May already exist — check before creating. |

The WordPress import route reads the file server-side only. The raw JSON file is never sent to the client — only the parsed, mapped array.

---

## What NOT to do

- ✗ Do not use AI in Quick Upload. No Anthropic API calls, no model, no inference. This is a form.
- ✗ Do not auto-submit after WordPress pre-population. Always require the artist to review and click submit.
- ✗ Do not guess at WordPress field mappings. If a value cannot be cleanly mapped to a Payload select option, leave the field blank.
- ✗ Do not crop thumbnail images in the Queue to fill a fixed square. Preserve aspect ratio.
- ✗ Do not set `sizeTier` or `orientation` without showing them to the artist for confirmation before submit.
- ✗ Do not remove an artwork from the Queue until `reasoningStatus` is confirmed as `complete` in the database — not just locally in UI state.
- ✗ Do not normalise image display anywhere. The `sizeTier` and `orientation` fields drive layout on the public site and must be accurate.

---

## Files to create or modify

| File | Action | Notes |
|---|---|---|
| `src/collections/Artworks.ts` | Modify | Add `reasoningStatus` field |
| `src/app/(admin)/art-official/page.tsx` | Modify | Add tab bar; route tab state via URL query param |
| `src/app/(admin)/art-official/QuickUpload.tsx` | Create | Quick Upload tab component |
| `src/app/(admin)/art-official/UnreasonedQueue.tsx` | Create | Queue tab component |
| `src/app/api/art-official/wordpress-import/route.ts` | Create | Server-side WordPress JSON reader |

---

*Addendum to art-official-handoff.md — June 2026*
*Read alongside: artist-archive-schema-final.md, cursor-implementation-plan-final.md*
