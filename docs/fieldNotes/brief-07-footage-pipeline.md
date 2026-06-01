# Brief 07 — Footage Pipeline & Clip Organisation
## bernardbolter.com · Private Server

*Decisions captured from working session, May 2026*
*Read alongside: brief-05-schema-implementation.md · ach-schema-and-build.md*

---

## Overview

This brief covers the `FieldNotes` collection — the unified schema for all captured media (video, photo, voice, text) — plus the Hetzner server processing pipeline that turns raw uploads into searchable, storyboard-ready records.

The goal: a footage library that is queryable by what Bernard observed, not just what is visually in frame. After 10 cities and 1000+ clips, the system should be able to answer "find all B-roll from Berlin where Bernard mentioned light quality" or "find all process clips of photo transfer across any city."

---

## The FieldNotes Collection

*Single Payload collection. Replaces the earlier separate `RawFootage` concept — everything is a field note, `mediaType` describes the format.*

### Fields — set at upload

| Field | Type | Notes |
|---|---|---|
| `mediaType` | Select | `text` · `photo` · `video-broll` · `video-observation` · `video-performance` · `video-process` · `voice-memo` |
| `capturedAt` | DateTime | When the note was captured. Defaults to upload time. |
| `city` | Text | City where captured. Optional — set manually or inferred from GPS. |
| `location` | Group `{ lat, lng }` | GPS coordinates. Optional. |
| `locationName` | Text | Human-readable place name. e.g. "Brandenburger Tor, west side" |
| `mediaFile` | Upload → R2 | The photograph, video, or audio file. |
| `writtenNote` | Text | For `mediaType: text` or supplementary note on any media type. |
| `relatedArtwork` | Relation → Artworks | Optional connection to an archive painting. |
| `processingStatus` | Select | `pending` · `processing` · `complete` · `failed`. Default `pending`. |

### Fields — written by server, not manually

| Field | Type | Notes |
|---|---|---|
| `audioTranscript` | Text | Whisper transcription of spoken audio. For `video-broll` this is Bernard's spoken description. For observation/performance/process this is speech content. |
| `transcriptType` | Select | `shooter-description` · `speech` · `none` |
| `keyframes` | Array `{ timestamp: seconds, imageUrl: R2 path, tags: [text] }` | Extracted frames + Moondream visual tags. |
| `detectedLanguage` | Text | ISO language code from Whisper. |
| `duration` | Number | Video duration in seconds. |

---

## Processing Pipeline by mediaType

| mediaType | ffmpeg | Moondream | Whisper | Transcript label |
|---|---|---|---|---|
| `text` | — | — | — | — |
| `photo` | — | ✓ on image | — | — |
| `video-broll` | keyframes + audio | ✓ on keyframes | ✓ on audio | `shooter-description` |
| `video-observation` | keyframes + audio | ✓ on keyframes | ✓ on audio | `speech` |
| `video-performance` | keyframes + audio | ✓ on keyframes | ✓ on audio | `speech` |
| `video-process` | keyframes + audio | ✓ on keyframes | ✓ on audio | `speech` |
| `voice-memo` | audio only | — | ✓ on audio | `speech` |

All types: keyframe extraction and audio extraction happen in the same ffmpeg pass — one command, one file read, both outputs ready for Moondream and Whisper. Efficient on a CPU server.

---

## The B-roll Transcript Decision

B-roll plays under other audio in the edit — voiceover, music, interview. The B-roll clip's own audio is never used in the final video. So why transcribe it?

**Because Bernard speaks a description over or immediately after each B-roll shot.** Not a script — just what he sees and what it means. That description is stored as `transcriptType: shooter-description`.

Moondream sees: *"exterior architecture stone columns daylight"*

Bernard says over the shot: *"this is the exact angle the daguerreotypist would have stood — you can tell because the shadow hits the third column the same way, it's the same morning light 160 years later"*

These are different kinds of information. Moondream describes what's there. The spoken description captures why it matters — the emotional and conceptual weight of the shot. The storyboard session can work with both: visual tags for technical clip matching, shooter description for thematic and narrative matching.

The B-roll library becomes a record of how Bernard sees, not just what he shot. Over 10 cities that's queryable in ways that a tags-only library never is.

**Description convention:** speak the description over the shot or immediately after. After is usually better — you've seen what you got and can describe it more accurately. Keep it natural, no performance pressure, it's for the system not the audience.

---

## Clip Length Guideline

Target **30–90 seconds** per clip for location and observation footage.

- Long enough to capture a complete thought or moment
- Short enough that the transcript is a single coherent idea
- Whisper transcription quality improves significantly with shorter clips — a 4-minute clip with ambient noise, pauses, and topic changes produces a messier transcript that needs more correction

Process footage (tape peel, paint mixing, photo transfer) can be longer because it documents continuous action. B-roll clips can be shorter — often 15–30 seconds per shot.

**One clip, one idea.** The system captures it. Meaning gets assembled later in the storyboard/reasoning session, not in the moment. Same discipline as the field notes — low friction, no performance pressure at capture time.

---

## Storyboard Session

When constructing a video episode, the reasoning session queries the `FieldNotes` collection across all fields simultaneously:

- Visual tags (Moondream) → technical clip matching: "find gate/wide shots"
- `audioTranscript` + `transcriptType: speech` → what Bernard observed and said
- `audioTranscript` + `transcriptType: shooter-description` → why a B-roll shot matters
- `relatedArtwork` → clips connected to a specific painting
- `city` → all material from one city
- `mediaType` → filter to performance only, or process only, etc.

A query like *"find all clips from Berlin where Bernard mentioned the historical photograph while shooting process footage"* works because both the visual context (keyframe tags: `process/painting`) and the spoken content (`audioTranscript` referencing the photograph) are indexed on the same record.

This changes the edit suggestion quality from clip sorting to genuine thematic assembly.

---

## What NOT to Do

- Never transcribe B-roll audio and discard it — the spoken description is the point, store it as `shooter-description`
- Never merge `RawFootage` and `FieldNotes` into the main public Artworks collection — this data is private, lives on the private server only
- Never run Whisper on `video-broll` and label the output `speech` — label it `shooter-description` so the reasoning session uses it correctly
- Never store processed outputs (keyframes, transcripts) before `processingStatus` is `complete`

---

## Status

- `FieldNotes` collection schema: **decided, not yet implemented**
- Hetzner processing pipeline: **to be built**
- Storyboard session logic: **to be designed** (Brief 08 or similar)
- Mobile upload UI / capture form: **to be designed**

---

*Written May 2026. Update when pipeline implementation begins.*
