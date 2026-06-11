# Events — Quick Intake, Unreasoned Queue & Updated Collection Fields
## Spec for Cursor implementation
*June 2026 — companion to art-official-quick-upload-spec.md and artist-archive-schema-final.md*

---

## Overview

This document specifies three things:

1. **Schema additions** — new and updated fields for the Events collection, incorporating all decisions from the June 2026 design session (coExhibitors upgrade, venue additions, performance/talk/screening type-specific fields, identity/verification fields)
2. **Quick Event Intake** — a fast intake form for adding events to the CV with minimal fields, no AI, no page published
3. **Unreasoned Events Queue** — a persistent list of events that haven't been fully built out, with the page link inactive until enriched

These additions live inside a new **Events** tab in the Art/Official custom Payload view at `/admin/art-official`, alongside the existing Artworks tabs.

---

## Part 1 — Events Collection Schema Additions

These fields are additions and modifications to the existing Events collection in `src/collections/Events.ts`. Read `artist-archive-schema-final.md` Section 2 for the base schema. This document specifies only the delta.

---

### 1.1 New system field — `enrichmentStatus`

Add to the Events collection alongside the existing `status` field:

```ts
{
  name: 'enrichmentStatus',
  type: 'select',
  defaultValue: 'stub',
  options: [
    { label: 'Stub — CV only, no page', value: 'stub' },
    { label: 'Partial — some enrichment done', value: 'partial' },
    { label: 'Complete — full page ready', value: 'complete' },
  ],
  admin: {
    position: 'sidebar',
    description: 'Tracks how fully this event has been documented. Stub = CV line only. Complete = event page live.',
  },
}
```

This field is set automatically — never by the artist directly. Quick Intake sets it to `stub`. The event page link on the CV is only rendered when `enrichmentStatus: complete`. The field is visible in the standard Payload admin sidebar for reference.

---

### 1.2 New field — `hasPage`

```ts
{
  name: 'hasPage',
  type: 'checkbox',
  defaultValue: false,
  admin: {
    position: 'sidebar',
    description: 'When true, this event has a public page at /exhibitions/[slug]. Set automatically when enrichmentStatus is complete.',
    readOnly: true,
  },
}
```

Computed automatically: set to `true` when `enrichmentStatus` transitions to `complete`. Never set manually. The CV template reads this field to determine whether to render the title as a link or plain text.

---

### 1.3 Updated — `coExhibitors`

**Replace** the existing `coExhibitors: text[]` field with a structured array:

```ts
{
  name: 'coExhibitors',
  type: 'array',
  admin: {
    description: 'Other artists in this show. Name is required; URIs are optional and added over time.',
    condition: (data) => ['group-exhibition', 'art-fair'].includes(data.eventType),
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'role',
      type: 'text',
      admin: { description: 'Optional — e.g. painter, sculptor, video artist.' },
    },
    {
      name: 'ulanUri',
      type: 'text',
      admin: { description: 'Getty ULAN URI if the artist has one.' },
    },
    {
      name: 'wikidataUri',
      type: 'text',
      admin: { description: 'Wikidata entity URI if the artist has one.' },
    },
    {
      name: 'sameAs',
      type: 'array',
      fields: [{ name: 'uri', type: 'text' }],
      admin: { description: 'Other authoritative URIs for this person.' },
    },
  ],
}
```

---

### 1.4 New venue fields

Add to Section 2.4 (Venue and location):

| Field | Type | Layer | Status | Definition |
|---|---|---|---|---|
| `venueAddress` | text | artist | NEW | Plain text street address. Renders as `PostalAddress` in JSON-LD. Required when `hasPage` is true. |
| `venueLatLng` | object `{ lat: number, lng: number }` | artist | NEW | Coordinates for the map pin on the event page. |
| `sameAs` | text[] | artist | NEW | External URIs for this event — Wikidata, e-flux, institutional archive, etc. At least one required when `enrichmentStatus: complete`. |

---

### 1.5 New media fields

Add to the Events collection as a new section **2.6a — Media**:

| Field | Type | Layer | Status | Definition |
|---|---|---|---|---|
| `installationImages` | upload[] | artist | NEW | Documentation photos of the event — installation views, opening, performance. Distinct from artwork images. Each upload has `caption` and `altText` metadata fields. |
| `mediaLinks` | array | artist | NEW | Replaces single `recordingUrl`. Each: `{ url: text, type: select (video\|audio\|image-series\|livestream), label: text }`. |

Remove the existing single `recordingUrl` field and replace with `mediaLinks`.

---

### 1.6 New type-specific fields

Add to Section 2.8 (Type-specific fields). All gated on `eventType` in admin UI via Payload conditional logic.

**Performances** (`eventType: performance`)

| Field | Layer | Status | Definition |
|---|---|---|---|
| `performanceType` | artist | NEW | Select: `live` \| `durational` \| `participatory` \| `lecture-performance` \| `sound` \| `other`. |
| `duration` | artist | NEW | Text: `'45 minutes'`, `'3 hours'`. Renders as schema.org `duration`. |
| `collaborators` | artist | NEW | Array of `{ name: text (required), role: text (required — e.g. sound design, choreography, performer), ulanUri: text, wikidataUri: text }`. Semantically distinct from coExhibitors. |
| `programmeContext` | artist | NEW | Text. `'Part of Live Arts Berlin'`. Short contextual frame not captured by venue or organiser. |

**Talks and panels** (`eventType: talk-panel`)

| Field | Layer | Status | Definition |
|---|---|---|---|
| `eventFormatType` | artist | NEW | Text (free). `'Pecha Kucha (20×20)'`, `'keynote'`, `'symposium'`. Too varied to enumerate. |
| `slidesUrl` | artist | NEW | URL to slides if publicly available. |
| `coSpeakers` | artist | NEW | Array of `{ name: text, role: text, ulanUri: text, wikidataUri: text }`. Same pattern as collaborators. |

**Screenings** (`eventType: screening`)

| Field | Layer | Status | Definition |
|---|---|---|---|
| `festivalProgramme` | artist | NEW | Text. Which section or strand of the festival. |
| `screeningFormat` | artist | NEW | Select: `35mm` \| `digital` \| `video-installation` \| `online`. |
| `premiereStatus` | artist | NEW | Select: `world` \| `european` \| `national` \| `none`. |

---

### 1.7 New identity / verification fields

Add to the Artist singleton in `src/collections/Artist.ts`:

| Field | Type | Layer | Status | Definition |
|---|---|---|---|---|
| `canonicalDomain` | text | artist | NEW | Authoritative URL of this archive: `https://bernardbolter.com`. Machine-readable identity assertion. |
| `archivePublicKey` | text | artist | NEW | Public key for cryptographic attestation of published records. Nullable — populate when verification layer is implemented. Field shape is correct now so the `/.well-known/artist-archive.json` document is already future-proof. |

---

### 1.8 New API route — `/.well-known/artist-archive.json`

Create `src/app/.well-known/artist-archive.json/route.ts`.

This route reads from the Artist singleton at request time and returns:

```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Bernard Bolter",
  "url": "https://bernardbolter.com",
  "identifier": [
    { "@type": "PropertyValue", "propertyID": "ULAN", "value": "[ulanUri from Artist singleton]" },
    { "@type": "PropertyValue", "propertyID": "Wikidata", "value": "[wikidataUri from Artist singleton]" }
  ],
  "archiveVersion": "1.0",
  "publicKey": null
}
```

- Omit identifier objects where the URI field is null
- Set `Content-Type: application/json`
- No authentication required — this is a public identity document

---

## Part 2 — Quick Event Intake

### Purpose

Fast intake of event records for the CV with no AI. Target: under 2 minutes per event. Creates a published Events record with `enrichmentStatus: stub`. The event appears on the CV as a plain text line — no link, no page. The page is built later via the Unreasoned Events Queue.

### Location

New tab in the Art/Official view at `/admin/art-official`:

| Tab | Label | Route state |
|---|---|---|
| 1 | Quick Upload (Artworks) | `?tab=upload` (existing) |
| 2 | Unreasoned Queue (Artworks) | `?tab=queue` (existing) |
| 3 | Session | `?tab=session` (existing) |
| 4 | **Quick Event** | `?tab=event-intake` |
| 5 | **Events Queue** | `?tab=event-queue` |

---

### Quick Event form fields

All fields shown regardless of event type. Type-specific fields appear conditionally when `eventType` is selected.

**Always visible:**

| Field | Type | Required | Notes |
|---|---|---|---|
| Event type | Select | Yes | All 13 `eventType` values from the schema. Drives conditional fields below. |
| Title | Text | Yes | As it appears on the CV. |
| Year | Number | Yes | Four-digit year. Stored as `yearStart`. `startDate` set to Jan 1 of this year on submit — overridable when enriching later. |
| Venue name | Text | No | Required for exhibitions, fairs, talks. Optional for awards, publications, education. |
| City | Text | No | — |
| Country | Text | No | — |

**Conditional on `eventType`:**

| eventType | Additional required fields |
|---|---|
| `solo-exhibition` | — |
| `group-exhibition` | — |
| `art-fair` | — |
| `award` | Award granting organisation (text), Outcome (select: winner \| shortlisted \| nominated \| honourable-mention) |
| `residency` | Organisation (text) |
| `publication` | Publication title (text), Author if not Bernard (text) |
| `bibliography` | Author (text, required), Publication title (text) |
| `talk-panel` | Event format type (text — e.g. `'Pecha Kucha (20×20)'`) |
| `screening` | Premiere status (select) |
| `performance` | Performance type (select) |
| `education` | Institution (text, required), Degree (text), Subject (text) |
| `public-commission` | Commission client (text), Commission site (text) |
| `other` | Custom type label (text) |

### Submit behaviour

On submit:

1. Validate required fields
2. Set `startDate` to `[yearStart]-01-01` (first of January of the entered year) — a placeholder overridable during enrichment
3. Call `POST /api/events` with assembled record:
   - All form fields mapped to collection fields
   - `status: 'published'`
   - `enrichmentStatus: 'stub'`
   - `hasPage: false`
4. On success: confirmation with link to the new record in Payload admin, and a "Add another" button that clears the form but retains the `eventType` selection (consecutive entries are often the same type)
5. On error: show error inline; do not clear the form

No confirmation step required — the artist reviews fields in the form before submitting.

---

## Part 3 — Unreasoned Events Queue

### Purpose

A persistent list of all events with `enrichmentStatus: stub` or `partial`. This is where the artist builds out event pages over time — adding venue details, installation images, co-exhibitor URIs, `descriptionLong`, `artistNote`, and `sameAs` URIs. When an event is fully enriched and marked complete, `hasPage` flips to `true` and the CV link becomes active.

### Data fetch

On mount, fetch:

```
GET /api/events?where[enrichmentStatus][in][]=stub&where[enrichmentStatus][in][]=partial&limit=200&sort=-yearStart
```

Refresh list whenever tab is activated.

### Layout

A table with columns:

| Column | Source | Notes |
|---|---|---|
| Event type | `eventType` | Shown as a pill with short label: Solo, Group, Talk, etc. |
| Title | `title` | — |
| Year | `yearStart` | — |
| Venue | `venueName` + `venueCity` | Shown as `Venue, City` |
| Status | `enrichmentStatus` | Pill: grey = stub, amber = partial |
| Missing | Computed | Count of page-required fields that are blank (see below) |
| Action | — | "Enrich" button — opens the full Payload admin record |

**Missing field count** — count how many of these are blank: `descriptionLong`, `artistNote`, `installationImages` (empty array), `sameAs` (empty array), `venueAddress`, `venueLatLng`. Display as e.g. `'6 fields needed'` or `'2 fields needed'`.

### Filtering and sorting

Above the list:

- **Type filter** — dropdown of all event types with counts. Default: All.
- **Status filter** — All / Stub only / Partial only
- **Sort** — Year (newest first, default) / Year (oldest first) / Type / Missing (most first)

### Mark as complete

When an event is sufficiently enriched, the artist opens the full Payload admin record and manually sets `enrichmentStatus: complete`. A Payload `afterChange` hook then sets `hasPage: true` automatically.

The CV page re-queries on each request, so the link appears on the live site without any further action.

**Required fields before `enrichmentStatus: complete` is accepted** — enforce via Payload validation:

- `descriptionLong` must be non-empty
- `sameAs` must have at least one URI (for exhibitions, fairs, talks, performances — not required for awards, education, bibliography)
- `venueAddress` must be non-empty (for event types with a physical venue)

If validation fails, show an inline error listing which fields are still needed.

### Empty state

When the queue is empty: display "All events have been fully documented." with a prompt to use Quick Event to add new entries.

---

## Part 4 — CV page link behaviour

The CV template renders event titles as either linked or plain text based on `hasPage`:

```
hasPage: false  →  plain text title  (stub or partial)
hasPage: true   →  <a href="/exhibitions/[slug]">title</a>
```

This applies across all event types. A talk, performance, screening, or residency all get a page and a link when fully enriched — not just exhibitions.

The `/exhibitions/[slug]` route handles all event types, not just exhibitions. The route name is for URL cleanliness; the template renders conditionally based on `eventType`.

---

## Part 5 — What NOT to do

- ✗ Do not use AI in Quick Event Intake. No Anthropic API calls. This is a form.
- ✗ Do not render `hasPage: true` until `enrichmentStatus` is confirmed `complete` in the database — not just in UI state.
- ✗ Do not auto-submit after form population. Always require the artist to click submit.
- ✗ Do not set `hasPage` directly from the admin UI — only via the `afterChange` hook on `enrichmentStatus`.
- ✗ Do not remove an event from the Events Queue until `enrichmentStatus: complete` is confirmed in the database.
- ✗ Do not create a separate page template per event type. One `/exhibitions/[slug]` template with conditional section rendering based on `eventType`.
- ✗ Do not show the map section if `venueLatLng` is null.
- ✗ Do not show the installation images section if `installationImages` array is empty.
- ✗ Do not require `sameAs` for `education`, `award`, or `bibliography` entries — they rarely have external event records.

---

## Part 6 — Files to create or modify

| File | Action | Notes |
|---|---|---|
| `src/collections/Events.ts` | Modify | Add `enrichmentStatus`, `hasPage`, `venueAddress`, `venueLatLng`, `sameAs`, `installationImages`, `mediaLinks`, updated `coExhibitors`, all type-specific new fields. Replace `recordingUrl` with `mediaLinks`. |
| `src/collections/Artist.ts` | Modify | Add `canonicalDomain`, `archivePublicKey`. |
| `src/app/(admin)/art-official/page.tsx` | Modify | Add Event Intake and Events Queue tabs to tab bar |
| `src/app/(admin)/art-official/QuickEventIntake.tsx` | Create | Quick Event Intake tab component |
| `src/app/(admin)/art-official/UnreasonedEventsQueue.tsx` | Create | Events Queue tab component |
| `src/app/.well-known/artist-archive.json/route.ts` | Create | Public identity document endpoint |
| `src/app/exhibitions/[slug]/page.tsx` | Create | Single event page template — conditional sections based on `eventType` |

---

## Part 7 — Verification checklist

Before marking this implementation complete, verify:

- [ ] `enrichmentStatus` field exists on Events with three values; defaults to `stub`
- [ ] `hasPage` field is read-only in admin UI; set only by `afterChange` hook
- [ ] `coExhibitors` is a structured array (not `text[]`); gated on group/fair event types
- [ ] `mediaLinks` array exists; `recordingUrl` is removed
- [ ] `installationImages` upload array exists with per-item `caption` and `altText`
- [ ] `venueAddress`, `venueLatLng`, `sameAs` fields exist on Events
- [ ] Performance, talk, screening type-specific fields exist and are correctly gated
- [ ] `collaborators` and `coSpeakers` arrays exist with correct structure
- [ ] `canonicalDomain` and `archivePublicKey` exist on Artist singleton
- [ ] `/.well-known/artist-archive.json` route returns correct JSON from live Artist record
- [ ] Quick Event Intake tab renders at `?tab=event-intake`; creates events with `enrichmentStatus: stub`, `hasPage: false`
- [ ] Events Queue tab renders at `?tab=event-queue`; shows only stub/partial events; refreshes on tab activation
- [ ] CV template renders title as plain text when `hasPage: false`, as link when `hasPage: true`
- [ ] Event page at `/exhibitions/[slug]` renders map only when `venueLatLng` is present
- [ ] Event page renders installation images only when `installationImages` is non-empty
- [ ] Validation blocks `enrichmentStatus: complete` if `descriptionLong` is empty or (for venue events) `venueAddress` is empty

---

*June 2026 — companion to art-official-quick-upload-spec.md and artist-archive-schema-final.md*
*Read alongside: artist-archive-schema-final.md Section 2, cursor-implementation-plan-final.md*
