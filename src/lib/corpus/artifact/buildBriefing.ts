import { CORPUS_BASE } from '@/lib/corpus/constants'
import type { CorpusArtifact, CorpusBriefing } from '@/lib/corpus/artifact/types'

const DEEPER_FIELDS_NOTE =
  `Deeper fields (formalContributionAssessment, artHistoricalContext, descriptionLong, makingNote, consciousRejections, workContext, and others) are available per work at ${CORPUS_BASE}/api/corpus/{slug} — substitute the artwork slug for {slug}.`

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

/**
 * Per-work briefing envelope — every published work, same shape.
 * KEEP listed fields only; deeper prose stays on /api/corpus/{slug}.
 */
function workBriefingEnvelope(
  work: CorpusArtifact['works'][number],
): CorpusBriefing['works'][number] {
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
    (typeof survey.description === 'string' ? (survey.description as string) : null) ||
    null

  const seriesContext = propValue(record, 'art-official:seriesContext')

  const relatedByThroughline = Array.isArray(record['art-official:relatedByThroughline'])
    ? (record['art-official:relatedByThroughline'] as unknown[])
    : []
  const relatedByBioEvent = Array.isArray(record['art-official:relatedByBioEvent'])
    ? (record['art-official:relatedByBioEvent'] as unknown[])
    : []

  return {
    slug: work.slug,
    title: work.filters.title,
    series: seriesName(record, work.filters.seriesName),
    reasoningStatus: work.filters.reasoningStatus,
    gist,
    gistSource,
    intent,
    descriptionShort,
    seriesContext,
    relatedByThroughline,
    relatedByBioEvent,
  }
}

export function buildCorpusBriefing(artifact: CorpusArtifact): CorpusBriefing {
  const works = artifact.works.map(workBriefingEnvelope)

  const automaticFieldsByWork: Record<string, Record<string, unknown>> = {}
  for (const work of artifact.works) {
    if (work.sessionCount > 0 && work.automaticFields) {
      automaticFieldsByWork[work.slug] = work.automaticFields
    }
  }

  return {
    'art-official:corpusVersion': artifact['art-official:corpusVersion'],
    'art-official:generatedAt': artifact['art-official:generatedAt'],
    'art-official:supersedesNote': artifact['art-official:supersedesNote'],
    'art-official:deeperFieldsNote': DEEPER_FIELDS_NOTE,
    works,
    automaticFieldsByWork,
    throughlines: artifact.throughlines,
    bioEntries: artifact.bioEntries,
    sessionLedger: artifact.sessionLedger,
  }
}
