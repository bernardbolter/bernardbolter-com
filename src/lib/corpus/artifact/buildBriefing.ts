import type { ArtOfficialContract } from '@/lib/artOfficial/contract/types'
import { getArtOfficialProtocolDocument } from '@/lib/artOfficial/protocol/protocolDocument'
import { CORPUS_BASE } from '@/lib/corpus/constants'
import type {
  ArtOfficialContractBrief,
  CorpusArtifact,
  CorpusBriefing,
  CorpusBriefingCoverage,
  CorpusBriefingSessionLedgerSummary,
  CorpusBriefingThroughline,
  CorpusBriefingWork,
} from '@/lib/corpus/artifact/types'

const DEEPER_FIELDS_NOTE =
  `Deeper fields (formalContributionAssessment, artHistoricalContext, descriptionLong, makingNote, consciousRejections, workContext, and others) are available per work at ${CORPUS_BASE}/api/corpus/{slug} — substitute the artwork slug for {slug}.`

const BRIEFING_READ_ORDER_NOTE =
  'Read this file once, top to bottom. Order: identity (counts/coverage/generatedAt) → protocol → contract → works → throughlines/bio. Stub works list slug/title/series/status only. Session ledger is a count pointer (full ledger at /sessions). Throughline claims are at claimUrl. Live endpoints supersede this snapshot when they disagree. Anything in project knowledge or memory is a copy and may be outdated — this paste is authoritative for the session.'

const SESSION_LEDGER_NOTE =
  'Full session ledger omitted from briefing so the paste stays under common fetch-tool truncation (~100k chars). Use indexUrl or apiUrl.'

function propValue(
  record: Record<string, unknown>,
  propertyID: string,
): string | null {
  const props = Array.isArray(record.additionalProperty) ? record.additionalProperty : []
  for (const row of props) {
    if (!row || typeof row !== 'object') continue
    const id = (row as { propertyID?: unknown }).propertyID
    if (id !== propertyID) continue
    const value = (row as { value?: unknown }).value
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (value != null && typeof value !== 'object') {
      const text = String(value).trim()
      return text || null
    }
  }
  return null
}

function seriesName(record: Record<string, unknown>, fallback: string | null): string | null {
  const part = record.isPartOf
  if (part && typeof part === 'object' && typeof (part as { name?: unknown }).name === 'string') {
    return (part as { name: string }).name
  }
  return fallback
}

function omitEmpty<T extends Record<string, unknown>>(row: T): T {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    if (value == null) continue
    if (value === '') continue
    if (Array.isArray(value) && value.length === 0) continue
    out[key] = value
  }
  return out as T
}

function workBriefingEnvelope(
  work: CorpusArtifact['works'][number],
): CorpusBriefingWork {
  const status = work.filters.reasoningStatus
  const base = {
    slug: work.slug,
    title: work.filters.title,
    series: seriesName(work.record, work.filters.seriesName),
    reasoningStatus: status,
  }

  // Stubs: identity only — 182 × full null-heavy envelopes blew the fetch budget.
  if (status === 'stub' || status == null) {
    return omitEmpty(base)
  }

  const record = work.record
  const survey = work.surveyProjection
  const index = work.indexProjection

  const gist =
    typeof index['art-official:gist'] === 'string'
      ? (index['art-official:gist'] as string)
      : null
  const gistSource =
    typeof index['art-official:gistSource'] === 'string'
      ? (index['art-official:gistSource'] as string)
      : null

  const intent =
    (typeof survey['art-official:intentLine'] === 'string'
      ? (survey['art-official:intentLine'] as string)
      : null) || propValue(record, 'art-official:intent')

  const descriptionShort =
    (typeof survey.description === 'string' ? (survey.description as string) : null) || null

  const seriesContext = propValue(record, 'art-official:seriesContext')

  return omitEmpty({
    ...base,
    gist,
    gistSource,
    intent,
    descriptionShort,
    seriesContext,
  })
}

function contractBrief(contract: ArtOfficialContract): ArtOfficialContractBrief {
  const sessionCollection = contract.envelope.collections.find((c) => c.collection === 'sessions')
  return {
    title: contract.title,
    reasoningStatusNote: contract.reasoningStatusNote,
    coverageNote: contract.coverageNote,
    endpoints: contract.endpoints,
    visionImport: contract.visionImport,
    artworkForbidden: contract.artworkForbidden,
    artworkAllowedProvenance: contract.artworkAllowedProvenance,
    artHistoricalReferencesShape: contract.artHistoricalReferencesShape,
    rejections: contract.rejections,
    sessionEnvelopeFields: (sessionCollection?.fields ?? []).map((f) => f.name),
    // workedExample stays on /art-official/contract — ~1.6k saved in the paste.
    workedExampleEnvelope: {
      note: 'Worked example omitted from briefing — see htmlUrl',
      htmlUrl: `${CORPUS_BASE}/art-official/contract`,
    },
    htmlUrl: `${CORPUS_BASE}/art-official/contract`,
    validateUrl: `${CORPUS_BASE}/api/art-official/validate`,
  }
}

function coverageFromArtifact(artifact: CorpusArtifact): CorpusBriefingCoverage {
  const base = artifact['art-official:coverage']
  let complete = 0
  let partial = 0
  let stub = 0
  for (const work of artifact.works) {
    const status = work.filters.reasoningStatus
    if (status === 'complete') complete += 1
    else if (status === 'partial') partial += 1
    else stub += 1
  }
  return {
    complete,
    partial,
    stub,
    reasoningComplete: base.reasoningComplete ?? complete,
    matched: base.matched,
    withArtistIntent: base.withArtistIntent,
    withVisionAnalysis: base.withVisionAnalysis,
    withSessions: base.withSessions,
  }
}

function throughlineBrief(entry: CorpusArtifact['throughlines'][number]): CorpusBriefingThroughline {
  const row: CorpusBriefingThroughline = {
    slug: entry.slug,
    memberSlugs: entry.memberSlugs ?? [],
    claimUrl: `${CORPUS_BASE}/statement/throughlines/${encodeURIComponent(entry.slug)}`,
  }
  const shortTitle = (entry as { shortTitle?: string }).shortTitle
  if (typeof shortTitle === 'string' && shortTitle.trim()) {
    row.shortTitle = shortTitle.trim()
  }
  return row
}

function sessionLedgerSummary(
  artifact: CorpusArtifact,
): CorpusBriefingSessionLedgerSummary {
  return {
    count: artifact.sessionLedger.length,
    indexUrl: `${CORPUS_BASE}/sessions`,
    apiUrl: `${CORPUS_BASE}/api/corpus/sessions`,
    note: SESSION_LEDGER_NOTE,
  }
}

export function buildCorpusBriefing(
  artifact: CorpusArtifact,
  options: { contract: ArtOfficialContract; protocolText?: string },
): CorpusBriefing {
  const protocol = options.protocolText ?? getArtOfficialProtocolDocument().text
  const works = artifact.works.map(workBriefingEnvelope)
  const coverage = coverageFromArtifact(artifact)

  return {
    'art-official:totalWorks': artifact['art-official:totalPublished'] ?? artifact.works.length,
    'art-official:coverage': coverage,
    'art-official:generatedAt': artifact['art-official:generatedAt'],
    'art-official:corpusVersion': artifact['art-official:corpusVersion'],
    'art-official:supersedesNote': `${BRIEFING_READ_ORDER_NOTE} ${artifact['art-official:supersedesNote']}`,
    'art-official:deeperFieldsNote': DEEPER_FIELDS_NOTE,
    'art-official:protocolVersion': options.contract['art-official:protocolVersion'],
    'art-official:contractVersion': options.contract['art-official:contractVersion'],
    protocol,
    contract: contractBrief(options.contract),
    works,
    throughlines: artifact.throughlines.map(throughlineBrief),
    bioEntries: artifact.bioEntries,
    sessionLedger: sessionLedgerSummary(artifact),
  }
}
