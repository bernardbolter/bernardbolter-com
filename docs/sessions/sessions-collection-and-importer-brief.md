# Sessions Collection, Incremental Save & Multi-Collection Importer Brief

*Derived from The Thinker session, July 15, 2026. Read alongside `art-official-dialogue-spec.md` and `artist-archive-schema-final.md`.*

## Part 1 — Why

Two related problems, one root cause: the Sessions collection isn't currently doing enough work.

1. **Sessions run outside the Payload admin (e.g. in Claude chat) have no path into the archive at all.** There is no bridge between a claude.ai conversation and any Payload collection.
2. **Even sessions run inside the Payload admin may only commit at confirmation**, per the existing implementation plan's note that Sessions "commits to Artworks collection only at confirmation step." If the session record itself isn't written incrementally, `status: in-progress` has nothing real to resume into, and closing the tab mid-session risks losing the whole conversation.

The fix for both is the same: treat Sessions as the one place every reasoning conversation lands, written turn-by-turn, queryable, and linkable — regardless of where the conversation happened.

## Part 2 — Schema additions to Sessions collection

```ts
{
  slug: 'sessions',
  fields: [
    // existing: sessionId, sessionType, status, transcript/messages, firstImpression, etc.
    // ADD:
    {
      name: 'sessionType',
      type: 'select',
      options: [
        'artwork-cataloguing',
        'connected-reading',
        'biography',
        'artist-statement',
        'onboarding',
        'annual-snapshot',
      ],
      // NOTE: expand existing sessionType enum with 'connected-reading',
      // 'artist-statement' (if not already present), and 'annual-snapshot'
    },
    {
      name: 'primaryArtwork',
      type: 'relationship',
      relationTo: 'artworks',
      admin: { description: 'The single artwork this session was cataloguing, if any. Empty for biography/statement-only sessions.' },
    },
    {
      name: 'mentionedArtworks',
      type: 'relationship',
      relationTo: 'artworks',
      hasMany: true,
      admin: { description: 'Every other artwork referenced during the session — comparisons, corpus connections, related works. Populated by the agent as the session progresses. Distinct from primaryArtwork; queryable independently (e.g. "every session that ever mentioned Towers").' },
    },
    {
      name: 'secondDescription',
      type: 'textarea',
      admin: { description: 'The formal re-ask response, captured separately from firstImpression, per session-flow-revision-brief.md step 8.' },
    },
    {
      name: 'proposedAbstracts',
      type: 'array',
      fields: [
        { name: 'targetCollection', type: 'select', options: ['bio-timeline', 'statement-throughline'] },
        { name: 'text', type: 'textarea' },
        { name: 'status', type: 'select', options: ['proposed', 'accepted', 'edited', 'rejected'] },
      ],
      admin: { description: 'Abstracts proposed during the session-close abstract-proposal beat, before they are written to the Artist singleton.' },
    },
  ],
}
```

**Do NOT** make `primaryArtwork` and `mentionedArtworks` a single array with a `role` flag — keep them as two separate relation fields. Rationale: independent queryability (e.g. "find every session mentioning Towers" is a direct field query on one field, not a filter across a combined array) was an explicit design decision in the source conversation.

## Part 3 — Incremental save

Every turn of a session — each `update_field` call, each proposed abstract, each message — should write to the Sessions record as it happens, not only assemble in memory until confirmation.

- **Do NOT** let incremental writes touch the public Artworks collection. Incremental saving is scoped to the private Sessions record only. Public Artwork fields still only commit at confirmation, unchanged from current behavior.
- `status: in-progress` should mean the transcript and any partial `proposedAbstracts` are genuinely persisted and resumable, not just a UI-side flag.
- Investigate first (do not assume): whether the current Payload-admin Claude-API route already writes per-turn or only at `generate_confirmation_draft`. This determines whether this section is "turn it on" or "build it."

## Part 4 — Multi-collection import envelope

A single JSON shape that can be pasted once and routes writes to multiple destinations, replacing the idea of separate per-collection importers.

```json
{
  "sourceSessionRef": "session-id-or-slug",
  "writes": [
    {
      "collection": "artworks",
      "slug": "the-thinker",
      "operation": "set",
      "fields": { "intent": "...", "makingNote": "...", "reasoningStatus": "complete" }
    },
    {
      "collection": "bio-timeline",
      "operation": "append",
      "entry": { "eventDate": "1993", "text": "...", "sourceSessionRef": "...", "linkedArtworkSlugs": ["the-thinker"] }
    },
    {
      "collection": "statement-throughlines",
      "operation": "append",
      "entry": { "dateRecognized": "2026-07-15", "text": "...", "linkedArtworkSlugs": ["the-thinker"], "sourceSessionRef": "..." }
    }
  ]
}
```

### 4.1 Write semantics

- `operation: "set"` — idempotent by nature (same slug, same fields, repeated writes just overwrite). Safe to re-paste.
- `operation: "append"` — needs an idempotency guard. Before appending, check whether an entry with the same `sourceSessionRef` + identical `text` already exists in the target array; skip silently if so. This makes "paste the whole envelope again after fixing one unrelated section" safe by default, without requiring the artist to manually trim the JSON under time pressure (e.g. on a phone).

### 4.2 Independent, per-section results

Each `writes[]` entry succeeds or fails on its own. Do NOT make the import atomic (all-or-nothing) — a bad field in one section must not block a good write in another.

Response shape:

```json
{
  "results": [
    { "collection": "artworks", "slug": "the-thinker", "status": "saved" },
    { "collection": "bio-timeline", "status": "saved" },
    { "collection": "statement-throughlines", "status": "failed", "reason": "linkedArtworkSlugs: unknown slug 'the-thinker-x'" }
  ]
}
```

### 4.3 `reasoningStatus` as a guarded final write

`reasoningStatus: 'complete'` should not flip as an incidental side effect of a partially-successful envelope. Treat it as its own explicit final write within the envelope — only meaningful once the artist has confirmed everything else in the batch actually saved. Do NOT set it inside the same `set` operation as other fields if there's a risk other fields in that operation could fail — separate it out, or make it the last field applied only after the rest of that write's fields succeed.

## Part 5 — Do NOT (consolidated)

- Do not build this as four separate importers (artwork fields, bio timeline, throughlines, transcript) — one envelope, multiple `writes[]` entries, one importer.
- Do not make the import atomic.
- Do not let re-pasting the full envelope duplicate `append` operations — idempotency check required.
- Do not let incremental session saves touch public Artwork records before confirmation.

## Part 6 — Verification checklist

- [ ] Pasting an envelope with 3 `writes[]` entries, one intentionally invalid, results in 2 successful writes and 1 clearly reported failure
- [ ] Re-pasting the identical envelope after fixing the invalid entry results in the previously-failed entry saving, and does NOT duplicate the two already-saved entries
- [ ] `primaryArtwork` and `mentionedArtworks` are independently queryable (test: query all sessions where `mentionedArtworks` contains a given slug)
- [ ] A session left mid-conversation (closed tab, no confirmation) is resumable from its last incrementally-saved state
- [ ] `reasoningStatus: complete` is never set as a side effect of a partially-failed write batch

---
*Sessions collection & importer brief · July 2026*
