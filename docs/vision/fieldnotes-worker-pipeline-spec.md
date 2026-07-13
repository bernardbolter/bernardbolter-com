# FieldNotes Worker Pipeline — Build Spec
## First use case: Rap Critic training footage, this week

*Extends: ach-site-design-and-architecture.md Parts 1–2 (FieldNotes collection, Hetzner stack)*
*Adds: slate/take/verdict fields, Capture Presets, overnight processing window, private JSON export*
*Supersedes (temporarily): the "always public, no flag" philosophy in ach-site-design-and-architecture.md — this stays private until a week of real footage exists to design curation against. Public `fieldnotes.jsonld` remains the eventual target; revisit once there's real data.*

---

## 1. Schema extension — FieldNotes collection

Existing fields (from ach-site-design-and-architecture.md §1.1) stay as-is. Add:

| Field | Type | Notes |
|---|---|---|
| `episode` | Text | Parsed from spoken slate, e.g. "e01". Blank if not a numbered episode (b-roll library, museum reels). |
| `shotType` | Select | `HOOK` · `VERSE` · `ARRIVE` · `DETAIL` · `WIDE` · `WALK` · `CROWD` · `TALK` · `AMBIENT` · `BTS`. Closed vocabulary — parsed from slate. |
| `take` | Number | Parsed from slate ("take two" → 2). Blank if not stated. |
| `verdict` | Select | `keeper` · `scrap` · `maybe` · (blank = not yet spoken/parsed). Parsed from clip tail. |
| `capturePreset` | Relation → CapturePresets | Which preset was used at upload. Drives pipeline steps and default field values. |
| `slateParseStatus` | Select | `parsed` · `not-found` · `partial`. Lets you filter for clips where the parser failed and fields need manual entry. |

`processingStatus` values get one addition: `queued` (uploaded, waiting for the nightly window — distinct from `pending`, which can mean "about to be picked up right now" once the window is open). Practically: `queued` → `processing` → `complete` / `failed`.

---

## 2. New collection — CapturePresets

One record per repeatable shoot type. Studio admin upload flow: pick a preset, drop files, done — no per-file field-filling.

| Field | Type | Notes |
|---|---|---|
| `name` | Text | e.g. "Training reel — verse", "Museum harvest", "B-roll library" |
| `mediaType` | Select | Maps to existing FieldNotes mediaType values |
| `pipelineSteps` | Checkboxes | `keyframes` · `moondream` · `whisper` · `slateParse`. Defaults inherited from mediaType, overridable per preset. |
| `defaultEpisode` | Text | Optional pre-fill. Blank for one-offs (b-roll, museum visits). |
| `defaultLocationName` | Text | Optional pre-fill. |
| `transcriptLabel` | Select | `shooter-description` · `speech` · `none` (per existing spec §1.1) |
| `keyframeIntervalSec` | Number | Default 10. Override per preset — e.g. DETAIL-heavy presets might use 5. |

**On the fly:** if no preset fits, create a new CapturePreset record (a two-minute Payload form) rather than building new logic. The flexibility lives in data, not code.

**Upload flow (studio admin, mirrors the existing photo flow):** select preset → drop files → FieldNotes record(s) created with `processingStatus: queued`, `mediaFile` written to local scratch disk, preset's defaults pre-filled. No R2 push at this stage — local storage only, per current decision. Cards show thumbnail (once available), status badge, preset name.

---

## 3. Hetzner worker — processing window

Runs as a background daemon or cron-scheduled job, **fixed window 02:00–08:00** local time. Outside the window: no processing runs, regardless of queue depth. Reasoning: keeps CPU fully free during the day, and a week's batch of clips (Moondream at 15–30s/image) can comfortably take an hour or more unattended overnight.

```
02:00 — window opens
  → query FieldNotes where processingStatus: queued
  → for each, in upload order:
      processingStatus: processing
      ffmpeg: extract keyframes (interval from capturePreset.keyframeIntervalSec,
               default 10s) + extract audio track as 16kHz mono wav
      whisper (faster-whisper, medium, multilingual, no language hint):
               transcribe audio → transcript + detectedLanguage
      slate parser: run against transcript (see §4)
      moondream: tag each keyframe → tags array per keyframe (after slate parse — needs shotType)
      writeback: keyframes[], audioTranscript, detectedLanguage, duration,
                 episode, shotType, take, verdict, slateParseStatus
      delete extracted audio wav (scratch, disposable)
      keep keyframe images on R2 (CDN URLs in keyframes[].imageUrl)
      processingStatus: complete (or failed, with error logged)
08:00 — window closes
  → any clip still processingStatus: processing when window closes:
      finish current clip, then stop (don't kill mid-clip)
  → remaining queued clips wait for next night
```

If the queue empties before 08:00, the worker simply idles until the next window — no need to process ahead of schedule.

---

## 4. Slate parser logic

Runs against the Whisper transcript text, not the audio directly.

**Head parse (first ~15 words of transcript):**
```
regex: /slate[.,]?\s*episode\s+(\w+)[.,]?\s*(hook|verse|arrive|detail|wide|walk|crowd|talk|ambient|bts)[.,]?\s*(?:take\s+(\w+))?/i
```
- Group 1 → episode (convert word-number "one" → "e01" via a small number-word lookup; fall back to raw text if conversion fails)
- Group 2 → shotType (uppercase, matches the closed vocabulary directly)
- Group 3 → take (word-to-number conversion, e.g. "two" → 2)
- Non-episode slates ("Slate. B-roll library." / "Slate. Museum reel, [name].") — separate lighter pattern, writes to `locationName` or leaves `episode` blank as appropriate.

**Tail parse (last ~5 words of transcript):**
```
regex: /(keeper|scrap|maybe)\s*\.?\s*$/i
```
Straightforward — the verdict convention is designed to be parser-friendly by being three fixed words spoken alone at the end.

**On parse failure:** `slateParseStatus: not-found` (head), or leave `verdict` blank (tail) — never guess. A studio admin view filtered to `slateParseStatus: not-found OR partial` becomes the manual-cleanup queue — expected to be non-empty some of the time, especially early on while the spoken convention becomes habit.

---

## 5. Private JSON export (not the public fieldnotes.jsonld)

A separate, unauthenticated-but-unlisted route (not linked from anywhere, not in a sitemap) — distinct from the eventual public endpoint.

**Route:** something like `/api/fieldnotes/export?from=2026-07-14&to=2026-07-20&preset=training-reel&episode=e01` — filter params optional and combinable.

**Returns:** flat JSON array, one object per FieldNote matching the filter:
```json
{
  "id": "...",
  "capturedAt": "2026-07-18T16:42:00Z",
  "locationName": "Neptunbrunnen",
  "mediaType": "video-performance",
  "episode": "e01",
  "shotType": "VERSE",
  "take": 2,
  "verdict": "keeper",
  "duration": 94,
  "audioTranscript": "...",
  "detectedLanguage": "en",
  "keyframes": [
    { "timestamp": 0, "tags": ["man", "statue", "fountain", "afternoon light"] },
    { "timestamp": 10, "tags": [...] }
  ],
  "writtenNote": null,
  "slateParseStatus": "parsed"
}
```
No file URLs, no video/audio binary — text and tags only. This is what gets uploaded/pasted into a Claude session for a Friday review. Keyframe *images* (not just tags) can be attached separately to the chat when a visual second opinion is wanted — the export gives the reading list, not the whole library.

---

## 6. Test gate — before real shooting starts

One throwaway clip, ~30 seconds, shot on a balcony or similar:
1. Say the slate: "Slate. Episode one. Talk. Take one."
2. Talk for 20 seconds about anything.
3. Say the verdict: "Keeper."
4. Upload via a CapturePreset (create a minimal test preset if none exists yet).
5. Wait for the next 02:00–08:00 window (or set `FIELDNOTE_PROCESSING_FORCE=true` and trigger the worker once, for same-day validation).
6. Check the FieldNotes record: did `episode`, `shotType`, `take`, `verdict` all parse correctly? Is the transcript clean? Do keyframe tags say anything sensible?

If all four slate fields parse correctly and the transcript is legible, the loop is proven end-to-end — real shooting can start. If not, fix the parser or the spoken convention before committing a week of footage to it.

---

## 7. Open items carried forward

- [ ] Public `fieldnotes.jsonld` curation model — revisit after this week's test, using real data (which clips are worth publishing, what to do with scrap-verdict takes, whether raw transcripts or only written notes go public)
- [ ] Whether freestyle-rap transcripts need a distinct review flag before being treated as "complete" (existing doc already flags this for `freestyleTranscript` — same logic likely applies to `audioTranscript` when `shotType: VERSE`)
- [ ] R2 push — currently out of scope; local scratch + phone only, per current decision. Revisit if local storage becomes a constraint.
- [ ] Studio admin UI: preset picker + status badges + thumbnail grid (mirrors existing photo flow — should be a small extension, not new pattern)

---

*Written July 2026. Companion to shooting-plan-ai-pipeline.md and ach-site-design-and-architecture.md.*
