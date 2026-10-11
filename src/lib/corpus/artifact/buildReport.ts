import { lexicalToPlain } from '@/lib/artOfficial/lexicalToPlain'
import {
  deriveReasoningStatus,
  indexSessionEvidence,
  primarySessionsForArtwork,
  type SessionEvidence,
} from '@/lib/artwork/deriveReasoningStatus'
import {
  findPublicProseMarkers,
  PUBLIC_PROSE_FIELD_MAP,
} from '@/lib/artwork/publicProseMarkers'
import type {
  CorpusArtifact,
  CorpusBuildReport,
  CorpusWorkEnvelope,
} from '@/lib/corpus/artifact/types'
import type { Artwork } from '@/payload-types'

const PRIVATE_BRIEFING_KEYS = [
  'sessionNotes',
  'firstImpression',
  'agentDraft',
  'agentDraftDescriptionShort',
  'agentDraftDescriptionLong',
  'agentDraftConceptualKeywords',
  'agentDraftFormalContributionAssessment',
  'locationDetail',
] as const

/** Prose fields that must not appear as briefing property values (header note may name them). */
const DROPPED_BRIEFING_PROSE_KEYS = [
  'formalContributionAssessment',
  'artHistoricalContext',
  'descriptionLong',
  'makingNote',
  'consciousRejections',
  'workContext',
] as const

function asText(value: unknown, richText?: boolean): string | null {
  if (typeof value === 'string') {
    const t = value.trim()
    return t || null
  }
  if (richText && value && typeof value === 'object') {
    const t = lexicalToPlain(value).replace(/\s+/g, ' ').trim()
    return t || null
  }
  return null
}

export function auditReasoningStatus(
  artworks: Artwork[],
  derivedBySlug: Map<string, string>,
): CorpusBuildReport['reasoningStatusAudit'] {
  const completeWithNoIntent: Array<{ slug: string }> = []
  const intentNotMarkedComplete: Array<{ slug: string; reasoningStatus: string | null }> = []

  for (const artwork of artworks) {
    const slug = artwork.slug?.trim() || String(artwork.id)
    const intent = artwork.intent?.trim() || ''
    const status = derivedBySlug.get(slug) ?? null

    if (status === 'complete' && !intent) {
      completeWithNoIntent.push({ slug })
    }
    if (intent && status !== 'complete') {
      intentNotMarkedComplete.push({ slug, reasoningStatus: status })
    }
  }

  return { completeWithNoIntent, intentNotMarkedComplete }
}

/** Build-report evidence buckets for derived reasoningStatus. */
export function buildReasoningEvidenceReport(
  artworks: Artwork[],
  sessions: SessionEvidence[],
): {
  evidence: CorpusBuildReport['reasoningEvidence']
  derivedBySlug: Map<string, string>
} {
  const index = indexSessionEvidence(sessions)
  const derivedBySlug = new Map<string, string>()
  const distribution = { complete: 0, partial: 0, stub: 0 }
  const sessionButNoWhy: string[] = []
  const whyButNoSession: string[] = []
  const liveTimeline: string[] = []
  const envelopeTranscriptEmptyTimeline: string[] = []

  for (const artwork of artworks) {
    const slug = artwork.slug?.trim() || String(artwork.id)
    const primary = primarySessionsForArtwork(
      { id: artwork.id, slug: artwork.slug?.trim() || slug },
      index,
    )
    const derived = deriveReasoningStatus(artwork, primary)
    derivedBySlug.set(slug, derived.status)
    distribution[derived.status] += 1

    if (derived.partialKind === 'session-but-no-why') sessionButNoWhy.push(slug)
    if (derived.partialKind === 'why-but-no-session') whyButNoSession.push(slug)

    if (derived.status === 'complete') {
      if (derived.evidenceKind === 'live-timeline') liveTimeline.push(slug)
      else if (derived.evidenceKind === 'envelope-transcript') {
        envelopeTranscriptEmptyTimeline.push(slug)
      }
    }
  }

  const ghostShellSessions = sessions
    .filter((s) => s.messageCount === 0 && (s.primaryArtworkId != null || s.primarySlug))
    .map((s) => ({ sessionId: s.sessionId, primarySlug: s.primarySlug }))

  return {
    derivedBySlug,
    evidence: {
      derivedDistribution: distribution,
      partialSplit: { sessionButNoWhy, whyButNoSession },
      completeEvidence: {
        liveTimeline,
        envelopeTranscriptEmptyTimeline,
      },
      ghostShellSessions,
    },
  }
}

export function collectPublicProseMarkerHits(
  artworks: Artwork[],
): CorpusBuildReport['publicProseMarkers'] {
  const hits: CorpusBuildReport['publicProseMarkers'] = []
  for (const artwork of artworks) {
    const slug = artwork.slug?.trim() || String(artwork.id)
    for (const field of PUBLIC_PROSE_FIELD_MAP) {
      const text = asText(
        (artwork as unknown as Record<string, unknown>)[field.key],
        'richText' in field ? Boolean(field.richText) : false,
      )
      if (!text) continue
      const markers = findPublicProseMarkers(text)
      if (markers.length === 0) continue
      hits.push({ slug, field: field.reportAs, markers })
    }
  }
  return hits
}

function collectUrls(value: unknown, out: string[]): void {
  if (typeof value === 'string') {
    if (value.startsWith('https://bernardbolter.com/') || value.startsWith('/')) {
      out.push(value)
    }
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) collectUrls(item, out)
    return
  }
  if (value && typeof value === 'object') {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      collectUrls(nested, out)
    }
  }
}

function normalizeInternalPath(url: string): string | null {
  // URL templates like https://bernardbolter.com/api/corpus/{slug} are not live links.
  if (url.includes('{') || url.includes('}')) return null
  try {
    if (url.startsWith('/')) return url.split('?')[0] || null
    const parsed = new URL(url)
    if (parsed.hostname !== 'bernardbolter.com') return null
    return parsed.pathname || null
  } catch {
    return null
  }
}

export function checkBrokenInternalLinks(artifact: CorpusArtifact): CorpusBuildReport['brokenInternalLinks'] {
  const workSlugs = new Set(artifact.works.map((w) => w.slug))
  const seriesSlugs = new Set(
    artifact.about
      .map((node) => {
        const id = typeof node['@id'] === 'string' ? node['@id'] : ''
        const match = id.match(/\/series\/([^/#]+)/)
        return match?.[1] ?? null
      })
      .filter((slug): slug is string => Boolean(slug)),
  )
  const throughlineSlugs = new Set(artifact.throughlines.map((t) => t.slug))
  const bioSlugs = new Set(artifact.bioEntries.map((b) => b.slug))

  const broken: CorpusBuildReport['brokenInternalLinks'] = []

  for (const work of artifact.works) {
    const urls: string[] = []
    collectUrls(work.record, urls)
    collectUrls(work.indexProjection, urls)
    collectUrls(work.surveyProjection, urls)

    for (const url of new Set(urls)) {
      const pathname = normalizeInternalPath(url)
      if (!pathname) continue

      if (pathname === '/' || pathname === '/corpus' || pathname === '/bio' || pathname === '/statement') {
        continue
      }
      if (pathname.startsWith('/api/corpus/index') || pathname === '/api/corpus') continue
      if (pathname.startsWith('/sessions')) continue
      if (pathname.startsWith('/cv') || pathname.startsWith('/events/')) continue

      const seriesMatch = pathname.match(/^\/series\/([^/]+)\/?$/)
      if (seriesMatch) {
        if (!seriesSlugs.has(seriesMatch[1]!)) {
          broken.push({ slug: work.slug, url, reason: 'unknown series slug' })
        }
        continue
      }

      const throughlineMatch = pathname.match(/^\/statement\/throughlines\/([^/]+)\/?$/)
      if (throughlineMatch) {
        if (!throughlineSlugs.has(throughlineMatch[1]!)) {
          broken.push({ slug: work.slug, url, reason: 'unknown throughline slug' })
        }
        continue
      }

      const bioMatch = pathname.match(/^\/bio\/entries\/([^/]+)\/?$/)
      if (bioMatch) {
        if (!bioSlugs.has(bioMatch[1]!)) {
          broken.push({ slug: work.slug, url, reason: 'unknown bio entry slug' })
        }
        continue
      }

      const apiRecord = pathname.match(/^\/api\/corpus\/([^/]+)(?:\/sessions)?\/?$/)
      if (apiRecord) {
        const target = apiRecord[1]!
        if (target !== 'index' && target !== 'all' && target !== 'briefing' && !workSlugs.has(target)) {
          broken.push({ slug: work.slug, url, reason: 'unknown artwork slug in corpus API URL' })
        }
        continue
      }

      const artworkPath = pathname.match(/^\/([^/]+)(?:\/(vision|record|sessions))?\/?$/)
      if (artworkPath) {
        const target = artworkPath[1]!
        const reserved = new Set([
          'series',
          'bio',
          'statement',
          'sessions',
          'corpus',
          'api',
          'admin',
          'events',
          'cv',
          'studio',
        ])
        if (reserved.has(target)) continue
        if (!workSlugs.has(target)) {
          broken.push({ slug: work.slug, url, reason: 'unknown artwork slug' })
        }
      }
    }
  }

  return broken
}

export function scanBriefingPrivacy(briefingJson: string): CorpusBuildReport['privacyScan'] {
  const hits: string[] = []
  for (const key of PRIVATE_BRIEFING_KEYS) {
    // Object keys with values only — not field *names* in the session ledger.
    const re = new RegExp(`"${key}"\\s*:`)
    if (re.test(briefingJson)) hits.push(key)
  }
  for (const key of DROPPED_BRIEFING_PROSE_KEYS) {
    // Reject as propertyID payloads; the deeperFieldsNote may still name these strings.
    if (
      briefingJson.includes(`"art-official:${key}"`) ||
      briefingJson.includes(`"propertyID":"art-official:${key}"`)
    ) {
      hits.push(key)
    }
  }
  return { briefingClean: hits.length === 0, hits: [...new Set(hits)] }
}

export function estimateTokensFromBytes(bytes: number): number {
  // ~4 chars/token for English JSON prose
  return Math.ceil(bytes / 4)
}

export function countDisagreements(options: {
  works: CorpusWorkEnvelope[]
  payloadPublishedTotal: number
  artifactTotalArtworks: number
}): CorpusBuildReport['countDisagreements'] {
  const out: CorpusBuildReport['countDisagreements'] = []
  if (options.works.length !== options.artifactTotalArtworks) {
    out.push({
      surface: 'artifact.works vs art-official:totalArtworks',
      expected: options.artifactTotalArtworks,
      actual: options.works.length,
      note: 'Internal artifact inconsistency',
    })
  }
  if (options.works.length !== options.payloadPublishedTotal) {
    out.push({
      surface: 'artifact.works vs Payload published totalDocs',
      expected: options.payloadPublishedTotal,
      actual: options.works.length,
      note:
        'Payload totalDocs may include non-public catalogue slugs; application filter uses isPublicCatalogueSlug',
    })
  }
  return out
}
