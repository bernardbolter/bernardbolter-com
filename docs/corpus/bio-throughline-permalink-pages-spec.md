# Bio Entry & Throughline Permalink Pages — Cursor Spec
*Derived from the sessions audit, July 24, 2026. Read alongside `bio-statement-capture-brief.md` (locks the base schema this spec extends), `corpus-tier-system-brief.md` (the tier model this mirrors), `sessions-jsonld-categorization-spec.md` and `sessions-audit-cursor-spec.md` (the `/sessions` gloss mechanism this reuses), `bio-page-spec.md`, `statement-page-jsonld-and-related-works-addendum.md`.*

---

## Part 0 — Why, and what this deliberately overrides

`bio-statement-capture-brief.md` gives bio-timeline entries and throughlines exactly two levels of detail: a one-to-three-sentence array item, and a link straight out to a full session transcript. There is nothing in between — no way to see *how* a pattern was found without reading an entire cataloguing session, and no permanent address for an entry to grow into over time. Artworks get this graduation (`/slug` → `/slug/vision` → `/slug/record` → `/slug/sessions`); these entries currently don't.

This spec gives each entry type its own permalink page and a curated middle layer, mirroring the corpus tier system's shape (short → contextual → full source) at a smaller scale appropriate to two arrays rather than 216 artworks.

**Two separate templates, not one shared template with a conditional block.** A bio entry is a fact anchored to one moment — single-threaded, may accumulate an annotation or a photo later, but doesn't have a growth lifecycle. A throughline is a pattern that gets *stronger* over time as `reinforcingSessions` grows, spans multiple artworks, and wants a fundamentally different visual treatment (a thread, not a point) — matching the distinction `timeline-multi-marker-brief.md` already draws between these two marker types. Only three things are shared logic between the templates (Part 2.3); everything else is deliberately independent so each can grow into its own thing without dragging the other along.

**This spec modifies a locked schema.** `corpus-relation-fields-and-linchpin-sessions-spec.md` Part 5 says "do not touch `bioTimelineEntries`/`statementThroughlines` field shapes — locked per Part 0." This spec unlocks them deliberately, with reasoning, rather than silently overriding that instruction — see Part 1 for exactly what changes and why. Lucky timing: the only throughline in production (`venice-biennale-2007`/`skulptur-projekte-m-nster-2007`) has an empty `reinforcingSessions` array, so the shape change below has no live data to migrate.

---

## Part 1 — Schema changes

### 1.1 Add to both `bioTimelineEntries` and `statementThroughlines`

```ts
{
  name: 'slug',
  type: 'text',
  unique: true,
  admin: {
    description: 'Auto-generated on create — confirm against whichever slug-generation utility Artworks/Series already use before writing a new one; do not invent a second slugification approach. Suffix with a short random string on collision rather than failing the write.',
  },
  hooks: {
    beforeValidate: [/* reuse existing slug hook pattern */],
  },
},
{
  name: 'discoveryExcerpt',
  type: 'richText',
  admin: {
    description: 'A curated pull from the session — the actual exchange where this was recognized, paraphrased or directly quoted. NOT the full transcript. Written at the same abstract-proposal beat that creates the entry itself (see session-flow-revision-brief.md step 9) — this is additional authoring at that moment, not a separate pass.',
  },
},
```

### 1.2 Change `statementThroughlines.reinforcingSessions` shape

Current shape (per `bio-statement-capture-brief.md`): `relationship, hasMany` — a flat array of session IDs.

New shape — an array of groups, so each reinforcement can carry its own note distinct from the generic session gloss:

```ts
{
  name: 'reinforcingSessions',
  type: 'array',
  admin: {
    description: 'Each later session that independently corroborated this pattern. The generic /sessions gloss line (fields covered, struggle flags, etc.) renders automatically per entry — reinforcementNote is for the specific, semantic reason THIS session reinforces THIS throughline, which the generic gloss can\'t express.',
  },
  fields: [
    { name: 'session', type: 'relationship', relationTo: 'sessions', required: true },
    { name: 'reinforcementNote', type: 'textarea', admin: { description: 'E.g. "Confirmed via the Basel revisit — same inside/outside language used unprompted." Optional but strongly encouraged.' } },
  ],
},
```

**Do NOT** treat this as a breaking migration concern — confirm the one live throughline record still has an empty array (per Part 0) before writing, and if so this is a pure schema swap with no data to transform.

---

## Part 2 — Page structure

### 2.1 File locations

```
src/app/(public)/bio/entries/[slug]/
  page.tsx
src/app/(public)/statement/throughlines/[slug]/
  page.tsx
src/components/BioEntry/
  BioEntryPage.tsx
src/components/Throughline/
  ThroughlinePage.tsx
src/components/shared/
  DiscoveryExcerpt.tsx        ← shared (Part 2.3)
  SessionGlossLine.tsx        ← shared, reused from /sessions work (Part 2.3)
  SessionSiblingLinks.tsx     ← shared (Part 2.3)
```

### 2.2 Bio entry page (`BioEntryPage.tsx`)

1. `eventDate` + full `text` — same content as the inline list item, larger/primary treatment here rather than subordinate
2. `discoveryExcerpt` (via shared `DiscoveryExcerpt` component, Part 2.3) — labeled clearly, e.g. "How this was found," visually distinct from the entry text above it (a quote-style treatment, not continuous prose)
3. Linked artwork(s), if `linkedArtworkSlugs` present — reuse the compact card component already built for `StatementRelatedWorks` (`statement-page-jsonld-and-related-works-addendum.md` Part 2) rather than inventing a new card style
4. Source session — via shared `SessionGlossLine` component (Part 2.3), linking through to the full session
5. `SessionSiblingLinks` (Part 2.3) — other bio entries or throughlines sharing this `sourceSessionRef`

### 2.3 Throughline page (`ThroughlinePage.tsx`)

1. `dateRecognized` + full `text`
2. `discoveryExcerpt` for the *originating* session (via shared component)
3. Linked artworks — compact cards (same reuse as 2.2.3), ordered by `yearCreated` so the page visually communicates the span the pattern covers, not just the list
4. **Reinforcement history** — chronological list combining the originating session and every `reinforcingSessions` entry: each row shows the `SessionGlossLine` for that session plus its `reinforcementNote` if present. This is the part of the page that visibly grows over time as the pattern gets corroborated — make growth here feel like progress, not just a longer list (e.g. a simple count header: "Confirmed across 3 sessions")
5. `SessionSiblingLinks` — other entries from the *originating* session only (not from reinforcing sessions — keep this scoped to "what else came out of the moment this was first recognized," not every session that ever touched it)

### 2.4 Shared components (the only shared logic — see Part 0)

- **`DiscoveryExcerpt.tsx`** — renders the `discoveryExcerpt` richText with a consistent quote/pull-style treatment. Used identically on both page types.
- **`SessionGlossLine.tsx`** — the exact gloss-line logic from `sessions-audit-cursor-spec.md` Part 4 (`fieldsCoveredThisSession`, `sessionStruggleFlag`, `revisitOf`, `linchpinFlag` composed into one line), extracted into a shared component so `/sessions`, the bio entry page, and the throughline page all render session summaries identically rather than three separate implementations drifting apart.
- **`SessionSiblingLinks.tsx`** — given a `sourceSessionRef` and the current entry's own `id`/`slug` (to exclude itself), queries both `bioTimelineEntries` and `statementThroughlines` for other entries sharing that session, and renders "Also from this session: [links]". Returns `null` / renders nothing if no siblings exist — do not show an empty section header.

---

## Part 3 — Update existing components

### 3.1 Bio/Statement page inline lists

Per `bio-statement-capture-brief.md` Part 3, the inline "Still being written" list currently links each entry directly to its source session (`"→ session"`). Change this: the inline list item links to the new permalink page (`/bio/entries/[slug]` or `/statement/throughlines/[slug]`) instead. The direct session link now lives on the permalink page (Part 2.2.4 / 2.3.4), not on the inline list. This makes the inline list a true Tier-1-style index into these pages, consistent with the tier system's shape.

### 3.2 JSON-LD

Both `generateBioJsonLd.ts` and `generateStatementJsonLd.ts` currently emit each array item as an inline `additionalProperty` with an `isBasedOn` pointing straight at the session URL (per `bio-statement-capture-brief.md` Part 4). Update both:
- Add a `"url"` key to each `additionalProperty` entry pointing at the new permalink page.
- Keep `isBasedOn` pointing at the originating session (unchanged).
- Each permalink page itself emits its own minimal JSON-LD (a `CreativeWork`, consistent with the `artism:` namespace conventions already used elsewhere) with `isBasedOn` listing the originating session plus, for throughlines, every `reinforcingSessions.session` — this is the one place all the corroborating sessions are listed together in machine-readable form, not just the originating one.

---

## Do NOT

- Do not build one shared page template with a conditional block for bio entries vs. throughlines — separate templates per Part 0.
- Do not migrate `reinforcingSessions` as a breaking change without first confirming the live record's array is actually empty (Part 1.2) — if it isn't, stop and flag back rather than silently transforming data.
- Do not let `SessionSiblingLinks` on a throughline page include siblings from every `reinforcingSessions` entry — scope to the originating session only (Part 2.3.5).
- Do not duplicate the `/sessions` gloss logic into a second implementation — extract and share it (Part 2.4).
- Do not show an empty "Also from this session" section header when there are no siblings — render nothing.
- Do not write `discoveryExcerpt` as a full transcript dump or a copy-paste of multiple messages — it's a curated pull, authored at the same beat the entry itself is created.
- Do not invent a new slug-generation approach — confirm against the existing Artworks/Series utility first (Part 1.1).

---

## Build order

**Step 1** — Schema: add `slug` + `discoveryExcerpt` to both arrays (Part 1.1); change `reinforcingSessions` shape on throughlines (Part 1.2), after confirming no live data needs migrating.

**Step 2** — Extract `SessionGlossLine` as a shared component from the existing `/sessions` implementation (built in `sessions-audit-cursor-spec.md`) — do this before building anything else, since both new pages depend on it.

**Step 3** — Build `DiscoveryExcerpt` and `SessionSiblingLinks` shared components.

**Step 4** — Build the bio entry page (`/bio/entries/[slug]`).

**Step 5** — Build the throughline page (`/statement/throughlines/[slug]`), including the reinforcement-history list.

**Step 6** — Update the Bio/Statement inline lists to link to the new permalink pages instead of directly to sessions (Part 3.1).

**Step 7** — Update both JSON-LD generators (Part 3.2), and add JSON-LD emission to the two new permalink pages themselves.

**Step 8** — Backfill: write `discoveryExcerpt` for the two existing bio entries and the one existing throughline (Venice Biennale 2007 / Münster 2007), since they predate this schema and would otherwise sit empty.

---

## Verification checklist

- [ ] `slug` auto-generates correctly on both entry types, handles collisions
- [ ] `discoveryExcerpt` renders distinctly from the entry's own `text` on both page types
- [ ] Bio entry page shows linked artworks (if any), source session gloss + link, and correct siblings
- [ ] Throughline page's reinforcement history shows the originating session plus all `reinforcingSessions`, each with its gloss line and optional note, in chronological order
- [ ] Throughline page's sibling links are scoped to the originating session only, not reinforcing sessions
- [ ] `SessionGlossLine` is one shared component, rendering identically on `/sessions`, the bio entry page, and the throughline page
- [ ] Inline Bio/Statement lists now link to permalink pages, not directly to sessions
- [ ] JSON-LD on both parent pages (`/bio`, `/statement`) includes the new `url` key per entry
- [ ] New permalink pages emit their own valid JSON-LD, with throughlines listing all reinforcing sessions in `isBasedOn`
- [ ] Backfilled `discoveryExcerpt` exists for the two Venice-2007-era bio entries and the one live throughline
- [ ] No empty "Also from this session" section renders when there are no siblings

---

*Bio entry & throughline permalink pages · July 24, 2026*
*Derived from: Bernard Bolter × Claude, sessions audit follow-up*
*Status: complete draft — ready for Cursor implementation*
