/** Closed vocabulary — parsed from spoken slate. */
export const FIELD_NOTE_SHOT_TYPES = [
  'HOOK',
  'VERSE',
  'ARRIVE',
  'DETAIL',
  'WIDE',
  'WALK',
  'CROWD',
  'TALK',
  'AMBIENT',
  'BTS',
] as const

export type FieldNoteShotType = (typeof FIELD_NOTE_SHOT_TYPES)[number]

export const FIELD_NOTE_VERDICTS = ['keeper', 'scrap', 'maybe'] as const

export type FieldNoteVerdict = (typeof FIELD_NOTE_VERDICTS)[number]

export const FIELD_NOTE_SLATE_PARSE_STATUSES = ['parsed', 'not-found', 'partial'] as const

export type FieldNoteSlateParseStatus = (typeof FIELD_NOTE_SLATE_PARSE_STATUSES)[number]

export const CAPTURE_PRESET_PIPELINE_STEPS = [
  'keyframes',
  'moondream',
  'whisper',
  'slateParse',
] as const

export type CapturePresetPipelineStep = (typeof CAPTURE_PRESET_PIPELINE_STEPS)[number]

export const FIELD_NOTE_PROCESSING_STATUSES = [
  'queued',
  'pending',
  'processing',
  'complete',
  'failed',
] as const
