# Statement Page — JSON-LD & Related Works Addendum
## bernardbolter.com · `/statement` · June 2026

*Addendum to `statement-page-redesign-spec.md`. Read that spec first — this one assumes its component structure (`Statement.tsx`, `StatementProse`, `StatementPhotoSequence`, `StatementClosing`) and inserts one new section plus a JSON-LD generator. Also read `master-schema-spec.md` Section 1.10 (Artworks JSON-LD shape, especially 10a/10f for the `creator` Person object and video fields) — the Statement page JSON-LD reuses those same typed objects rather than inventing new ones.*

---

## Part 0 — What this adds

Two things, related but separate:

1. **A "Related works" section** — the artist selects specific artwork records (e.g. the three-part video documenting the SFMOMA action) and they render as a short linked list near the bottom of the page, each with optional context text. This is editorial curation, not an automated "works mentioning this series" query.
2. **JSON-LD for the Statement page** — currently the page emits none. This generates a `CreativeWork` block representing the statement itself, authored by the same typed `Person` object used elsewhere, with `mentions` pointing at the related works from (1). This is what lets an AI system reasoning over the archive connect "the statement that explains the SFMOMA story" directly to "the video artworks that document it" without having to infer the connection from prose alone.

---

## Part 1 — Schema additions

### 1.1 Related works field on Artist singleton

```ts
{
  name: 'statementRelatedWorks',
  type: 'array',
  admin: {
    description: 'Artworks referenced directly in the artist statement — e.g. a video series documenting an event described in the text. Order here is display order. This is manual curation, not an automated query — only add works the statement actually refers to.',
  },
  fields: [
    {
      name: 'artwork',
      type: 'relationship',
      relationTo: 'artworks',
      required: true,
      filterOptions: {
        status: { equals: 'published' },
      },
    },
    {
      name: 'note',
      type: 'text',
      localized: true,
      admin: {
        description: 'Optional short context line shown next to the link, e.g. "Part I — the installation" or "Part III — the museum\'s response". Leave blank to show just the artwork title and year with no extra line.',
      },
    },
  ],
}
```

`filterOptions` restricts the relationship picker to published artworks only — no linking to drafts or unpublished stubs from a public page.

**Do NOT** restrict this field to video works only at the schema level. The current use case is a three-part video series, but the field should work identically for a painting, a photograph, or any other artwork type the statement might reference in future. Type-specific rendering (e.g. a video icon) happens in the component, not the schema.

---

## Part 2 — Component: StatementRelatedWorks

**File:** `src/components/Statement/StatementRelatedWorks.tsx`

**Position in page:** between `StatementPhotoSequence` and `StatementClosing` (see `statement-page-redesign-spec.md` Part 2.3). Reasoning: `StatementClosing` is the page's deliberate full-stop — the thesis line landing as the last thing on the page. A reference list after that would undercut the ending. Related works sits as the last *content* section; the closing block remains the last thing the reader sees.

**Condition:** render only if `statementRelatedWorks` has at least one entry.

```tsx
function StatementRelatedWorks({ items }: { items: StatementRelatedWork[] }) {
  if (!items.length) return null
  return (
    <section className="statement-related-works">
      <h3>Related works</h3>
      <ul>
        {items.map(({ artwork, note }) => (
          <li key={artwork.id}>
            <Link href={`/${artwork.slug}`}>
              <Image src={artwork.posterImage.url} alt={artwork.posterImageAltText || ''} />
              <span className="title">{artwork.title}{artwork.yearCreated ? `, ${artwork.yearCreated}` : ''}</span>
            </Link>
            {note && <span className="note">{note}</span>}
          </li>
        ))}
      </ul>
    </section>
  )
}
```

**Styling:**
- `h3`: same small-caps/label treatment as other minor section headers on the site (match the existing pattern used for section labels elsewhere — do not invent a new heading style)
- List items lay out as a simple horizontal row of compact cards on `m:`+ (thumbnail + title stacked, note below), single column stacked below `m:`
- Thumbnail: small, fixed aspect ratio (use `posterImage`, not the artwork's full-size `primaryImage` — this is a reference link, not an artwork display, so the size-tier/orientation rules from `artwork-page-directive.md` do **not** apply here)
- `note` renders in the same italic/muted caption style as the photo captions in `StatementPhotoSequence`, for visual consistency within the page — reuse that CSS class rather than redefining it
- Whole card is one tap target (link wraps thumbnail + title); `note` is not part of the link

**Do NOT:**
- Do not use the artwork-browsing grid's size-tier display logic here — these are small reference thumbnails, not a representation of physical scale
- Do not auto-populate this section from any tag, series, or date-proximity query — manual curation only, per the field's `admin.description`
- Do not show unpublished or draft artworks even if `relationTo: 'artworks'` would technically allow selecting one in admin (the `filterOptions` in Part 1.1 prevents this at the picker level, but also don't add a second check here that could mask a real misconfiguration — if a draft slips through, it should be visibly wrong in admin, not silently hidden on the front end)

---

## Part 3 — JSON-LD

**File:** `src/utilities/generateStatementJsonLd.ts`, injected via `generateMetadata` in `app/(public)/statement/page.tsx`.

### 3.1 Why `CreativeWork`, not `Person`

The Bio page already emits the primary `Person` entity for the site (`bio-page-spec.md` Part 4 — "the one place on the site where the Person is the primary subject"). The Statement page shouldn't duplicate that. Instead it emits a `CreativeWork` representing the statement document itself — authored by the Person, referencing the artworks it discusses. This mirrors how an `Article` or `Review` would be modeled in schema.org: the document is the primary entity, the person is its `author`.

### 3.2 Full output shape

```json
{
  "@context": {
    "@vocab": "https://schema.org/",
    "artism": "https://artism.org/schema/"
  },
  "@type": "CreativeWork",
  "@id": "https://bernardbolter.com/statement#statement",
  "name": "Artist statement — Bernard Bolter",
  "genre": "Artist statement",
  "url": "https://bernardbolter.com/statement",
  "inLanguage": "en",
  "author": {
    "@type": "Person",
    "name": "Bernard Bolter",
    "url": "https://bernardbolter.com/bio",
    "identifier": [
      { "@type": "PropertyValue", "propertyID": "ULAN", "value": "[artist.ulanUri]" },
      { "@type": "PropertyValue", "propertyID": "Wikidata", "value": "[artist.wikidataUri]" }
    ]
  },
  "text": "[full plain-text extraction of statementFull richText]",
  "abstract": "[statementShort]",
  "dateModified": "[statementLastRevised — new field, see 3.3]",
  "mentions": [
    {
      "@type": "[VideoObject if artwork.primaryMediaType === 'video', else VisualArtwork]",
      "name": "[artwork.title]",
      "url": "https://bernardbolter.com/[artwork.slug]"
    }
  ]
}
```

### 3.3 New field required: `statementLastRevised`

There's currently no field tracking when the statement text was last meaningfully edited (Payload's auto `updatedAt` on the singleton would be wrong — it updates on *any* Artist record change, not just the statement). Add:

```ts
{
  name: 'statementLastRevised',
  type: 'date',
  admin: {
    description: 'Set manually when the artist statement text itself is meaningfully revised — not auto-updated, since this singleton holds many unrelated fields. Drives JSON-LD dateModified for the statement page only.',
  },
},
```

**Do NOT** wire this to Payload's automatic `updatedAt` hook — it would fire on unrelated edits (e.g. adding a bio photo) and produce a false signal that the statement changed when it didn't.

### 3.4 `mentions` array construction

Built directly from `statementRelatedWorks` (Part 1.1) — same field drives both the visible UI list and this JSON-LD array, so there's exactly one place to edit when the related works change.

```ts
const mentions = (artist.statementRelatedWorks ?? []).map(({ artwork }) => ({
  '@type': artwork.primaryMediaType === 'video' ? 'VideoObject' : 'VisualArtwork',
  name: artwork.title,
  url: `https://bernardbolter.com/${artwork.slug}`,
}))
```

This is intentionally a minimal stub reference (name + url only) — the full `VideoObject`/`VisualArtwork` JSON-LD for each artwork already exists on that artwork's own page per `master-schema-spec.md` Section 1.10. Don't duplicate fields like `duration`, `dateCreated`, or `creator` here; that's what the artwork page's own JSON-LD is for. `mentions` exists purely to make the relationship machine-readable from the statement side.

### 3.5 `text` field — full plain-text extraction

Unlike most JSON-LD on this site, which favors short computed strings, `text` here should carry the **full** plain-text content of `statementFull` (richText converted to plain text, stripping formatting but keeping paragraph breaks as `\n\n`). This is a deliberate exception, consistent with the project's broader goal of machine-readable, semantically rich artist records for AI systems reasoning over the corpus (see `system-philosophy-and-art-history.md`) — the statement is one of the highest-value documents in the archive for that purpose, and truncating it to a snippet would work against the project's own goal.

**Do NOT** apply this same full-text treatment to other JSON-LD `text`/`description` fields sitewide without a specific reason — artwork `description` fields, for instance, stay short per `master-schema-spec.md`'s existing pattern. This exception is scoped to the Statement page only.

### 3.6 Do NOT

- Do not emit a second `Person` block as a top-level entity on this page — `author` is a nested reference, not a duplicate primary subject
- Do not include `ownershipHistory`, pricing, or any other private artwork fields in the `mentions` stubs — name and url only
- Do not auto-generate `mentions` from anything other than `statementRelatedWorks` — no keyword matching against artwork titles in the prose
- Do not skip the `statementLastRevised` field and fall back to the singleton's `updatedAt` — see 3.3

---

## Part 4 — The SFMOMA action as structured data

The statement narrates a specific event — the 1996 unauthorized installation at SFMOMA. That deserves its own machine-readable identity, not just prose. The right home for it is the existing **Events collection** (`master-schema-spec.md` Section 2), not a one-off object hand-built only for the statement page. Giving it a real Event record means: it gets a stable `@id`, the three video artworks can relate to it via the existing `Artworks.events` relation (already in schema, see `master-schema-spec.md` Phase 1 Step 8), and any future event — a write-up, an institutional inquiry, a retrospective — can point at the same node instead of re-describing it from scratch.

### 4.1 Event type

None of the existing 13 `eventType` values (`solo-exhibition`, `group-exhibition`, `art-fair`, `residency`, `award`, `publication`, `bibliography`, `public-commission`, `talk-panel`, `screening`, `performance`, `education`, `other`) accurately describes an unsanctioned installation in a museum's exterior space. Forcing it into `performance` implies a live/durational performance piece, which this wasn't — it was an object placed, then later discovered and removed by staff.

**Recommendation: use `other` with `eventTypeCustom: 'Unauthorized installation'`.** This is the honest description, consistent with the project's general principle of not bending a record to fit a cleaner category than the facts support (`master-schema-spec.md`'s `eventType` table is descriptive, not prescriptive — `other` exists for exactly this case). If a future spec introduces a dedicated `intervention`/`unauthorized-action` eventType because more events like this get catalogued, this record can be migrated then — don't add a new enum value for a single record now.

### 4.2 Record fields

```ts
{
  title: 'Unauthorized installation, SFMOMA exterior',
  eventType: 'other',
  eventTypeCustom: 'Unauthorized installation',
  startDate: '1996-01-01', // year-only precision — see note below
  venueName: 'San Francisco Museum of Modern Art',
  venueCity: 'San Francisco',
  venueCountry: 'United States',
  venueTgnUri: '[look up — Getty TGN URI for San Francisco, agent-suggested per existing pattern]',
  sameAs: ['[SFMOMA Wikidata URI — look up at wikidata.org, do not guess/hardcode without verifying]'],
  descriptionShort: 'A sculptural work referencing the SFMOMA building was installed without authorization in the museum\'s exterior plaza; the museum retained it rather than removing it immediately.',
  status: 'published',
  hasPage: false,        // no dedicated /events/[slug] page for now — see 4.3
  excludeFromCv: true,   // this was not a sanctioned exhibition; artist's call whether to ever include it on the CV
  artworks: ['[relation IDs for the 3-part video series — see 4.4]'],
}
```

**Date precision note:** `startDate` is stored as `1996-01-01` per the existing Events convention of January-1 placeholder precision for year-only dates (`events-intake-spec.md` Part 2, submit behaviour). This is a known/accepted limitation of the schema, not something to special-case here — `jsonld_startDate` should render as `'1996'` (year only) rather than the full placeholder date, exactly as the existing Events JSON-LD logic already does for any other stub-precision event.

**Do NOT** hardcode SFMOMA's Wikidata URI without verifying it — look it up at the time of data entry, same as every other `sameAs`/authority-URI field on this site (`artist-archive-schema-final.md`'s "agent suggests, artist confirms" pattern applies here too).

### 4.3 Should it have its own page? (`hasPage`)

Default to `hasPage: false` — there's no public `/events/[slug]` page for this record, it exists purely as a structured node referenced from the Statement page (and, via the relation, from each of the three artwork pages). This is consistent with the `hasPage` gating logic already specified in `bio-page-spec.md` Part 3.3 — a stub event with `hasPage: false` renders its CV/caption references as plain text or inline data, never as a broken link.

If the artist later decides this story deserves its own page (it's a strong story — plausible), that's a separate, future spec. Don't build it speculatively now.

### 4.4 Link the three artworks to this event

The three video-series artworks should each have this Event record added to their existing `events` relation field (`master-schema-spec.md` Section 1.4 — this relation already exists in schema, this is a content task, not a new field). Doing this means:

- Each artwork's own JSON-LD can surface the event it documents (already part of the standard artwork JSON-LD shape per `master-schema-spec.md` Section 1.10)
- The relation is bidirectional — the Event record's `artworks` field and each Artwork's `events` field stay in sync automatically via Payload's relationship handling, no manual double-entry

**Do NOT** create a second, separate way of linking these artworks to the event (e.g. a new field on `statementRelatedWorks`) — `statementRelatedWorks` already links artwork → statement page; `Artworks.events` already links artwork → event. Two existing relations cover the full graph without a third.

### 4.5 Statement page JSON-LD — referencing the event

Extend the `CreativeWork` shape from Part 3.2 with an `about` property pointing at this event, inlined as a typed `Event` object (not just a stub link, since `hasPage: false` means there's no URL to point to — the full object lives here):

```json
{
  "about": {
    "@type": "Event",
    "name": "Unauthorized installation, SFMOMA exterior",
    "startDate": "1996",
    "location": {
      "@type": "Place",
      "name": "San Francisco Museum of Modern Art",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "San Francisco",
        "addressCountry": "US"
      },
      "sameAs": "[SFMOMA Wikidata URI]"
    },
    "description": "[descriptionShort from the Event record]",
    "workFeatured": [
      { "@type": "VideoObject", "name": "[artwork.title]", "url": "https://bernardbolter.com/[artwork.slug]" }
    ]
  }
}
```

`workFeatured` here is constructed the same way as `mentions` in Part 3.4 — pull from the same three artworks, but sourced via `event.artworks` (the relation set in 4.4) rather than re-querying `statementRelatedWorks`, so this stays correct even if the related-works list on the page is edited independently later.

**Do NOT** duplicate the full Event JSON-LD shape from `master-schema-spec.md` Section 2.10 (organizer, performer, full venue address detail, etc.) inside this `about` block — keep it to name/date/location/description/workFeatured, the minimum needed to make the connection legible. The Event record itself is the source of truth; this is a representation of it, not a second authoritative copy.

### 4.6 Do NOT (Part 4 additions)

- Do not invent a new `eventType` enum value for this single record — use `other` + `eventTypeCustom`
- Do not guess or hardcode SFMOMA's Wikidata URI — verify it at content-entry time
- Do not build a public `/events/[slug]` page for this record as part of this spec — `hasPage: false` is the default, a dedicated page is a future decision
- Do not create a duplicate relation field to link the artworks to this event — reuse `Artworks.events`, already in schema
- Do not inline the artwork's full JSON-LD inside `workFeatured` — name + url stub only, same rule as `mentions` in Part 3.4

---

## Part 5 — Build order

**Step 1 — Schema**
Add `statementRelatedWorks[]` and `statementLastRevised` to `src/collections/Artist.ts` per Parts 1.1 and 3.3. No schema changes needed for Part 4 — the Events collection and `Artworks.events` relation already exist.
✓ Both new fields visible in Payload admin. Relationship picker on `statementRelatedWorks.artwork` only shows published artworks.

**Step 2 — Create the SFMOMA Event record**
Create the Event record per Part 4.2. Look up and verify SFMOMA's Wikidata URI and the Getty TGN URI for San Francisco before saving — don't leave placeholders in a published record.
✓ Event visible in admin with `eventType: other`, `eventTypeCustom: 'Unauthorized installation'`, `hasPage: false`. `sameAs` and `venueTgnUri` contain verified, real URIs — not placeholder text.

**Step 3 — Content: related works and event linking**
Add the three video-series entries to `statementRelatedWorks` in order, each with a `note` ("Part I", "Part II", "Part III" or similar — artist's call on exact wording). Set `statementLastRevised` to today's date. Add the SFMOMA Event record to each of the three artworks' `events` relation field (Part 4.4).
✓ Three entries present in `statementRelatedWorks`, in the intended order. All three artworks show the SFMOMA event in their `events` field, and the Event record's reverse `artworks` relation shows all three (confirms bidirectional sync).

**Step 4 — StatementRelatedWorks component**
Build per Part 2. Place it between `StatementPhotoSequence` and `StatementClosing` in `Statement.tsx`.
✓ Section renders only when entries exist (test by temporarily clearing the array — section disappears entirely, not an empty heading). Thumbnails and titles link to the correct artwork pages. Notes display correctly.

**Step 5 — JSON-LD generator**
Build `generateStatementJsonLd.ts` per Part 3, extended with the `about` block per Part 4.5. Wire into `generateMetadata` in `app/(public)/statement/page.tsx`.
✓ Inspect the rendered `<script type="application/ld+json">` block. Confirm `author` matches the Bio page's Person shape. Confirm `mentions` has exactly three entries matching `statementRelatedWorks`. Confirm `about` is present with a typed `Event` object, correct `startDate: "1996"` (year only, not the placeholder full date), and a `workFeatured` array sourced from the Event's `artworks` relation. Confirm `text` contains the full statement. Validate with Google's Rich Results Test or equivalent.

**Step 6 — Full page review**
Check the related-works section at all four breakpoints. Confirm it collapses to a single column below `m:`.
✓ No layout breakage. Section reads clearly as a reference list, distinct in tone from the photo sequence above and the closing block below.

---

*Statement page JSON-LD & related works addendum · bernardbolter.com · June 2026*
