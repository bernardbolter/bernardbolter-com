# Breaking Down Art on A Colorful History — Site Integration Brief
*Derived from the Venice Biennale 2007 Art/Official session, July 23, 2026.*
*Read alongside `ach-schem-extension-artwork-page-design.md`, `print-data-architecture-reference.md`, `dcs-editiontiers-ownership-addendum.md`, `art-official-consolidated-session-flow-spec.md`.*

**Status: brief, not locked spec.** Contains open decisions flagged explicitly — resolve those before treating this as implementation-ready.

---

## Part 1 — Why this needs its own brief, not a straight reuse of the ACH pattern

Breaking Down Art (BDA) shares A Colorful History's core material — photo transfers and acrylic on canvas — which is why it belongs on that site rather than standing alone. But the *nature* of the source material is fundamentally different, and the existing ACH schema (`olderStory`/`newerStory`, `keyHistoricalDates`) is built around a specific conceit that doesn't hold for BDA:

- **ACH's conceit:** a historical photograph of a place, with its own lost context and technology history (`olderStory`), answered by Bernard's act of painting it now (`newerStory`). The "older layer" is public history.
- **BDA's conceit:** photographs Bernard took himself of other artists' work and exhibition spaces, recomposed into an invented room. The "older layer" isn't public history — it's contemporary art Bernard was looking at, half-fluent in, and using as raw material without fully knowing what it meant yet. The Venice Biennale 2007 session surfaced this directly: unlike ACH and DCS, which disclose their operation visually, BDA is structurally opaque — a blind reading can't identify the sources without the artist naming them, because the sources are personal encounters, not archival record.

Reusing `olderStory`/`newerStory` verbatim would misrepresent this. BDA needs parallel fields with different semantic framing, sharing the same visual/component system.

---

## Part 2 — Schema: new BDA-specific fields (Artworks, BDA tab)

Add a new series tab, following the existing tab-architecture pattern (`admin.condition: (data) => data?.series?.slug === 'breaking-down-art'`).

| Field | Type | Notes |
|---|---|---|
| `encounterContext` | richText, localized | Replaces `olderStory` semantically. Where/when the source photographs were taken, what was being seen, the artist's relationship to that context at the time (e.g. "school trip, first and only time at the Biennale, overwhelmed"). Drawn out in Art/Official dialogue — never agent-drafted. |
| `compositionalResponse` | richText, localized | Replaces `newerStory` semantically. How the disparate photographed material was recomposed into an invented single space — the compression problem itself, since this (per the Venice session) is often where the real difficulty and meaning of these works sits. |
| `referencedWorks[]` | array | Replaces `keyHistoricalDates[]`. Each entry: `{ artistName: text, workTitle: text (nullable), confirmationStatus: select('confirmed' \| 'artist-recalled-unconfirmed' \| 'unidentified'), note: text, wikipediaOrSourceUrl: text (nullable) }`. Confirmation status matters here — the Venice session had all three states in one painting (Shonibare confirmed via research, Baselitz artist-confirmed but unlocated, concrete/sandbag piece unidentified). Do not force a false confirmed status to fill the field. |
| `seriesHingeNote` | text | Short note if this work marks the series' end or beginning — feeds `seriesHingeMarker` (see `corpus-relation-fields-and-linchpin-sessions-spec.md`) rather than duplicating it; this field is BDA-specific framing, that one is the cross-series structural flag. |

**Do NOT** add per-date Wikipedia links in the ACH sense — BDA's references are artworks/artists, not historical events, so `referencedWorks[]` replaces that entirely rather than extending it.

---

## Part 3 — Component reuse vs. new build

Reuse as-is, no changes needed:
- `ArtworkImage`, `TitleBlock`, `MiniNav`, `ZoomMode`, `RevealSlider`, `StatusBadge`, `OGImage`

Reuse component shell, change data binding:
- `StoryColumns` → bind to `encounterContext` / `compositionalResponse` instead of `olderStory` / `newerStory`. Left/right layout and pan-on-mobile behavior unchanged.
- `HistoricalDatesTimeline` → needs a BDA variant, since `referencedWorks[]` isn't date-anchored the way `keyHistoricalDates[]` is. Suggest a simpler horizontal list/chip layout — artist name + work + confirmation-status indicator (visually distinct treatment for `unidentified` entries, e.g. a dotted border or muted tone, so a viewer can see at a glance which references are open threads vs. confirmed) — rather than forcing a timeline metaphor onto non-chronological references.

New component:
- `ReferenceConfidenceChip` — small inline indicator for `confirmed` / `artist-recalled-unconfirmed` / `unidentified`, used within the new referenced-works list.

---

## Part 4 — Prints and editions

**Resolved 2026-07-23: Breaking Down Art will use limited (tracked) editions**, per `dcs-editiontiers-ownership-addendum.md` / `print-data-architecture-reference.md` — the same `SeriesEditionTiers` system as Mediums of Perception and DCS, not the untracked open-edition pattern used elsewhere in A Colorful History.

Only 3 Breaking Down Art artworks exist currently, so the initial build scope is small. Still needs, before Cursor builds the commerce fields:

- A `SeriesEditionTiers` record for Breaking Down Art (or a BDA sub-series under ACH, matching however the series relation is modeled) — tier name, edition size, AP count, print dimensions, substrate, and print technique are **not yet specified in this brief** and must not be guessed. Flag for a short follow-up decision (likely a quick confirm, not a full session) before Step 1 of the build order below.
- Each of the 3 BDA artworks sets `hasEditions: 'limited'` and gets an `editionTiers[]` entry relating to that `SeriesEditionTiers` record, per the existing DCS pattern (already proven working on Basel Switzerland).
- `vendureProductId` (shared per tier) and `vendureVariantId` (per-artwork) follow the same access-restricted, admin-only pattern as elsewhere — never public fields.

---

## Part 5 — Art/Official dialogue: filling these fields in conversation

Since BDA sessions now populate a distinct field set, the dialogue needs a BDA-aware branch — same mechanism as the existing series-conditional tabs, applied to the conversation layer, not just the schema layer.

**New guidance for `art-official-dialogue-spec.md` (addendum, not a rewrite):**

- When `series.slug === 'breaking-down-art'`, the "art historical resonances" phase (see `art-official-handoff.md` conversation sequence) should populate `referencedWorks[]` instead of `movementTags`/`styleTags` alone — asking about each recognizable reference individually, capturing artist name, work if known, and being explicit with the artist about confirmation status rather than assuming. This session (Venice Biennale 2007) is a working example: three references surfaced, three different confirmation levels, and none should have been forced to a single-status "resolved" answer.
- `encounterContext` and `compositionalResponse` map naturally onto existing phases already in the locked sequence — no new question phase needed, just route the answers to these fields instead of generic `intent`/`makingNote` when the series is BDA.
- Retroactive note: **this Venice Biennale 2007 session already produced the content for these fields**, before the schema existed. Once built, backfill `venice-biennale-2007` from this session's transcript rather than re-running a session — `encounterContext` from the Biennale/Rietveld material, `compositionalResponse` from the room-compression discussion, `referencedWorks[]` from the Shonibare/Baselitz/concrete-bag exchange.

---

## Part 6 — Do NOT

- Do not reuse `olderStory`/`newerStory` field names for BDA — the semantic mismatch will confuse future authors of the schema, even though the visual component is shared.
- Do not force `referencedWorks[]` entries to a `confirmed` status without genuine verification — an unresolved thread (like the concrete/sandbag piece) should display as unresolved, not quietly dropped or falsely confirmed.
- Do not build `SeriesEditionTiers` for BDA until tier name, size, AP count, dimensions, and substrate are confirmed (Part 4) — the tracked/limited decision itself is resolved, but the tier specification values are not yet given and must not be guessed.
- Do not duplicate `seriesHingeMarker` logic inside `seriesHingeNote` — one is the structural flag (cross-series), the other is prose specific to the BDA page.

---

## Part 7 — Build order

**Step 1** — Confirm `SeriesEditionTiers` values for Breaking Down Art (tier name, edition size, AP count, dimensions, substrate, print technique) with Bernard before building any commerce fields.
**Step 2** — Add BDA series tab and its four fields (Part 2) to Artworks collection.
**Step 3** — Wire `StoryColumns` to the new fields; build `HistoricalDatesTimeline`'s BDA variant and `ReferenceConfidenceChip`.
**Step 4** — Build the `SeriesEditionTiers` record and wire `hasEditions: 'limited'` + `editionTiers[]` for the 3 existing BDA artworks, per the DCS pattern.
**Step 5** — Add the dialogue addendum to `art-official-dialogue-spec.md`.
**Step 6** — Backfill `venice-biennale-2007` from this session's transcript once schema exists.

---

## Verification checklist

- [ ] BDA tab fields present, visually distinct naming from ACH's `olderStory`/`newerStory`
- [ ] `referencedWorks[]` entries display confirmation status visibly, unresolved entries not hidden or falsely marked confirmed
- [ ] Print/edition path for BDA matches whichever Part 4 decision was made, no orphaned commerce fields
- [ ] Art/Official dialogue routes BDA sessions' art-historical-reference answers into `referencedWorks[]`
- [ ] Venice Biennale 2007 backfilled correctly once schema is live

---
*Breaking Down Art × A Colorful History integration brief · July 23, 2026 · Bernard Bolter × Claude*
