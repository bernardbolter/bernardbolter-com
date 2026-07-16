# Studio Nav Restructure + Social Campaign System — Spec

*Companion to `studio-section-summary.md`, `studio-app-spec.md`, `studio-app-spec-addendum.md`, `brief-07-footage-pipeline.md`. Supersedes the flat five-tab nav (Upload / Paintings / Notes / Episodes / Digest) with a three-tier hierarchy, and adds a full social-campaign system on top of the existing FieldNotes pipeline.*

*Written: July 2026*

---

## Part 0 — Rationale

The existing `/studio` spec has five flat tabs. This restructures them into a hierarchy of **Input → Tools → Reference**, and adds a new subsystem — the **Social Campaign** model — that reuses the existing FieldNotes pipeline (Moondream/Whisper processing, weekly review) but adds campaign planning, a scheduling calendar, a flexible connections graph, and a structured path from raw footage to finished posts across Instagram, TikTok, and YouTube.

Nothing here removes existing FieldNotes, Lines, Episodes, or Digest concepts. This spec re-homes them under the new nav and extends them with campaign-specific collections.

---

## Part 1 — Nav Restructure

Replace the flat tab bar with three top-level groups. Each group is a nav section, not a single page — some contain multiple sub-views.

### 1.1 Input
Upload, split by FieldNote `mediaType` groups:
- **Photos**
- **Videos**
- **Audio**
- **Text** — new. Not a generic notes catch-all: Text FieldNotes are specifically drafts/raw material intended to feed downstream Tools, starting with Video Scripts for Social. (See 1.4, `FieldNotes.mediaType` addition.)

This is the existing Upload tab, reorganized by media type rather than shown as one undifferentiated dropzone.

### 1.2 Tools (expandable — designed to grow)
High-level working functions, not passive views. Each is a workspace where active work happens.

- **Painting Animation Maker** — pulled out of the Paintings dossier. This is where you reorder process photos, redo crop/color correction, and regenerate the timelapse (canvas detection → crop → color correction → FFmpeg assembly). The Paintings entry in Reference only *displays* the finished output — it does not initiate or edit generation.
- **Video Scripts for Social** — consumes Text FieldNotes. Where script/shot-list sessions happen with Claude, producing Shot records (see Part 6) and, eventually, an ordered rough-cut plan exported as an EDL.
- *(open slot — additional Tools get added here as they come up; no schema change required to add one, just a new nav entry + its own workspace)*

### 1.3 Reference
Read-only browsing and status views.
- **All Media** — the existing Notes tab; browse every FieldNote.
- **Digest** — the existing weekly read-only overview, extended per Part 8.
- **Paintings** — per-painting dossier: process photo timeline, final image, the *finished* timelapse (read-only), related FieldNotes, link to the archive record. Editing/regeneration lives in the Painting Animation Maker Tool, not here.

### 1.4 Schema change — FieldNotes
Add `text` as a valid `mediaType` value (existing values: `photo`, `video-broll`, `video-observation`, `video-performance`, `video-process`, `voice-memo`). Text FieldNotes skip Moondream/Whisper processing (no media to process) but still participate in weekly review and the `connectsTo` graph.

Add `museumSourced` (boolean, default `false`) to FieldNotes — flags museum captures distinctly within the existing pipeline. Museum FieldNotes are photo + spoken note (Whisper-transcribed), reviewed in batches (per visit, or once enough material accumulates) rather than individually.

---

## Part 2 — Campaign

A generic, reusable top-level entity. Not specific to the East Side Gallery campaign — built so future campaigns reuse the same structure.

### `Campaigns` collection
| Field | Type | Notes |
|---|---|---|
| `name` | text | e.g. "East Side Gallery Freestyle" |
| `startDate` | date | |
| `finaleDate` | date | |
| `status` | select | `planning` \| `active` \| `final-push` \| `complete` |
| `cadenceRules` | richText or structured notes | Per-campaign, plain-language rules — e.g. "archive posts alternate days," "2 TikTok posts/day is already high volume for this account," ramp-up logic for reels as finale approaches. Not a rigid rule engine — read by you and referenced in weekly sessions, not auto-enforced. |
| `bufferPhaseEnabled` | boolean, default false | Toggle for Phase 2 (see Part 9). When true, Queue Items get pushed to Buffer instead of posted manually. |
| `finaleScript` | relation → FinaleScripts | See Part 6. |

### Do NOT
- Do NOT hardcode the East Side Gallery dates or cadence anywhere outside a `Campaigns` record.
- Do NOT build automatic cadence enforcement (no auto-generated schedule) — cadence rules inform your manual scheduling and the Digest's gap-flagging, nothing more.

---

## Part 3 — Theme (reasoning layer)

Produced during the weekly review session. Groups related content and names the connection driving a batch of posts.

### `Themes` collection
| Field | Type | Notes |
|---|---|---|
| `campaign` | relation → Campaigns | |
| `title` | text | e.g. "Berlin brutalism," "Week 3 training" |
| `sourceContent` | relation[] → FieldNotes / Artworks (polymorphic or two separate fields) | What the theme was drawn from |
| `notes` | longText | Reasoning captured during the session |
| `date` | date | Session date |
| `informedByMetrics` | relation[] → QueueItems | Optional — prior posts' metrics that informed this theme |

A Theme can spawn more than one Queue Item over time without redoing the reasoning.

---

## Part 4 — Queue Item (calendar/scheduling layer)

The atomic schedulable unit. Single platform per item — never dual-platform.

### `QueueItems` collection
| Field | Type | Notes |
|---|---|---|
| `campaign` | relation → Campaigns | |
| `theme` | relation → Themes | optional |
| `platform` | select | `instagram` \| `tiktok` \| `youtube-shorts` \| `youtube-longform` |
| `contentType` | select | `archive-post` \| `museum-post` \| `reel` \| `story` \| `longform` |
| `linkedContent` | relation[] → FieldNotes / Artworks | Source material |
| `captionText` | longText | |
| `hashtags` | relation[] → HashtagTags (see Part 8) | |
| `suggestedTime` | datetime | |
| `status` | select | `idea` → `drafted` → `scheduled` → `posted` → `promoted` |
| `promotedFrom` | relation → QueueItems (self) | Set when an Instagram item is promoted from a TikTok original. Keeps lineage in the connections graph. |
| `metricsSnapshots` | array of `{ date, views, likes, shares, comments }` | Manually entered, cumulative, dated — not a live integration. |

### Platform/promotion logic
- TikTok is the high-volume proving ground (new, semi-anonymous account) — post frequently, low stakes.
- Instagram is curated (1,100 followers, established) — archive posts, museum posts, and anything promoted over from TikTok.
- Promotion is a manual judgment call, informed by `metricsSnapshots`, not automatic. Promoting sets `status: promoted` on the TikTok item and creates a new Instagram `QueueItem` with `promotedFrom` pointing back to it.

### Archive posts — special case
Archive posts (`contentType: archive-post`) draw from the 216-artwork corpus and don't go through FieldNotes processing. Ordering is **not** a fixed pre-built queue — after the first few hand-picked posts (see bootstrapping, below), subsequent picks are guided by `connectsTo` links from museum posts (Part 5). This means archive posts can't be scheduled much further ahead than the museum connections driving them — a real constraint on the "stay a week ahead" goal, worth remembering in the weekly session.

**Bootstrapping**: the first several archive `QueueItems` are hand-picked manually, with no `connectsTo` dependency, since no museum visits will have happened yet.

---

## Part 5 — connectsTo (flexible relation graph)

One generic relation, usable across content types, not a special-cased field per stream.

### Implementation
Add `connectsTo` (relation[], polymorphic — can point to Artworks, FieldNotes, or QueueItems) to each of those collections, or implement as a separate `Connections` join collection if Payload's polymorphic relations are unwieldy in practice — Cursor's call based on what Payload v3 supports cleanly.

Used for: archive↔museum connections, TikTok-original↔promoted-Instagram-version, museum↔museum, observational↔product, or anything else that emerges. Always optional, never required.

---

## Part 6 — Finale Script + Segments

The long-form East Side Gallery script is structurally different from a reel Shot list — it's a whole composed arc, not an execution unit. Build this now (Phase 1), even before the script text is fully drafted, so other content can start referencing it early.

### `FinaleScripts` collection
| Field | Type | Notes |
|---|---|---|
| `campaign` | relation → Campaigns | |
| `title` | text | |
| `segments` | relation[] → Segments (ordered) | |

### `Segments` collection
| Field | Type | Notes |
|---|---|---|
| `finaleScript` | relation → FinaleScripts | |
| `order` | number | Position along the wall |
| `wallSection` | text | Which stretch of the East Side Gallery |
| `paintedContent` | longText | What's painted there — description/context |
| `angle` | longText | The theme/angle you want to hit in this segment |
| `connectionNotes` | longText | How this segment relates to earlier/later ones |
| `coverageStatus` | select, computed or manual | `no-footage` \| `some-takes` \| `covered` — derived from linked Shots/Takes |

### Shot → Segment link
Add `segment` (relation → Segments, optional) to the existing `Shot` schema (Part 7). This lets any training reel be understood as "practice footage for Segment 4," and lets museum/archive posts reference a Segment too via `connectsTo`, tracing a line from a museum visit to how a specific stretch of the finale will be discussed.

The weekly Digest gains a **Segment coverage view**: which segments have training footage, which don't — same logic as shot-coverage-gap flagging, applied at the finale level.

---

## Part 7 — Shot / Take (scripted reels)

Existing Episodes/MoP concept, tightened for the training-reel pipeline specifically.

### `Shots` collection
| Field | Type | Notes |
|---|---|---|
| `campaign` | relation → Campaigns | |
| `segment` | relation → Segments | optional, see Part 6 |
| `description` | text | The beat this shot covers |
| `intendedFraming` | text | |
| `status` | select | `needed` \| `shot` \| `selected` \| `gap` |

### `Takes` collection
| Field | Type | Notes |
|---|---|---|
| `shot` | relation → Shots | |
| `takeNumber` | number | |
| `videoFieldNote` | relation → FieldNotes | The actual footage |
| `quickNote` | text | Your good/bad note on this take |
| `selected` | boolean | Set during assembly review |

### EDL export
The assembly session marks selected Takes per Shot. A rough-cut-plan step produces an **EDL export** — an ordered list of selected Takes' in/out points — for manual import and fine-tuning in DaVinci Resolve. No scripting-API automation; EDL export + manual Resolve work is the confirmed approach.

---

## Part 8 — Calendar, Hashtags, Museum specifics

### Calendar
Not a rigid one-slot-per-day model. A day-by-day entity where each day holds an **array** of QueueItem references — a day can have zero, one, or several candidates.

### `CalendarDays` collection
| Field | Type | Notes |
|---|---|---|
| `date` | date | |
| `queueItems` | relation[] → QueueItems | |

The Digest can flag "this date has nothing scheduled yet" once a campaign is within its target look-ahead window.

### `HashtagTags` collection
Small reusable lookup so hashtag/tag sets can be tracked over time rather than retyped and lost.

| Field | Type | Notes |
|---|---|---|
| `label` | text | e.g. `#berlinart` |
| `usageHistory` | relation[] → QueueItems (read via reverse lookup) | Lets you eventually see "posts using this tag performed well/poorly" |

### Museum stream — de-scoped intentionally
Light touch only for this campaign: photo + casual spoken commentary, no formal recording, no permission-seeking. No legal/permission machinery gets built into this schema. After the campaign concludes, if there's something concrete worth presenting to an institution, log that as a new `artism:ProjectEvent` ("campaign complete, approaching museums with X") — not a feature of this system.

---

## Part 9 — Buffer Integration (Phase 2)

Not built at launch. Flagged as a later phase, activated per-campaign via `Campaigns.bufferPhaseEnabled`.

**Division of responsibility**: this system remains the reasoning/connections layer (captions, hashtags, theme reasoning, connections graph, manual metrics entry for now). Buffer (or an equivalent scheduler) becomes the mechanical publish layer — no custom OAuth/posting-API integration gets built here.

When `bufferPhaseEnabled` is true and a QueueItem reaches `status: scheduled`, the intended flow is: push the item's payload (caption, hashtags, media, suggested time) into Buffer's queue rather than relying on manual posting. Exact push mechanism (manual copy-paste vs. an eventual API push from Payload to Buffer) is left open for a dedicated Phase 2 spec — do not attempt to build this in Phase 1.

**Plan reference** (for budgeting, not enforcement): Buffer's free plan allows 3 channels with a 10-post queue cap per channel (not a lifetime cap — items free up as they publish). Essentials is $6/month/channel for an unlimited queue. Given the final-push volume, Essentials across Instagram, TikTok, and YouTube (~$18/month) is the likely tier once Phase 2 activates.

**Verify before relying on it**: some platforms have historically required a manual final tap on mobile for certain post types (e.g. Reels). Confirm fully automatic publishing works for the specific plan/platform combination in use before the final 2-week push depends on it.

---

## Part 10 — Campaign closure

On `finaleDate` (or shortly after), log a new `artism:ProjectEvent` marking the campaign's completion — a wrap reflection, same pattern as other threshold moments already recorded in the practice. This is not a new collection; it uses the existing ProjectEvent stream.

---

## Part 11 — Build order (Phase 1)

1. Nav restructure: Input / Tools / Reference groups; move Painting Animation Maker out of Paintings tab into its own Tool workspace; Paintings becomes read-only dossier.
2. FieldNotes schema: add `text` mediaType, `museumSourced` boolean.
3. Campaigns collection.
4. Themes collection.
5. QueueItems collection (with `promotedFrom`, `metricsSnapshots`).
6. connectsTo relation (polymorphic or join collection — confirm approach with Cursor based on Payload v3 support).
7. FinaleScripts + Segments collections; add `segment` relation to Shots.
8. Shots + Takes collections; EDL export function.
9. CalendarDays collection; Digest gap-flagging view; Segment coverage view.
10. HashtagTags collection.
11. Video Scripts for Social Tool workspace: Text FieldNote intake → Shot/Take session UI.
12. Painting Animation Maker Tool workspace: reorder/edit/regenerate timelapse.

**Explicitly NOT in Phase 1**: Buffer integration (Part 9), any museum permission/legal workflow, any automated cadence enforcement, any TikTok/Instagram analytics API integration.

---

## Part 12 — Verification checklist

- [ ] Nav shows three groups: Input, Tools, Reference — not five flat tabs
- [ ] Painting Animation Maker is its own workspace; Paintings dossier has no edit/regenerate controls, only display
- [ ] FieldNotes `mediaType` accepts `text`; Text FieldNotes skip Moondream/Whisper but appear in weekly review
- [ ] `museumSourced` flag exists and filters correctly in batch review views
- [ ] Campaigns collection supports multiple campaigns (not hardcoded to East Side Gallery)
- [ ] QueueItems are single-platform; no dual-platform item exists
- [ ] Promoting a TikTok item creates a new Instagram QueueItem with correct `promotedFrom` reference
- [ ] `connectsTo` works across at least Artworks ↔ FieldNotes ↔ QueueItems
- [ ] Segments are ordered under a FinaleScript; Shots can optionally reference a Segment
- [ ] Segment coverage view correctly reflects `no-footage` / `some-takes` / `covered` based on linked Shots/Takes
- [ ] EDL export produces a valid ordered in/out point list from selected Takes
- [ ] CalendarDays correctly holds multiple QueueItems per date
- [ ] HashtagTags are reusable across QueueItems, not re-typed per post
- [ ] `bufferPhaseEnabled` field exists on Campaigns but no Buffer push logic is implemented in Phase 1
