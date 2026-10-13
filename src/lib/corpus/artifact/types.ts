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
  /**
   * Read order: version notes → protocol → contract → corpus.
   * Protocol + contract are inlined so a session needs one paste.
   */
  'art-official:protocolVersion': string
  'art-official:contractVersion': string
  protocol: string
  contract: ArtOfficialContractBrief
  works: CorpusBriefingWork[]
  throughlines: CorpusThroughlineEntry[]
  bioEntries: CorpusBioEntry[]
  sessionLedger: CorpusSessionLedgerEntry[]
}

/** Slim contract projection for the briefing paste (full page at /art-official/contract). */
export type ArtOfficialContractBrief = {
  title: string
  reasoningStatusNote: string
  coverageNote: string
  endpoints: Array<{ method: string; path: string; role: string }>
  visionImport: { key: string; notKey: string; entryFields: string[] }
  artworkForbidden: string[]
  artworkAllowedProvenance: string[]
  artHistoricalReferencesShape: string
  rejections: Array<{
    keyOrField: string
    where: string
    why: string
    behaviour: string
  }>
  sessionEnvelopeFields: string[]
  workedExampleEnvelope: Record<string, unknown>
  htmlUrl: string
  validateUrl: string
}

export type CorpusBuildReportHeader = {
  generatedAt: string
  artifactAgeHoursAtWrite: number
  staleThresholdHours: number
  auditCounts: {
    completeWithNoIntent: number
    intentNotMarkedComplete: number
    publicProseMarkers: number
    derivedComplete: number
    derivedPartial: number
    derivedStub: number
    sessionButNoWhy: number
    whyButNoSession: number
    liveTimeline: number
    envelopeTranscript: number
    ghostShellSessions: number
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
    /** Derived complete with no intent text (may still have other why-fields). */
    completeWithNoIntent: Array<{ slug: string }>
    /** Has intent but derived status is not complete. */
    intentNotMarkedComplete: Array<{ slug: string; reasoningStatus: string | null }>
  }
  /** Strength of the coverage claim — derived distribution + evidence buckets. */
  reasoningEvidence: {
    derivedDistribution: {
      complete: number
      partial: number
      stub: number
    }
    partialSplit: {
      sessionButNoWhy: string[]
      whyButNoSession: string[]
    }
    /** Among derived-complete works. */
    completeEvidence: {
      liveTimeline: string[]
      envelopeTranscriptEmptyTimeline: string[]
    }
    ghostShellSessions: Array<{ sessionId: string; primarySlug: string | null }>
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
