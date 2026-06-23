# People Collection — Spec
## Shared person records across Events, coExhibitors, and future uses
*June 2026*

Read alongside: `events-intake-spec.md`, `art-official-events-dialogue-spec.md`, `event-page-layout-jsonld-brief.md`

---

## Overview

The `organiser`, `curator`, and `coExhibitors` fields on Events currently store plain text names. This prevents authority URIs (Instagram, Wikidata, ULAN, website) from being attached to people, which limits the JSON-LD graph — a named person with no URI is a dead-end node. This spec creates a shared `People` collection and upgrades the relevant Events fields to relations.

Scope is intentionally narrow: this is an identity/authority record, not a full profile. The goal is enough structure to make person nodes resolvable in JSON-LD and linkable to external authority systems. No public-facing pages for people are built now — that's a future consideration.

---

## Part 1 — People collection

**Slug:** `people`
**Access:** public read; create/update/delete for artist/admin only

```ts
{
  slug: 'people',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'role', 'instagram', 'wikidataUri'],
    description: 'Curators, organisers, gallerists, co-exhibitors, collaborators, and other people connected to events or artworks. One record per person — reuse across events rather than creating duplicates.',
  },
  fields: [

    // Identity
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'nameLegal',
      type: 'text',
      admin: { description: 'Full legal name if different from display name. Used for JSON-LD.' },
    },

    // Role
    {
      name: 'role',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'Curator', value: 'curator' },
        { label: 'Gallerist', value: 'gallerist' },
        { label: 'Organiser', value: 'organiser' },
        { label: 'Artist', value: 'artist' },
        { label: 'Collector', value: 'collector' },
        { label: 'Critic / Writer', value: 'critic' },
        { label: 'Collaborator', value: 'collaborator' },
        { label: 'Publisher', value: 'publisher' },
        { label: 'Educator', value: 'educator' },
        { label: 'Institution', value: 'institution' },
        { label: 'Other', value: 'other' },
      ],
      admin: { description: 'One person can hold multiple roles across different contexts. Select all that apply.' },
    },
    {
      name: 'roleNote',
      type: 'text',
      admin: {
        description: 'If role includes "Other", describe it here. Also use for context-specific role clarification.',
        condition: (data) => Array.isArray(data.role) && data.role.includes('other'),
      },
    },

    // Online presence
    {
      name: 'website',
      type: 'text',
      admin: { description: 'Primary website URL.' },
    },
    {
      name: 'instagram',
      type: 'text',
      admin: { description: 'Handle only, e.g. @juergenbluemlein — no full URL.' },
    },

    // Authority URIs
    {
      name: 'wikidataUri',
      type: 'text',
      admin: { description: 'e.g. https://www.wikidata.org/entity/Q12345' },
    },
    {
      name: 'ulanUri',
      type: 'text',
      admin: { description: 'Getty ULAN URI — primarily for artists.' },
    },

    // Additional identifiers (for future use — ISNI, ORCID, etc.)
    {
      name: 'externalIdentifiers',
      type: 'array',
      admin: { description: 'Any additional authority identifiers not covered above.' },
      fields: [
        {
          name: 'type',
          type: 'select',
          options: [
            { label: 'ISNI', value: 'isni' },
            { label: 'ORCID', value: 'orcid' },
            { label: 'VIAF', value: 'viaf' },
            { label: 'Library of Congress', value: 'loc' },
            { label: 'Other', value: 'other' },
          ],
        },
        { name: 'value', type: 'text' },
        { name: 'uri', type: 'text', admin: { description: 'Full URI for this identifier.' } },
      ],
    },

    // Internal note — not public, not in JSON-LD
    {
      name: 'note',
      type: 'textarea',
      admin: {
        description: 'Internal context note — who this person is, how they connect to the practice. Never exposed publicly or in JSON-LD.',
      },
    },

  ],
}
```

---

## Part 2 — Events field changes

Replace the existing plain-text `organiser` and `curator` fields with relations to the `People` collection. Update `coExhibitors` array to use a relation field instead of a plain name.

### 2.1 `organiser` and `curator`

```ts
// REMOVE these existing fields:
{ name: 'organiser', type: 'text' }
{ name: 'curator', type: 'text' }

// REPLACE with:
{
  name: 'organiser',
  type: 'relationship',
  relationTo: 'people',
  hasMany: false,
  admin: { description: 'Primary organiser of this event. Create a People record first if one doesn\'t exist.' },
},
{
  name: 'curator',
  type: 'relationship',
  relationTo: 'people',
  hasMany: false,
  admin: { description: 'Curator, if different from organiser. Optional.' },
},
```

### 2.2 `coExhibitors` array

The existing `coExhibitors` array stores plain name strings. Update the name field inside it to a relation:

```ts
// EXISTING coExhibitors array shape — update the name field:
{
  name: 'coExhibitors',
  type: 'array',
  admin: { condition: (data) => ['group-exhibition', 'art-fair'].includes(data.eventType) },
  fields: [
    // REMOVE: { name: 'name', type: 'text' }
    // REPLACE WITH:
    {
      name: 'person',
      type: 'relationship',
      relationTo: 'people',
      hasMany: false,
      admin: { description: 'Create a People record for this co-exhibitor first if one doesn\'t exist.' },
    },
    // Keep any other existing fields (note, etc.) unchanged
  ],
}
```

---

## Part 3 — JSON-LD output from People records

When building the `organizer`, `contributor`, or `co-exhibitor` blocks in event JSON-LD, use this pattern:

```ts
function personToJsonLd(person: PeopleRecord) {
  const obj: Record<string, any> = {
    '@type': 'Person',
    'name': person.nameLegal || person.name,
  }

  // Build sameAs array from all available URIs
  const sameAs: string[] = []
  if (person.wikidataUri) sameAs.push(person.wikidataUri)
  if (person.ulanUri) sameAs.push(person.ulanUri)
  if (person.instagram) sameAs.push(`https://www.instagram.com/${person.instagram.replace('@', '')}/`)
  if (person.website) sameAs.push(person.website)
  person.externalIdentifiers?.forEach(id => { if (id.uri) sameAs.push(id.uri) })

  if (sameAs.length === 1) obj.sameAs = sameAs[0]
  if (sameAs.length > 1) obj.sameAs = sameAs
  if (person.website) obj.url = person.website

  return obj
}
```

Result for Jürgen once his Instagram is added:

```json
"organizer": {
  "@type": "Person",
  "name": "Jürgen Blümlein",
  "sameAs": "https://www.instagram.com/juergenbluemlein/"
}
```

---

## Part 4 — Data migration

The existing `organiser` and `curator` text values on published Events need to be migrated. Options:

1. **Manual migration (recommended for now):** Go through each published event in Payload admin, create a People record for each named organiser/curator, then re-link. There are few enough `complete` or `partial` events that this is manageable.
2. **Script migration:** If there are many events with organiser text already filled, write a one-time migration script that creates People records from unique organiser names and re-links them. Use this if the manual approach becomes impractical.

For `coExhibitors`: same approach — create People records for named co-exhibitors on group shows, then re-link.

**Do not break existing data.** If the migration is done manually, the plain-text fields can be removed once all records are confirmed migrated. If done by script, keep a backup column during the transition.

---

## Part 5 — Art/Official future wiring (noted, not built now)

When the Art/Official events dialogue runs Phase A (Haiku research), it should:
- Search the existing `People` collection before proposing to create a new record for an organiser/curator/co-exhibitor name
- If a match is found, propose linking the existing record
- If no match, propose creating a new People record with whatever Haiku finds (website, Instagram, Wikidata)

This is a future addition to `art-official-events-dialogue-spec.md` — not built in this pass. The `People` collection just needs to exist first.

---

## Part 6 — What NOT to do

- ✗ Do not build public-facing people pages (`/people/[slug]`) — not in scope now
- ✗ Do not require all fields — only `name` is required; everything else is optional and fills in over time
- ✗ Do not store the `note` field anywhere in JSON-LD
- ✗ Do not duplicate a person record when the same person appears across multiple events — create once, relate many times
- ✗ Do not remove the `role` field in favour of inferring role from context — a person can be a gallerist in one event and a curator in another; the role field on the People record represents their general identity, not their specific role on each event

---

## Part 7 — Files to create or modify

| File | Action |
|---|---|
| `src/collections/People.ts` | Create |
| `src/payload.config.ts` | Register People collection |
| `src/collections/Events.ts` | Replace `organiser` + `curator` text fields with relations; update `coExhibitors` array per Part 2 |
| `src/utilities/personToJsonLd.ts` | Create utility function per Part 3 |
| Event page JSON-LD builder | Update to use `personToJsonLd()` for organiser/curator blocks |

---

## Part 8 — Verification checklist

- [ ] `People` collection exists and is registered in Payload config
- [ ] All role options present including `other` + `roleNote` condition
- [ ] `organiser` and `curator` on Events are now relationship fields to `people`, not text
- [ ] `coExhibitors[].person` is a relationship field to `people`
- [ ] Jürgen Blümlein People record created with Instagram handle
- [ ] Megacities event organiser field re-linked to Jürgen's People record
- [ ] JSON-LD on event page shows Jürgen with `sameAs` Instagram URI
- [ ] `personToJsonLd()` handles null gracefully — if no URIs exist, outputs only `@type` and `name`
- [ ] `note` field is not in JSON-LD output under any circumstances

---

*June 2026 · Read alongside: events-intake-spec.md, art-official-events-dialogue-spec.md, event-page-layout-jsonld-brief.md*
