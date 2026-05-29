/** pg-boss queue names and typed job payloads. */

export const JOB_NAMES = {
  PROCESS_FIELD_NOTE: 'process-fieldnote',
  GENERATE_TIMELAPSE: 'generate-timelapse',
  SUGGEST_TAGS: 'suggest-tags',
  GENERATE_EMBEDDINGS: 'generate-embeddings',
  SUGGEST_LINES: 'suggest-lines',
  PATTERN_REPORT: 'pattern-report',
} as const

export type JobName = (typeof JOB_NAMES)[keyof typeof JOB_NAMES]

export type ProcessFieldNotePayload = {
  fieldNoteId: number
}

export type GenerateTimelapsePayload = {
  artworkId: number
}

export type SuggestTagsPayload = {
  fieldNoteId?: number
}

export type GenerateEmbeddingsPayload = {
  fieldNoteId?: number
  artworkId?: number
  episodeId?: number
  studioConversationId?: number
}

export type SuggestLinesPayload = {
  fieldNoteId: number
}

export type PatternReportPayload = {
  weekStart?: string
}

export type JobPayloadMap = {
  [JOB_NAMES.PROCESS_FIELD_NOTE]: ProcessFieldNotePayload
  [JOB_NAMES.GENERATE_TIMELAPSE]: GenerateTimelapsePayload
  [JOB_NAMES.SUGGEST_TAGS]: SuggestTagsPayload
  [JOB_NAMES.GENERATE_EMBEDDINGS]: GenerateEmbeddingsPayload
  [JOB_NAMES.SUGGEST_LINES]: SuggestLinesPayload
  [JOB_NAMES.PATTERN_REPORT]: PatternReportPayload
}
