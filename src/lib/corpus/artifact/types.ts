import type { CorpusCoverage } from '@/lib/corpus/coverage'

export type CorpusWorkFilters = {
  seriesSlug: string | null
  seriesName: string | null
  yearCreated: number | null
  reasoningStatus: string | null
  hasVisionAnalyses: boolean
  title: string
}

/**
 * One published work in the nightly artifact.
 * `projection` is precomputed at build time — index/survey read with no recompute.
 */
export type CorpusWorkEnvelope = {
  slug: string
  catalogueSequence: number | null
  updatedAt: string | null
  sessionCount: number
  filters: CorpusWorkFilters
  /** Tier-1 index projection (subset of survey). */
  indexProjection: Record<string, unknown>
  /** Tier-2 survey projection (includes description, intentLine, colors, keywords). */
  surveyProjection: Record<string, unknown>
  /** Full Tier-4 JSON-LD record (`includeTraversalLinks`). */
  record: Record<string, unknown>
  /** Committed automatic fields when the work has prior sessions; else null. */
  automaticFields: Record<string, unknown> | null
}

export type CorpusThroughlineEntry = {
  slug: string
  text: string
  memberSlugs: string[]
  status?: string | null
}

export type CorpusBioEntry = {
  slug: string
  text: string
  memberSlugs: string[]
  year?: string | null
}

export type CorpusSessionLedgerEntry = {
  sessionId: string
  sessionType: string
  status: string
  primarySlug: string | null
  mentionedSlugs: string[]
  fieldsCovered: string[]
  startedAt?: string | null
  completedAt?: string | null
  agentModel?: string | null
}

export type CorpusArtifact = {
  '@context': unknown
  '@type': 'DataFeed'
  name: string
  url: string
  dateModified: string
  'art-official:corpusVersion': string
  'art-official:generatedAt': string
  'art-official:supersedesNote': string
  'art-official:totalArtworks': number
  'art-official:totalPublished': number
  'art-official:coverage': CorpusCoverage
  author: Record<string, unknown>
  about: Record<string, unknown>[]
  throughlines: CorpusThroughlineEntry[]
  bioEntries: CorpusBioEntry[]
  sessionLedger: CorpusSessionLedgerEntry[]
  works: CorpusWorkEnvelope[]
}

export type CorpusBriefingWork = {
  slug: string
  title: string
  series: string | null
  reasoningStatus: string | null
  gist: string | null
  gistSource: string | null
  intent: string | null
  descriptionShort: string | null
  seriesContext: string | null
  /** Throughline page URLs only — claim text is in `throughlines`. */
  relatedByThroughline: string[]
  /** Bio entry page URLs only — claim text is in `bioEntries`. */
  relatedByBioEvent: string[]
}

export type CorpusBriefing = {
  'art-official:corpusVersion': string
  'art-official:generatedAt': string
  'art-official:supersedesNote': string
  /** Deeper prose lives on the per-work corpus URL, not in this paste. */
  'art-official:deeperFieldsNote': string
  works: CorpusBriefingWork[]
  throughlines: CorpusThroughlineEntry[]
  bioEntries: CorpusBioEntry[]
  sessionLedger: CorpusSessionLedgerEntry[]
}

export type CorpusBuildReportHeader = {
  generatedAt: string
  artifactAgeHoursAtWrite: number
  staleThresholdHours: number
  auditCounts: {
    completeWithNoIntent: number
    intentNotMarkedComplete: number
    publicProseMarkers: number
  }
}

export type CorpusBuildReport = {
  /** Read this first — age + audit counts without scrolling. */
  header: CorpusBuildReportHeader
  generatedAt: string
  artifactAgeHoursAtWrite: number
  staleThresholdHours: number
  timingsMs: Record<string, number>
  counts: {
    works: number
    payloadPublishedTotal: number
    sessionLedger: number
    throughlines: number
    bioEntries: number
    reasoningComplete: number
  }
  sizesBytes: {
    corpus: number
    briefing: number
    buildReport: number
  }
  briefingTokenEstimate: number
  reasoningStatusAudit: {
    completeWithNoIntent: Array<{ slug: string }>
    intentNotMarkedComplete: Array<{ slug: string; reasoningStatus: string | null }>
  }
  countDisagreements: Array<{ surface: string; expected: number; actual: number; note: string }>
  brokenInternalLinks: Array<{ slug: string; url: string; reason: string }>
  publicProseMarkers: Array<{
    slug: string
    field: string
    markers: string[]
  }>
  privacyScan: {
    briefingClean: boolean
    hits: string[]
  }
  r2Upload?: {
    ok: boolean
    keys?: string[]
    error?: string
  }
  warnings: string[]
}

export type ArtifactReadMeta = {
  path: string
  generatedAt: string
  ageMs: number
  stale: boolean
  mtimeMs: number
}
