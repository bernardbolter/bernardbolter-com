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

  // Relations as URLs only — full claim text lives in throughlines/bioEntries below.
  const relatedByThroughline = relationUrls(record['art-official:relatedByThroughline'])
  const relatedByBioEvent = relationUrls(record['art-official:relatedByBioEvent'])

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

function relationUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const out: string[] = []
  for (const row of value) {
    if (!row || typeof row !== 'object') continue
    const url = (row as { url?: unknown }).url
    if (typeof url === 'string' && url.trim()) out.push(url.trim())
  }
  return out
}

export function buildCorpusBriefing(artifact: CorpusArtifact): CorpusBriefing {
  const works = artifact.works.map(workBriefingEnvelope)

  return {
    'art-official:corpusVersion': artifact['art-official:corpusVersion'],
    'art-official:generatedAt': artifact['art-official:generatedAt'],
    'art-official:supersedesNote': artifact['art-official:supersedesNote'],
    'art-official:deeperFieldsNote': DEEPER_FIELDS_NOTE,
    works,
    throughlines: artifact.throughlines,
    bioEntries: artifact.bioEntries,
    sessionLedger: artifact.sessionLedger,
  }
}
