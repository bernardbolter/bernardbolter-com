# Bio Page Spec
## bernardbolter.com · `/bio` · June 2026

*Read alongside `design-system.md` (Bio page padding/close-button/header-overlay rules — already locked, not repeated here), `series-page-spec.md` (the `getSeriesLinkHref()` helper this page consumes), and `events-intake-spec.md` (the `hasPage` flag this page reads).*

---

## Part 0 — What's changing vs. the old WordPress page

The old bio page (see reference screenshot) has the right shape: a chronological narrative + an irregular photo mosaic with captions. Keep that shape. Three things change:

1. Fix the typo — "Relocating to Berlin in **20167**" → **2016**.
2. Cut or rewrite the closing paragraph. It currently just restates the header line ("rooted in San Francisco... works between Berlin and San Francisco") without adding information. Replace with either nothing (end on the Mediums of Perception paragraph) or a forward-looking line about current focus — artist's call at content-entry time, not a code decision.
3. Wire up real connections: series names in the prose link out, photo captions conditionally link to event pages, and the page emits a `Person`-type JSON-LD block as its primary entity.

---

## Part 1 — Schema additions

### 1.1 Bio photo gallery — new field on Artist singleton

The old page's 4-photo irregular grid (studio shots + exhibition install shots + the skateboarding photo) has no structured home yet — only single-photo fields like `contactPhoto` exist. Add a repeatable array:

```ts
{
  name: 'bioPhotos',
  type: 'array',
  admin: {
    description: 'Photo grid on the Bio page. Order here controls display order. Mix of studio shots, install shots, and personal/origin images — captions carry the story.',
  },
  fields: [
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'caption',
      type: 'text',
      localized: true,
      admin: {
        description: 'E.g. "Bernard Bolter in his studio at Markgraffendamm, Berlin" or "Digital City Series exhibition at Book & Job Gallery, San Francisco, 2013".',
      },
    },
    {
      name: 'relatedEvent',
      type: 'relationship',
      relationTo: 'events',
      required: false,
      admin: {
        description: 'Optional. If this photo documents a specific exhibition/event and that event has a published page (hasPage: true), the caption renders as a link to it. Leave empty for studio/personal photos with no associated event.',
      },
    },
  ],
}
```

✓ Field visible in Payload admin under Artist singleton. Can add, reorder, and remove photo entries. `relatedEvent` relation picker filters to the Events collection.

### 1.2 Series link reuse

No new field — this page consumes `getSeriesLinkHref(slug)` from `src/utilities/getSeriesLinkHref.ts` (built in `series-page-spec.md` Part 5). If that file doesn't exist yet, build it first; do not duplicate the helper here.

---

## Part 2 — Page structure

### 2.1 File locations

```
src/app/(public)/bio/
  page.tsx                  ← server component, fetches artist singleton
src/components/Bio/
  Bio.tsx                   ← main layout
  BioProse.tsx               ← richText body with linked series mentions
  BioPhotoGrid.tsx           ← irregular photo mosaic, conditional event links
  BioPhotoItem.tsx           ← single photo + caption (link or plain text)
```

### 2.2 Data fetching

Server component. Fetch the Artist singleton including `bioFull` (or `bio` — confirm actual field name against the live Artist collection; `master-schema-spec.md` and `artist-archive-schema-final.md` disagree on `bio` vs `bioFull`, resolve against whichever is actually implemented before writing this page), `bioPhotos` (with `relatedEvent` populated, not just the relation ID — request the populated event's `slug`, `title`, and `hasPage`), `ulanUri`, `wikidataUri`, `locations` (for `birthPlace`/`homeLocation`), `education` if implemented.

### 2.3 Section order

1. Header block — name, birth year + place, "lives and works in [current locations]" — already exists in the old page, port as-is, source from `Artist.locations` rather than hardcoded text (see `artist-archive-schema-final.md` Section 4.6 — the "lives and works in" line is computed from `locations` entries where `current: true`, `primary: true` first)
2. Italic tagline (short, 1–2 sentences) — this is `bioShort` or equivalent, not part of the main richText body
3. Close button (per `design-system.md` Bio breakpoint table — `80px / 103px / 130px / 135px`, already locked, no change needed)
4. Header overlay "BIO" decorative background text (existing pattern, already locked)
5. Main prose body (`BioProse`) — the chronological narrative
6. Photo grid (`BioPhotoGrid`) — below the prose, same position as the old page

No change to overall page chrome, padding, or breakpoint behavior — all of that is already specified in `design-system.md` Section 5 (Bio/Statement page padding) and stays exactly as-is.

---

## Part 3 — Component specs

### 3.1 BioProse — linking series mentions

The richText body (`bioFull`) is authored in Payload's Lexical editor. Series names mentioned in running prose ("Digital City Series," "Megacities," "A Colorful History," "Mediums of Perception") should render as links to `getSeriesLinkHref(slug)`.

**Two ways to achieve this — pick one before building, don't implement both:**

**Option A — manual inline links in the richText itself.** The artist links the series name directly in the Lexical editor when writing/editing the bio, same as any other hyperlink. Simple, no extra code, but requires the artist to remember to do it and keep links current if a series is renamed.

**Option B — automated post-process.** Render the richText to HTML/React normally, then run a pass that matches known series names (fetched from the `Series` collection) against the rendered text and wraps matches in links automatically. More robust (survives edits, catches every mention), but is more code and carries a real risk: it can match a series name inside a context where a link isn't wanted (e.g. if "Megacities" is ever mentioned in a sentence not actually about that body of work), and it must not double-link text that's already manually linked.

**Recommendation: Option A.** This is prose that changes rarely, written by one person who already knows the series names. Manual linking is simpler, has zero risk of mis-matching, and is consistent with how the rest of the site treats richText as authored content, not text to be algorithmically transformed. Confirm with the artist before building — if a future page has prose that changes often or is agent-generated, Option B becomes worth the complexity, but not here.

✓ Each series mention in the published bio is a working link to `/series/[slug]` (or whatever `getSeriesLinkHref` currently resolves to). Links use the standard inline-link styling already defined for richText content elsewhere on the site — do not invent a new link style for this page.

### 3.2 BioPhotoGrid — layout

Port the existing irregular mosaic layout from the old page as closely as possible — it's confirmed working and liked. No grid-system redesign here; this is not the same fixed-column grid used for artwork browsing (`grid-caption-centering-and-landscape-boost.md` does not apply to this component — that spec is for artwork images specifically).

Reasonable approach: a CSS grid with manually-placed items (2-up row, then an asymmetric 3-up row, repeating or varying per how many `bioPhotos` entries exist) rather than a strict masonry algorithm — the old page's charm is the irregularity, not a computed layout. If `bioPhotos` count varies over time (entries added/removed), the grid should degrade gracefully (wrap to additional rows) rather than break.

### 3.3 BioPhotoItem — conditional event link

```tsx
function BioPhotoItem({ photo }: { photo: BioPhoto }) {
  const event = photo.relatedEvent
  const canLink = event && event.hasPage === true

  return (
    <div>
      <Image src={photo.image.url} alt={photo.image.alt || photo.caption || ''} />
      {photo.caption && (
        canLink ? (
          <Link href={`/exhibitions/${event.slug}`}>
            <p>{photo.caption}</p>
          </Link>
        ) : (
          <p>{photo.caption}</p>
        )
      )}
    </div>
  )
}
```

**The check is `hasPage === true`, not "does `relatedEvent` exist."** A photo can have a `relatedEvent` relation set while that event is still a CV-only stub — in that case the caption renders as plain text, identical to having no `relatedEvent` at all. Do not link to a stub event's page; it doesn't have one yet.

**Do NOT:**
- Do not add a visual "broken link" or disabled-link treatment when `hasPage` is false — it should look exactly like a caption with no link, no visual difference
- Do not fetch `hasPage` status client-side per photo — it's already part of the server-fetched, populated `relatedEvent` data from `page.tsx`
- Do not auto-link based on string-matching the caption text against event titles — only the explicit `relatedEvent` relation should ever produce a link

✓ A photo with `relatedEvent` set to a `hasPage: true` event renders its caption as a link to that event's page. A photo with `relatedEvent` set to a stub event, or no `relatedEvent` at all, renders identical plain-text captions — visually indistinguishable from each other.

---

## Part 4 — JSON-LD

**File:** `src/utilities/generateBioJsonLd.ts`, injected via `generateMetadata` in `page.tsx`.

This page is the one place on the site where the `Person` is the primary subject, not nested inside a `creator` field of something else.

```json
{
  "@context": {
    "@vocab": "https://schema.org/",
    "artism": "https://artism.org/schema/"
  },
  "@type": "ProfilePage",
  "url": "https://bernardbolter.com/bio",
  "mainEntity": {
    "@type": "Person",
    "name": "Bernard Bolter",
    "birthDate": "1974",
    "birthPlace": {
      "@type": "Place",
      "name": "San Francisco"
    },
    "homeLocation": [
      { "@type": "Place", "name": "[current locations from Artist.locations where current=true]" }
    ],
    "identifier": [
      { "@type": "PropertyValue", "propertyID": "ULAN", "value": "[artist.ulanUri]" },
      { "@type": "PropertyValue", "propertyID": "Wikidata", "value": "[artist.wikidataUri]" }
    ],
    "jobTitle": "Visual Artist",
    "description": "[bioShort or the italic tagline]",
    "alumniOf": [
      { "@type": "EducationalOrganization", "name": "Gerrit Rietveld Academie" },
      { "@type": "EducationalOrganization", "name": "HKU Utrecht" }
    ],
    "memberOf": {
      "@type": "Organization",
      "name": "ArtCollision"
    },
    "image": ["[bioPhotos image URLs]"],
    "sameAs": ["[artist.wikidataUri]", "[artist.website]", "[artist.instagramUrl — if implemented]"]
  }
}
```

**Do NOT:**
- Output `identifier` entries for ULAN or Wikidata if those URIs are still empty on the Artist singleton — omit the array entries entirely rather than emitting empty-string values (consistent with the `artism:` field-omission rule used elsewhere in the project)
- Inline the full richText `bioFull` as the `description` — use the short plain-text tagline only, same reasoning as the Series page's `Collection.description`
- Hardcode `birthPlace`/`homeLocation` as plain strings — confirm against Part 2.3's data source (`Artist.locations`) and resolve programmatically, not by copy-pasting the current city names into this file

**Open items to confirm with the artist before finalizing this block** (carried over from earlier discussion, not yet decided):
- Whether `alumniOf` entries should also carry Wikidata `sameAs` URIs for the institutions themselves, or plain names are sufficient for now
- Whether to add an `artism:practiceArea` array listing series names directly on the Person object (redundant with the inline series links in Part 3.1, but useful for systems that only read JSON-LD and don't crawl prose)

---

## Part 5 — What NOT to do

- ❌ Do not redesign the photo grid layout — port the existing irregular mosaic, it's confirmed working
- ❌ Do not add an intro/description text block beyond what's already in the old page's structure
- ❌ Do not implement both Option A and Option B for series linking — pick one (recommended: A) and confirm before building
- ❌ Do not link a photo caption to an event page when `hasPage` is false
- ❌ Do not visually distinguish linkable vs. non-linkable captions — they must look identical
- ❌ Do not duplicate the `getSeriesLinkHref` helper — import it from `series-page-spec.md`'s implementation
- ❌ Do not emit empty-string JSON-LD `identifier` values for missing ULAN/Wikidata URIs — omit entirely
- ❌ Do not hardcode "Berlin and San Francisco" as a string anywhere — source from `Artist.locations`

---

## Part 6 — Build order

**Step 1 — Schema**
Add `bioPhotos[]` to `src/collections/Artist.ts` per Part 1.1. Confirm `getSeriesLinkHref.ts` exists (build it now if the series-page work hasn't happened yet — it's a two-line file).
✓ Field visible and usable in Payload admin.

**Step 2 — Content migration**
Populate `bioPhotos` with the 4 existing photos + captions from the old page. Set `relatedEvent` on the two captions that reference specific shows (Book & Job Gallery 2013, Circular Gallery Berlin 2020) if those Event records exist; leave unset if they don't yet.
✓ All 4 photos present in Payload with correct captions. Relations set where the source event exists.

**Step 3 — Fix and finalize bio prose**
Correct the "20167" typo. Resolve the redundant closing paragraph (cut or rewrite — artist's call). Add inline series links per the chosen option from Part 3.1.
✓ No typos. Closing paragraph either removed or adds new information. Series mentions are working links.

**Step 4 — page.tsx and data fetching**
Build the server component per Part 2.2, with `relatedEvent` populated to include `hasPage` and `slug`.
✓ `console.log` confirms `bioPhotos[].relatedEvent.hasPage` is present in fetched data, not just the relation ID.

**Step 5 — BioPhotoGrid + BioPhotoItem**
Build per Part 3.2–3.3.
✓ Grid renders in the same irregular layout as the old page. Linkable captions navigate correctly. Non-linkable captions are visually identical to linkable ones, just inert.

**Step 6 — JSON-LD**
Build `generateBioJsonLd.ts` per Part 4.
✓ Inspect the rendered `<script type="application/ld+json">` block. Confirm no empty-string `identifier` entries. Confirm `description` is short plain text. Validate with Google's Rich Results Test or equivalent.

**Step 7 — Full page review**
Check against the old screenshot at all four breakpoints. Confirm close button position matches the existing Bio row in `design-system.md`'s breakpoint table (no change expected).
✓ Visual parity with the old page's intent, plus working series and event links, plus valid JSON-LD.

---

*Bio page spec · bernardbolter.com · June 2026*
