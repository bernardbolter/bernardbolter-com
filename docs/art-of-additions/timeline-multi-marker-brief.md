# Timeline Multi-Marker Visualization Brief

*Derived from The Thinker session, July 15, 2026. Read alongside `homepage-interaction-jsonld-spec.md` (existing drag/scroll timeline canvas) and `bio-statement-capture-brief.md`.*

## Part 1 — Why

The existing timeline shows artworks only. Three new entities from `bio-statement-capture-brief.md` want to surface on the same timeline, each in a structurally different way, because each answers a different question about the practice:

- **Bio-timeline entries** — a fact anchored to one moment (a "self-portrait" of context around a specific year)
- **Statement throughlines** — a pattern spanning multiple moments across years or decades
- **Historical bios/statements** — a complete self-description frozen at one date

This is exploratory, speculative build work — try it, see how it looks, refine. Treat this brief as a starting point, not a locked spec.

## Part 2 — Three new marker types

### 2.1 Bio-entry marker (point)

- Single `eventDate`, positioned on a secondary marker track — smaller, visually distinct weight/color from artwork nodes, positioned adjacent to (not overlapping) the main artwork row so it doesn't compete for attention.
- If `linkedArtworkSlugs` is present, position visually near the linked artwork's node.
- Click/tap surfaces the entry text and a link through to its home on the Bio page and its source session.

### 2.2 Throughline marker (thread across points)

- Not a single point — draws a faint connecting line between the timeline positions of each artwork in `linkedArtworkSlugs`, dated by when each linked work was made (not by `dateRecognized`).
- Hovering or clicking one endpoint highlights the full thread and all its endpoints.
- This is the least-specified piece of the whole system and the most likely to need iteration — start with a simple version (a static line between two points) before attempting anything more elaborate (curved paths, multi-node threads for throughlines spanning 3+ works, etc.).

### 2.3 Historical self-reading marker (document-at-a-point)

- A distinct node style from both of the above — not an excerpt, a whole document sitting at one date. Suggest a "document" icon/shape distinct from the dot-style artwork nodes and the smaller bio-entry markers.
- Click-through goes to the full historical bio/statement text, not an inline preview.
- Deliberately invites the comparison "did the self-description from this date match what the work from the same period was actually doing" — no need to build that comparison explicitly, just make sure both marker types are visible on the same timeline stretch so the comparison is possible for a viewer to make themselves.

## Part 3 — Data layer

This adds a second data layer on top of the existing artwork-position timeline data, not a replacement. The existing drag/scroll canvas mechanics (Section 2 of `homepage-interaction-jsonld-spec.md`) are unchanged; this is additive rendering only.

Fetch shape (illustrative, adjust to actual API conventions):

```json
{
  "artworks": [ /* existing */ ],
  "bioEntries": [{ "eventDate": "1993", "text": "...", "linkedArtworkSlugs": ["the-thinker"], "sourceSessionSlug": "..." }],
  "throughlines": [{ "linkedArtworkSlugs": ["the-thinker", "skulptur-projekte-munster"], "text": "...", "dateRecognized": "2026-07-15" }],
  "historicalReadings": [{ "type": "bio", "date": "2010-03-01", "slug": "..." }]
}
```

## Part 4 — Do NOT

- Do not let secondary markers visually compete with or overwhelm the primary artwork timeline — they are supplementary, smaller, and lower-contrast by default.
- Do not attempt a fully general multi-node throughline renderer in the first pass — start with simple two-point threads and iterate.
- Do not show historical bio/statement content inline on the timeline — link through only.
- Do not treat this brief as locked — it is explicitly speculative; expect visual iteration once something is on screen.

## Part 5 — Build order

**Step 1** — Data layer: extend the timeline's data fetch to include `bioEntries`, `throughlines`, `historicalReadings` alongside existing artwork data.
✓ All three new arrays present in the fetch, correctly scoped to `visibility: public` entries only.

**Step 2** — Bio-entry markers: render as a secondary track, positioned by `eventDate`, linked to source session and Bio page.
✓ Markers appear at correct timeline positions, visually subordinate to artwork nodes, clickable through to detail.

**Step 3** — Throughline threads: render simple static lines between two linked artwork positions.
✓ At least one throughline renders correctly as a visible connecting line; hover/click highlights it.

**Step 4** — Historical reading markers: distinct document-style node, click-through to full text.
✓ Markers render at correct dates, visually distinct from both other marker types, link to full historical document.

**Step 5** — Screenshot review with artist; iterate on visual weight/contrast/interaction before considering this "done."

## Part 6 — Verification checklist

- [ ] Existing artwork timeline drag/scroll/click behavior unaffected by new marker layers
- [ ] Bio-entry, throughline, and historical-reading markers are visually distinguishable from each other and from artwork nodes at a glance
- [ ] Private (`visibility: private`) bio/statement entries never render on the public timeline
- [ ] All new marker types link through to their correct destination (session, Bio page, Statement page, or full historical document)

---
*Timeline multi-marker brief · July 2026 · Speculative/exploratory — expect iteration*
