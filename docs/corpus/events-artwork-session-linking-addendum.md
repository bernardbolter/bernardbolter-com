# Events Linking from Artwork Sessions — Addendum
## search_events / create_event_stub tools for the "where has this lived" beat
*July 24, 2026 · Addendum to art-official-dialogue-spec.md, events-intake-spec.md, and session-flow-revision-brief.md*

Read alongside: `artist-archive-schema-final.md` Section 2 (Events collection), `master-schema-spec.md` Section 1.4 (Artworks.events relation), `session-flow-revision-brief.md` Part 3 ("where has this lived" beat), `art-official-events-dialogue-spec.md` (the full two-phase Events session this addendum does NOT replace).

---

## 1. Why this exists

Flagged twice in the source session (`session-flow-revision-brief.md` Part 4, and again live during the Almadinat Alearabia cataloguing session, July 24 2026): when exhibition history surfaces during an *artwork* session's step 7 ("where has this lived"), there is currently no mechanism to check whether a matching Events record already exists, or create one, without leaving the artwork conversation. The fallback has been writing free text into `workContext` — explicitly flagged as wrong in the July session-flow-revision-brief.

The Almadinat Alearabia session ran this manually as a proof of concept: mid-conversation, the artist recalled "Herbst Salon," a web search found the actual event (herbstsalon.berlin, ZWITSCHERMASCHINE, Palladium Studios), and — critically — **the CV already had two separate stub entries for the same show**, with mismatched years (2022 vs 2023) and mismatched venue spelling ("Zwitschermachine" vs "Pallaseum"). Nobody had checked for an existing record before creating either stub. That's the exact failure this mechanism needs to prevent, and it happened even in a small corpus — worth taking seriously at scale.

---

## 2. Tool definitions

Add to the existing artwork-session toolset (`art-official-dialogue-spec.md` Section 4), scoped to step 7 only.

### 2.1 `search_events`

```ts
{
  name: "search_events",
  description: "Search existing Events records by venue name, year, and/or title keywords when exhibition or venue information surfaces during the 'where has this lived' beat. Always call this before offering to create a new event — never assume no match exists.",
  input_schema: {
    type: "object",
    properties: {
      venueKeywords: { type: "string", description: "Venue name or partial name as mentioned by the artist." },
      yearApprox: { type: "number", description: "Year, if known. Search should tolerate +/- 1 year given how often memory is approximate here." },
      titleKeywords: { type: "string", description: "Any exhibition/show title fragment mentioned." }
    },
    required: []
  }
}
```

**Matching behavior:**
- Fuzzy match across `title`, `venueName`, `yearStart` (±1 year tolerance — the Herbstsalon case had a real one-year discrepancy between two stub entries for the same show).
- Return **all** plausible candidates, not just the top match — let the artist disambiguate rather than silently picking one, especially given venue-name spelling drift is a real, observed failure mode ("Zwitschermachine" vs "ZWITSCHERMASCHINE" vs "Pallaseum" vs "Pallasseum").
- If more than one candidate is returned, flag this explicitly to the artist as a possible existing duplicate, even if the session's own intent is just to link, not merge: "I found two records that might both be this show — worth checking whether they're actually duplicates before I link either one."

### 2.2 `create_event_stub`

```ts
{
  name: "create_event_stub",
  description: "Create a new Events record inline from the artwork session, using whatever has already been said in conversation. Identical output shape to Quick Event Intake — enrichmentStatus: stub, hasPage: false. Only call this after search_events has returned no plausible match and the artist has confirmed no existing record covers this show.",
  input_schema: {
    type: "object",
    properties: {
      eventType: { type: "string", enum: ["solo-exhibition", "group-exhibition", "art-fair", "award", "residency", "publication", "bibliography", "talk-panel", "screening", "performance", "education", "public-commission", "other"] },
      title: { type: "string" },
      yearStart: { type: "number" },
      venueName: { type: "string" },
      venueCity: { type: "string" },
      venueCountry: { type: "string" }
    },
    required: ["eventType", "title", "yearStart"]
  }
}
```

Writes a record identical in shape to Quick Event Intake output (`events-intake-spec.md` Part 2). Does not attempt to fill any enrichment-stage fields (`descriptionLong`, `sameAs`, `coExhibitors`, etc.) — those remain the job of the full Events dialogue (`art-official-events-dialogue-spec.md`) when the artist chooses to enrich the stub later.

### 2.3 Both tools call `link_artwork_to_event`

```ts
{
  name: "link_artwork_to_event",
  description: "Add this event to the current artwork's events relation (and, per Payload's relationship handling, the reverse Events.artworks relation updates automatically). Call after either a search_events match is confirmed by the artist, or a create_event_stub call succeeds.",
  input_schema: {
    type: "object",
    properties: {
      eventSlug: { type: "string" }
    },
    required: ["eventSlug"]
  }
}
```

This is what actually replaces the `workContext` free-text fallback — the artwork's `events` relation gets populated directly, every time, rather than only when someone remembers to do it by hand.

---

## 3. Conversational shape

Fires naturally inside step 7, not as a separate phase or a labeled transition (same rule as the rest of the artwork dialogue — no phase-announcing).

1. Exhibition/venue detail surfaces in conversation (artist mentions a show, a venue, a date).
2. Agent silently calls `search_events` with whatever keywords are available.
3. **If match(es) found:** present plainly — "Found [title] at [venue], [year] — is this it?" One at a time if multiple candidates, same confirm/reject register as the Events Phase A authority-URI lookups. If the artist confirms, call `link_artwork_to_event`.
4. **If no match:** confirm with the artist before creating — "I don't see an existing record for this — want me to add it now as a stub, or hold it for later?" Only call `create_event_stub` (then `link_artwork_to_event`) on explicit yes.
5. **If multiple existing records look like possible duplicates of each other** (not just candidates for this artwork): flag it as its own thing, separate from the artwork session's immediate task — don't silently merge, don't silently ignore. Note it for a later admin cleanup pass (this is what should have caught the Herbstsalon duplication before it reached two separate CV lines).

---

## 4. What NOT to do

- Do NOT silently pick the "best" match when `search_events` returns multiple plausible candidates — always surface for artist confirmation, per the duplicate lesson from this session.
- Do NOT let this mechanism attempt any enrichment-stage Events fields (`descriptionLong`, `practiceArcNote`, `coExhibitors`, etc.) — it only handles existence-check, stub-creation, and linking. Full enrichment stays the Events dialogue's job.
- Do NOT auto-delete or auto-merge suspected duplicate Events records. Flag for artist review; never resolve silently.
- Do NOT skip `search_events` even when the artist sounds certain no record exists — the Herbstsalon case is direct proof that confident recall doesn't guarantee an accurate check against what's actually already stored.
- Do NOT write to `workContext` for exhibition history once this mechanism exists. If both tools somehow fail or return an ambiguous state, escalate to the artist rather than falling back to free text.

---

## 5. Files to create or modify

| File | Action | Notes |
|---|---|---|
| `art-official-dialogue-spec.md` Section 4 | Modify | Add `search_events`, `create_event_stub`, `link_artwork_to_event` tool definitions, scoped to step 7 |
| Artwork session system prompt assembly | Modify | Step 7 instructions updated to call `search_events` proactively whenever venue/exhibition detail surfaces, per Section 3 above |
| `src/utilities/searchEvents.ts` | Create | Fuzzy match implementation — title/venueName/yearStart(±1), returns ranked candidates |
| `src/utilities/createEventStub.ts` | Create | Thin wrapper around existing Quick Event Intake write logic, callable from the artwork-session API route |

---

## 6. Verification checklist

- [x] `search_events` tolerates ±1 year and partial/misspelled venue name matches (test case: should find "Herbstsalon im Frühling" from a query of "herbst salon pallaseum")
- [x] Multiple candidates are presented one at a time for confirmation, never auto-resolved
- [x] `create_event_stub` only fires after explicit artist confirmation that no existing record applies
- [x] `link_artwork_to_event` correctly populates both sides of the Artworks↔Events relation
- [x] No artwork session writes exhibition history to `workContext` after this mechanism is live
- [x] Suspected duplicate Events (multiple records, same show) are flagged for admin review, never silently merged
- [x] Full enrichment fields (`descriptionLong`, `coExhibitors`, etc.) are never written by this mechanism — only by the dedicated Events dialogue

*Implementation (July 2026): tools wired in `agentTools` / `applyAgentTool`; fuzzy match in `src/lib/artOfficial/searchEvents.ts` (re-exported from `src/utilities/searchEvents.ts`); stub + link in `createEventStub.ts`; prompt block `buildWhereHasThisLivedBlock`. Unit coverage: `tests/unit/searchEvents.spec.ts`.*

---

*July 24, 2026 · Addendum to art-official-dialogue-spec.md, events-intake-spec.md, session-flow-revision-brief.md*
*Read alongside: art-official-events-dialogue-spec.md (full Events enrichment dialogue, unaffected by this addendum)*
