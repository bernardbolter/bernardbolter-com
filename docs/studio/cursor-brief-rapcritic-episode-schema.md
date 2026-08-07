CURSOR AGENT PROMPT — Rap Critic Episode Schema + Upload Flow

Context:
An audit (see attached/prior report) confirmed the FieldNotes → local inbox →
ffmpeg → Whisper pipeline already works (3 successful test notes with
transcripts). This brief closes the remaining gaps to support the Rap Critic
TikTok format specifically: one Episode per location/artwork, with multiple
video clips (roll-in, intro, freestyle, roll-out) plus one optional reference
photo.

Do not touch: ffmpeg config, Whisper/Docker setup, pg-boss queue plumbing,
existing artwork media/R2 storage, or any collection unrelated to FieldNotes/
Episodes/CapturePresets. Do not attempt to fix Moondream in this pass — it's
explicitly out of scope for this use case (see step 4).

---

Step 1 — Extend the Episodes collection

File: src/collections/Episodes.ts

Add fields:
- `location` — group, matching the existing FieldNotes `location` group shape
  exactly (lat: number, lng: number) so the same map component can read/write
  both.
- `description` — textarea. Free text, Bernard's own notes on the artwork/
  location.
- `coverPhoto` — upload, relation → media. Optional (not required). This is
  the clean reference image of the artwork — separate from and unrelated to
  the video clips.
- `locationName` — text, optional (mirrors FieldNotes' existing field of the
  same name, for display convenience — e.g. "Tiergarten," "Neptunbrunnen").

Leave all existing Episodes fields (title, series, status, concept, shotList,
storyboard, assembly, captionDrafts, lines, clipFieldNoteIds) untouched.

---

Step 2 — Add the missing shot type

File: src/collections/FieldNotes.ts

`shotType` select currently has: HOOK, VERSE, ARRIVE, DETAIL, WIDE, WALK,
CROWD, TALK, AMBIENT, BTS.

Add: DEPART (roll-out / skating away).

Rap Critic episodes will use ARRIVE (roll-in), HOOK (intro line), VERSE
(freestyle), DEPART (roll-out) — all four already map onto the existing
vocabulary once DEPART exists. No renaming of existing values — other
use cases (museum harvest, b-roll) already depend on the current names.

---

Step 3 — Add/confirm the Rap Critic CapturePreset

A seed row "Rap Critic — test gate" already exists in CapturePresets with
pipelineSteps: keyframes, moondream, whisper, slateParse.

Update this record (or create a new one named "Rap Critic — TikTok" and leave
the test-gate row alone, whichever is cleaner given existing references):

- pipelineSteps: `whisper` ONLY. Turn off `keyframes`, `moondream`, and
  `slateParse` entirely for this preset — no keyframe extraction is needed
  since the coverPhoto on the Episode record serves as the visual reference,
  and no slate is spoken during these shoots (confirmed: audio and video are
  captured together on-phone, no spoken metadata convention is used for this
  format).
- mediaType: video-performance
- transcriptLabel: speech
- defaultEpisode / defaultLocationName: leave blank, set per-episode

This also resolves the audit's flagged conflict ("keyframe storage still goes
to R2 even when source video is local") for this specific preset — if
keyframes aren't generated, there's nothing to write to R2 in the first place.
Do not change how other presets or use cases handle keyframes/R2; that's out
of scope here.

---

Step 4 — Studio UI: Episode creation + linked clip upload

Files: src/components/studio/StudioInputPage.tsx, src/components/studio/UploadForm.tsx,
src/app/studio/episodes/new (existing route)

Target flow:
1. Bernard creates a new Episode first — name, map pin (reuse the same
   MapLibre + Protomaps component already used elsewhere in the project,
   dropped into this form), description, optional coverPhoto upload.
2. From the Episode detail view, he uploads one or more video clips, each
   tagged with `shotType` (ARRIVE / HOOK / VERSE / DEPART) and linked via
   `relatedEpisode`. Multiple takes of the same shotType are expected and
   fine — `take` field already supports this, increment per take.
3. Uploads use the existing local-inbox path (`writeInboxFile` /
   `FIELDNOTES_MEDIA_ROOT`) — no changes to the storage mechanism itself,
   just make sure the upload form passes `relatedEpisode` and `shotType`
   through to POST /api/studio/field-notes.
4. Each clip uses the CapturePreset from Step 3, so it only runs Whisper —
   confirm the worker respects `capturePreset.pipelineSteps` and skips
   ffmpeg keyframe extraction / Moondream calls entirely when `keyframes`
   is off, rather than running them and discarding the output.

If the current worker code (runFieldNotePipeline.ts / processFieldNoteLogic.ts)
always runs keyframe extraction regardless of preset, gate it behind
`capturePreset.pipelineSteps.includes('keyframes')` — check current behavior
and report back if this requires more than a small conditional.

---

Step 5 — Report back

After implementing, do NOT deploy/restart production processes without
confirmation. Instead report:
- Confirmed field list on updated Episodes and FieldNotes collections
- Confirmed CapturePreset config in the database
- Whether the worker already gated pipeline steps correctly or needed the
  conditional from Step 4
- Any deviation from this brief and why

Moondream remains broken and unaddressed — that's expected and fine for this
pass.
