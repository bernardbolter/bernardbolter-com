# Planned Works — Schema Addendum
## The Archive Running Forward, Not Just Backward
*July 24, 2026 · Addendum to `artist-archive-schema-final.md` and `bio-statement-capture-brief.md`*

Read alongside: `artist-archive-schema-final.md` (Artist singleton), `bio-statement-capture-brief.md` (bioTimelineEntries pattern this borrows its shape from), `events-intake-spec.md` and the not-yet-written event-merge/search-create-stub addendum from this same session.

---

## 1. Why this exists

Surfaced during the Almadinat Alearabia cataloguing session (July 24, 2026), while discussing why Deutsche Stadt used city-scale rather than skatepark-scale imagery. The blocker (European satellite resolution insufficient at skatepark zoom level) named a real planned piece — **"Deutsche Skate Stadt"** — intended to relaunch the Megacities series once resolved.

Every existing schema layer reasons about work that already exists. There is currently no field, collection, or relation for a **stated future intention**: a piece that has been named, motivated, and given a role in the practice's arc, but not yet made. This is distinct from:

- `consciousRejections` — something turned down, not something intended
- `bioTimelineEntries` / `statementThroughlines` — patterns drawn from *completed* work
- A stub Artwork record — implies the piece exists in some minimal form (image, dimensions); a planned work may have neither

The larger significance, per Bernard directly: once the corpus reaches a point where enough existing work has gone through full reasoning, the archive stops being purely something to catalogue *into* and starts being something to plan *from* — new work conceived with the whole reasoned corpus at hand, rather than made first and reasoned about after. `plannedWorks` is the first concrete mechanism for that shift.

---

## 2. Schema addition

Add to the **Artist singleton**, parallel to `bioTimelineEntries`:

```ts
{
  name: 'plannedWorks',
  type: 'array',
  admin: {
    description: 'Stated future intentions — work named and motivated but not yet made. Distinct from consciousRejections (turned down) and stub Artworks (already exist in some minimal form).',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: { description: 'Working name, e.g. "Deutsche Skate Stadt".' },
    },
    {
      name: 'motivatingNote',
      type: 'textarea',
      admin: { description: 'Why now — what it resolves, continues, or answers. E.g. resolves the resolution problem that held back Deutsche Stadt at skatepark zoom level.' },
    },
    {
      name: 'blocker',
      type: 'textarea',
      admin: { description: 'What is currently preventing the work, if anything. Nullable — some planned works have no blocker, just haven\'t been started.' },
    },
    {
      name: 'relatedSeries',
      type: 'relationship',
      relationTo: 'series', // adjust to actual Series collection/relation name if different
      admin: { description: 'Which series this would belong to or relaunch.' },
    },
    {
      name: 'relatedArtworks',
      type: 'relationship',
      relationTo: 'artworks',
      hasMany: true,
      admin: { description: 'Existing artworks this planned work responds to, continues, or resolves — e.g. Deutsche Stadt for Deutsche Skate Stadt.' },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'idea',
      options: [
        { label: 'Idea', value: 'idea' },
        { label: 'Blocked', value: 'blocked' },
        { label: 'Active', value: 'active' },
        { label: 'Complete — migrated to Artworks', value: 'complete-migrated' },
      ],
    },
    {
      name: 'dateNamed',
      type: 'date',
      admin: { description: 'When this intention was first articulated on record — not when work began.' },
    },
    {
      name: 'migratedArtworkId',
      type: 'relationship',
      relationTo: 'artworks',
      admin: {
        description: 'Set when status becomes complete-migrated — points to the resulting Artwork record. The planned entry is archived in place, not deleted, so the arc from stated intention to finished piece stays on the record.',
        condition: (data) => data.status === 'complete-migrated',
      },
    },
  ],
}
```

---

## 3. Behavior notes

- **Graduation, not deletion.** When a planned work is made, it becomes a real Artwork record via the normal intake pipeline. The `plannedWorks` entry is *not* deleted — `status` flips to `complete-migrated` and `migratedArtworkId` links forward. This preserves the full arc (named → blocked/active → made) as a visible record, which is a genuinely different kind of provenance than anything else currently in the corpus: most records only show what a piece became, not what it was before it existed.
- **No public page.** `plannedWorks` entries are Artist-singleton data, not published Artwork or Event pages. They may surface as context in Art/Official sessions (a planned work is legitimate Practice Knowledge context — e.g. "you've noted Deutsche Skate Stadt as a planned relaunch of Megacities" could inform a future Megacities session) but are not schema.org-mapped or JSON-LD published on their own.
- **Do NOT** build this as a separate collection. At current scale (a handful of intentions, not hundreds) an array field on the Artist singleton is correct — matches the existing `bioTimelineEntries` precedent. Revisit only if volume genuinely grows past what an array comfortably holds.
- **Do NOT** require `blocker` — many planned works will simply not have started yet, with no obstacle beyond time.

---

## 4. Seed entry (from this session)

```json
{
  "title": "Deutsche Skate Stadt",
  "motivatingNote": "Relaunches the Megacities series. Resolves the zoom-level problem Deutsche Stadt couldn't: city-scale satellite imagery was used instead of skatepark-scale because European resolution isn't good enough at that zoom to actually see the skateparks and places.",
  "blocker": "Satellite imagery resolution in Germany/Europe insufficient at skatepark zoom level — commercial satellite coverage (Maxar, Google) concentrates higher resolution and refresh rate over the US, a structural bias also relevant to the Almadinat Alearabia vision-analysis discrepancy discussed in the same session.",
  "relatedSeries": "Megacities",
  "relatedArtworks": ["Deutsche Stadt"],
  "status": "idea",
  "dateNamed": "2026-07-24"
}
```

---

## 5. Files to create or modify

| File | Action | Notes |
|---|---|---|
| `src/collections/Artist.ts` | Modify | Add `plannedWorks` array field per Section 2 |
| Art/Official Practice Knowledge assembly | Modify | Consider surfacing active/blocked `plannedWorks` entries as context when a session touches the related series |

---

## 6. Verification checklist

- [ ] `plannedWorks` array exists on Artist singleton with all fields from Section 2
- [ ] `migratedArtworkId` field only shows/applies when `status: complete-migrated`
- [ ] No public page or JSON-LD generated from `plannedWorks` entries
- [ ] Seed entry for Deutsche Skate Stadt added per Section 4
- [ ] Graduating a planned work to `complete-migrated` archives rather than deletes the entry

---

*July 24, 2026 · Addendum to artist-archive-schema-final.md and bio-statement-capture-brief.md*
*Read alongside: the event-merge and search/create-stub addendum from the same session (Almadinat Alearabia cataloguing, Herbstsalon im Frühling discovery)*
