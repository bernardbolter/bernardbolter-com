import { mkdir, writeFile } from 'node:fs/promises'

import { fieldsCoveredFromTimeline } from '@/lib/artOfficial/automaticFieldConflicts'
import { buildArtOfficialContract } from '@/lib/artOfficial/contract/buildContractArtifact'
import {
  artOfficialContractPath,
  artOfficialProtocolPath,
} from '@/lib/artOfficial/contract/paths'
import { getArtOfficialProtocolDocument } from '@/lib/artOfficial/protocol/protocolDocument'
import {
  indexSessionEvidence,
  primarySessionsForArtwork,
  withDerivedReasoningStatus,
} from '@/lib/artwork/deriveReasoningStatus'
import { fetchCompletedSessionEvidence } from '@/lib/artwork/fetchSessionEvidence'
import { artworkHasVisionTier } from '@/lib/corpus/availableTiers'
import { buildCorpusBriefing } from '@/lib/corpus/artifact/buildBriefing'
import {
  auditReasoningStatus,
  buildReasoningEvidenceReport,
  checkBrokenInternalLinks,
  collectPublicProseMarkerHits,
  countDisagreements,
  estimateTokensFromBytes,
  scanBriefingPrivacy,
} from '@/lib/corpus/artifact/buildReport'
import {
  CORPUS_ARTIFACT_STALE_MS,
  CORPUS_SUPERSEDES_NOTE,
  corpusArtifactDir,
  corpusArtifactPath,
  corpusBriefingPath,
  corpusBuildReportPath,
} from '@/lib/corpus/artifact/paths'
import { serializeAutomaticFields } from '@/lib/corpus/artifact/serializeAutomaticFields'
import type {
  CorpusArtifact,
  CorpusBioEntry,
  CorpusBuildReport,
  CorpusSessionLedgerEntry,
  CorpusThroughlineEntry,
  CorpusWorkEnvelope,
} from '@/lib/corpus/artifact/types'
import { buildCorpusRecord } from '@/lib/corpus/buildCorpusRecord'
import {
  BRIEFING_FETCH_CHAR_BUDGET,
  CORPUS_ARTWORK_DEPTH,
  CORPUS_BASE,
  CORPUS_CONTEXT,
  CORPUS_VERSION,
} from '@/lib/corpus/constants'
import { computeCoverage } from '@/lib/corpus/coverage'
import {
  fetchCorpusArtistForReciprocalLinks,
  fetchCorpusSeries,
  fetchCorpusTotalArtworks,
} from '@/lib/corpus/fetchCorpusData'
import { fetchSessionCountBySlug } from '@/lib/corpus/fetchSessionCounts'
import { buildSeriesNode } from '@/lib/corpus/seriesIdentity'
import { isPublicCatalogueSlug } from '@/lib/payload/publicSlug'
import { buildArtworkJsonLd } from '@/utilities/buildArtworkJsonLd'
import type { Artist, Artwork, Series, Session } from '@/payload-types'
import type { Payload } from 'payload'

const PAGE_SIZE = 50

function trimString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function artworkSlugFromRelation(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const slug = (value as Artwork).slug
  if (typeof slug !== 'string') return null
  const trimmed = slug.trim()
  return trimmed || null
}

/** Accept dotted field paths only — reject anything that looks like a value payload. */
function sanitizeFieldNameList(names: string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of names) {
    const name = raw.trim()
    if (!name) continue
    // Field paths: currentLocation.locationDetail, ach.overlay.overlayColors, intent
    if (!/^[A-Za-z][A-Za-z0-9_.]*$/.test(name)) continue
    if (name.length > 120) continue
    if (seen.has(name)) continue
    seen.add(name)
    out.push(name)
  }
  return out
}

function buildAuthorBlock(artist: Artist | null, baseUrl: string): Record<string, unknown> {
  const identifiers: Array<Record<string, unknown>> = []
  const ulanUri = trimString(artist?.ulanUri)
  if (ulanUri) {
    identifiers.push({ '@type': 'PropertyValue', propertyID: 'ULAN', value: ulanUri })
  }
  const wikidataUri = trimString(artist?.wikidataUri)
  if (wikidataUri) {
    identifiers.push({ '@type': 'PropertyValue', propertyID: 'Wikidata', value: wikidataUri })
  }
  return {
    '@type': 'Person',
    name: trimString(artist?.name) || 'Bernard Bolter',
    '@id': `${baseUrl}/bio#person`,
    ...(identifiers.length ? { identifier: identifiers } : {}),
  }
}

function resolveSeries(artwork: Artwork): Series | null {
  if (!artwork.series || typeof artwork.series !== 'object') return null
  return artwork.series as Series
}

function memberSlugsFromLinked(
  linked: (number | Artwork)[] | null | undefined,
  idToSlug: Map<number, string>,
): string[] {
  const out: string[] = []
  for (const row of linked ?? []) {
    if (typeof row === 'number') {
      const slug = idToSlug.get(row)
      if (slug) out.push(slug)
      continue
    }
    if (row && typeof row === 'object' && typeof row.slug === 'string' && row.slug.trim()) {
      out.push(row.slug.trim())
    }
  }
  return out
}

async function fetchAllPublishedArtworks(payload: Payload): Promise<Artwork[]> {
  const docs: Artwork[] = []
  let page = 1
  let hasNextPage = true

  while (hasNextPage) {
    const result = await payload.find({
      collection: 'artworks',
      locale: 'en',
      where: { status: { equals: 'published' } },
      limit: PAGE_SIZE,
      page,
      depth: CORPUS_ARTWORK_DEPTH,
      sort: 'catalogueSequence',
      overrideAccess: true,
    })
    docs.push(
      ...(result.docs.filter((doc) => isPublicCatalogueSlug(doc.slug)) as unknown as Artwork[]),
    )
    hasNextPage = result.hasNextPage
    page += 1
  }

  return docs
}

async function fetchSessionLedger(payload: Payload): Promise<CorpusSessionLedgerEntry[]> {
  const ledger: CorpusSessionLedgerEntry[] = []
  let page = 1
  let hasNextPage = true

  while (hasNextPage) {
    const result = await payload.find({
      collection: 'sessions',
      where: { status: { equals: 'completed' } },
      limit: 100,
      page,
      depth: 1,
      overrideAccess: true,
      select: {
        sessionId: true,
        sessionType: true,
        status: true,
        primaryArtwork: true,
        artworkRecord: true,
        mentionedArtworks: true,
        fieldsCoveredThisSession: true,
        fieldUpdateTimeline: true,
        createdAt: true,
        completedAt: true,
        agentModel: true,
      },
    })

    for (const session of result.docs as Session[]) {
      const primary =
        artworkSlugFromRelation(session.primaryArtwork) ??
        artworkSlugFromRelation(session.artworkRecord)
      const mentionedSlugs: string[] = []
      for (const mentioned of session.mentionedArtworks ?? []) {
        const slug = artworkSlugFromRelation(mentioned)
        if (slug && slug !== primary) mentionedSlugs.push(slug)
      }

      // Field NAMES only — never timeline values, priors, or location detail text.
      const fromCovered = (session.fieldsCoveredThisSession ?? [])
        .map((row) => (row && typeof row.field === 'string' ? row.field.trim() : ''))
        .filter((name): name is string => Boolean(name))
      const timelineRows = Array.isArray(session.fieldUpdateTimeline)
        ? (session.fieldUpdateTimeline as Array<{ field?: string | null }>)
        : []
      const fromTimeline = fieldsCoveredFromTimeline(timelineRows).map((row) => row.field)
      const fieldsCovered = sanitizeFieldNameList(
        fromCovered.length > 0 ? fromCovered : fromTimeline,
      )

      ledger.push({
        sessionId: trimString(session.sessionId) || String(session.id),
        sessionType: trimString(session.sessionType) || 'unknown',
        status: trimString(session.status) || 'completed',
        primarySlug: primary,
        mentionedSlugs,
        fieldsCovered,
        startedAt: session.createdAt ?? null,
        completedAt: session.completedAt ?? null,
        agentModel: trimString(session.agentModel) || null,
      })
    }

    hasNextPage = result.hasNextPage
    page += 1
  }

  return ledger
}

function buildThroughlines(
  artist: Artist | null,
  idToSlug: Map<number, string>,
): CorpusThroughlineEntry[] {
  if (!artist) return []
  const out: CorpusThroughlineEntry[] = []
  for (const entry of artist.statementThroughlines ?? []) {
    if ((entry.visibility ?? 'public') !== 'public') continue
    const slug = entry.slug?.trim()
    const text = entry.text?.trim()
    if (!slug || !text) continue
    out.push({
      slug,
      text,
      memberSlugs: memberSlugsFromLinked(entry.linkedArtworkSlugs, idToSlug),
    })
  }
  return out
}

function buildBioEntries(
  artist: Artist | null,
  idToSlug: Map<number, string>,
): CorpusBioEntry[] {
  if (!artist) return []
  const out: CorpusBioEntry[] = []
  for (const entry of artist.bioTimelineEntries ?? []) {
    if ((entry.visibility ?? 'public') !== 'public') continue
    const slug = entry.slug?.trim()
    const text = entry.text?.trim()
    if (!slug || !text) continue
    out.push({
      slug,
      text,
      memberSlugs: memberSlugsFromLinked(entry.linkedArtworkSlugs, idToSlug),
      year: entry.eventDate?.trim() || null,
    })
  }
  return out
}

export type AssembleCorpusArtifactResult = {
  artifact: CorpusArtifact
  briefing: ReturnType<typeof buildCorpusBriefing>
  report: CorpusBuildReport
  paths: {
    corpus: string
    briefing: string
    buildReport: string
    contract: string
    protocol: string
  }
}

/**
 * Single assembler for the nightly job and emergency rebuild.
 * Public API routes must not call this — they read the written artifact.
 */
export async function assembleCorpusArtifact(
  payload: Payload,
  options: { cwd?: string; baseUrl?: string } = {},
): Promise<AssembleCorpusArtifactResult> {
  const cwd = options.cwd ?? process.cwd()
  const baseUrl = options.baseUrl ?? CORPUS_BASE
  const t0 = Date.now()
  const timingsMs: Record<string, number> = {}

  let t = Date.now()
  const [
    artworksRaw,
    seriesList,
    artist,
    payloadPublishedTotal,
    sessionCountBySlug,
    sessionLedger,
    sessionEvidence,
  ] = await Promise.all([
    fetchAllPublishedArtworks(payload),
    fetchCorpusSeries(payload),
    fetchCorpusArtistForReciprocalLinks(payload),
    fetchCorpusTotalArtworks(payload),
    fetchSessionCountBySlug(payload),
    fetchSessionLedger(payload),
    fetchCompletedSessionEvidence(payload),
  ])
  timingsMs.fetch = Date.now() - t

  const sessionIndex = indexSessionEvidence(sessionEvidence)
  const { evidence: reasoningEvidence, derivedBySlug } = buildReasoningEvidenceReport(
    artworksRaw,
    sessionEvidence,
  )

  // Overlay derived status so JSON-LD / corpus projections never read the stored column.
  const artworks = artworksRaw.map((artwork) => {
    const slug = artwork.slug?.trim() || String(artwork.id)
    const primary = primarySessionsForArtwork(
      { id: artwork.id, slug: artwork.slug?.trim() || slug },
      sessionIndex,
    )
    return withDerivedReasoningStatus(artwork, primary)
  })

  const idToSlug = new Map<number, string>()
  for (const artwork of artworks) {
    if (typeof artwork.id === 'number' && artwork.slug?.trim()) {
      idToSlug.set(artwork.id, artwork.slug.trim())
    }
  }

  t = Date.now()
  const works: CorpusWorkEnvelope[] = artworks.map((artwork) => {
    const slug = artwork.slug?.trim() || ''
    const sessionCount = sessionCountBySlug.get(slug) ?? 0
    const series = resolveSeries(artwork)
    const derivedStatus = derivedBySlug.get(slug) ?? artwork.reasoningStatus ?? null
    const indexProjection = buildCorpusRecord(artwork, 'index', {
      baseUrl,
      sessionCount,
      artist,
    })
    const surveyProjection = buildCorpusRecord(artwork, 'survey', {
      baseUrl,
      sessionCount,
      artist,
    })
    const record = buildArtworkJsonLd(artwork, artist, {
      baseUrl,
      sessionCount,
      includeTraversalLinks: true,
    })

    return {
      slug,
      catalogueSequence:
        typeof artwork.catalogueSequence === 'number' ? artwork.catalogueSequence : null,
      updatedAt: artwork.updatedAt ?? null,
      sessionCount,
      filters: {
        seriesSlug: series?.slug?.trim() || null,
        seriesName: series?.name?.trim() || null,
        yearCreated: typeof artwork.yearCreated === 'number' ? artwork.yearCreated : null,
        reasoningStatus: derivedStatus,
        hasVisionAnalyses: artworkHasVisionTier(artwork),
        title: artwork.title?.trim() || slug,
      },
      indexProjection,
      surveyProjection,
      record,
      automaticFields:
        sessionCount > 0 ? serializeAutomaticFields(artwork) : null,
    }
  })
  timingsMs.buildWorks = Date.now() - t

  const generatedAt = new Date().toISOString()
  const coverage = computeCoverage(artworks, sessionCountBySlug)
  const throughlines = buildThroughlines(artist, idToSlug)
  const bioEntries = buildBioEntries(artist, idToSlug)

  const artifact: CorpusArtifact = {
    '@context': CORPUS_CONTEXT,
    '@type': 'DataFeed',
    name: 'Bernard Bolter — Artist Archive Corpus Artifact',
    url: `${baseUrl}/api/corpus/all`,
    dateModified: generatedAt,
    'art-official:corpusVersion': CORPUS_VERSION,
    'art-official:generatedAt': generatedAt,
    'art-official:supersedesNote': CORPUS_SUPERSEDES_NOTE,
    'art-official:totalArtworks': works.length,
    'art-official:totalPublished': works.length,
    'art-official:coverage': coverage,
    author: buildAuthorBlock(artist, baseUrl),
    about: seriesList.map((series) =>
      buildSeriesNode(series, baseUrl, { includeDescription: true }),
    ),
    throughlines,
    bioEntries,
    sessionLedger,
    works,
  }

  t = Date.now()
  const contract = buildArtOfficialContract(generatedAt)
  const protocolDoc = getArtOfficialProtocolDocument()
  const briefing = buildCorpusBriefing(artifact, {
    contract,
    protocolText: protocolDoc.text,
  })
  timingsMs.briefing = Date.now() - t

  t = Date.now()
  const corpusJson = `${JSON.stringify(artifact)}\n`
  const briefingJson = `${JSON.stringify(briefing)}\n`
  const contractJson = `${JSON.stringify(contract, null, 2)}\n`
  const protocolText = `${protocolDoc.text}\n`
  const corpusBytes = Buffer.byteLength(corpusJson, 'utf8')
  const briefingBytes = Buffer.byteLength(briefingJson, 'utf8')
  const briefingChars = briefingJson.length

  const reasoningStatusAudit = auditReasoningStatus(artworks, derivedBySlug)
  const publicProseMarkers = collectPublicProseMarkerHits(artworks)
  const brokenInternalLinks = checkBrokenInternalLinks(artifact)
  const privacyScan = scanBriefingPrivacy(briefingJson)
  const disagreements = countDisagreements({
    works,
    payloadPublishedTotal,
    artifactTotalArtworks: artifact['art-official:totalArtworks'],
  })

  const staleThresholdHours = CORPUS_ARTIFACT_STALE_MS / 3600000
  const artifactAgeHoursAtWrite = 0
  const auditCounts = {
    completeWithNoIntent: reasoningStatusAudit.completeWithNoIntent.length,
    intentNotMarkedComplete: reasoningStatusAudit.intentNotMarkedComplete.length,
    publicProseMarkers: publicProseMarkers.length,
    derivedComplete: reasoningEvidence.derivedDistribution.complete,
    derivedPartial: reasoningEvidence.derivedDistribution.partial,
    derivedStub: reasoningEvidence.derivedDistribution.stub,
    sessionButNoWhy: reasoningEvidence.partialSplit.sessionButNoWhy.length,
    whyButNoSession: reasoningEvidence.partialSplit.whyButNoSession.length,
    liveTimeline: reasoningEvidence.completeEvidence.liveTimeline.length,
    envelopeTranscript:
      reasoningEvidence.completeEvidence.envelopeTranscriptEmptyTimeline.length,
    ghostShellSessions: reasoningEvidence.ghostShellSessions.length,
  }
  const header = {
    generatedAt,
    artifactAgeHoursAtWrite,
    staleThresholdHours,
    auditCounts,
  }

  const reportBase: Omit<CorpusBuildReport, 'sizesBytes' | 'briefingTokenEstimate'> = {
    header,
    generatedAt,
    artifactAgeHoursAtWrite,
    staleThresholdHours,
    timingsMs: { ...timingsMs, total: Date.now() - t0 },
    counts: {
      works: works.length,
      payloadPublishedTotal,
      sessionLedger: sessionLedger.length,
      throughlines: throughlines.length,
      bioEntries: bioEntries.length,
      reasoningComplete: coverage.reasoningComplete,
    },
    reasoningStatusAudit,
    reasoningEvidence,
    countDisagreements: disagreements,
    brokenInternalLinks,
    publicProseMarkers,
    privacyScan,
    warnings: [],
  }

  if (!privacyScan.briefingClean) {
    reportBase.warnings.push(
      `PRIVACY: briefing contains forbidden keys: ${privacyScan.hits.join(', ')}`,
    )
  }
  if (reasoningStatusAudit.completeWithNoIntent.length) {
    reportBase.warnings.push(
      `reasoningStatus: ${reasoningStatusAudit.completeWithNoIntent.length} derived-complete with no intent`,
    )
  }
  if (reasoningStatusAudit.intentNotMarkedComplete.length) {
    reportBase.warnings.push(
      `reasoningStatus: ${reasoningStatusAudit.intentNotMarkedComplete.length} with intent not derived-complete`,
    )
  }
  if (brokenInternalLinks.length) {
    reportBase.warnings.push(`broken internal links: ${brokenInternalLinks.length}`)
  }
  if (publicProseMarkers.length) {
    reportBase.warnings.push(`public prose markers: ${publicProseMarkers.length}`)
  }
  if (briefingChars > BRIEFING_FETCH_CHAR_BUDGET) {
    reportBase.warnings.push(
      `BRIEFING OVER FETCH BUDGET: ${briefingChars} chars > ${BRIEFING_FETCH_CHAR_BUDGET}` +
        ` — common tools truncate at 100k; identity header may survive but works tail will not`,
    )
  }
  reportBase.warnings.push(
    `derived coverage: ${reasoningEvidence.derivedDistribution.complete} complete` +
      ` (${reasoningEvidence.completeEvidence.liveTimeline.length} live-timeline,` +
      ` ${reasoningEvidence.completeEvidence.envelopeTranscriptEmptyTimeline.length} envelope-transcript);` +
      ` partial ${reasoningEvidence.derivedDistribution.partial}` +
      ` (${reasoningEvidence.partialSplit.sessionButNoWhy.length} session-but-no-why,` +
      ` ${reasoningEvidence.partialSplit.whyButNoSession.length} why-but-no-session);` +
      ` stub ${reasoningEvidence.derivedDistribution.stub};` +
      ` ghost-shell sessions ${reasoningEvidence.ghostShellSessions.length}`,
  )

  let reportJson = ''
  const finalizeReport = (sizes: CorpusBuildReport['sizesBytes']): CorpusBuildReport => {
    const report: CorpusBuildReport = {
      ...reportBase,
      sizesBytes: sizes,
      briefingTokenEstimate: estimateTokensFromBytes(sizes.briefing),
      timingsMs: { ...reportBase.timingsMs, total: Date.now() - t0 },
    }
    reportJson = `${JSON.stringify(report, null, 2)}\n`
    return report
  }

  // First pass without build-report size, then rewrite with accurate sizes.
  let report = finalizeReport({
    corpus: corpusBytes,
    briefing: briefingBytes,
    buildReport: 0,
  })
  report = finalizeReport({
    corpus: corpusBytes,
    briefing: briefingBytes,
    buildReport: Buffer.byteLength(reportJson, 'utf8'),
  })
  timingsMs.report = Date.now() - t
  report.timingsMs = { ...timingsMs, total: Date.now() - t0 }

  await mkdir(corpusArtifactDir(cwd), { recursive: true })
  const paths = {
    corpus: corpusArtifactPath(cwd),
    briefing: corpusBriefingPath(cwd),
    buildReport: corpusBuildReportPath(cwd),
    contract: artOfficialContractPath(cwd),
    protocol: artOfficialProtocolPath(cwd),
  }
  await writeFile(paths.corpus, corpusJson, 'utf8')
  await writeFile(paths.briefing, briefingJson, 'utf8')
  await writeFile(paths.contract, contractJson, 'utf8')
  await writeFile(paths.protocol, protocolText, 'utf8')
  reportJson = `${JSON.stringify(report, null, 2)}\n`
  report.sizesBytes.buildReport = Buffer.byteLength(reportJson, 'utf8')
  reportJson = `${JSON.stringify(report, null, 2)}\n`
  await writeFile(paths.buildReport, reportJson, 'utf8')

  return { artifact, briefing, report, paths }
}
