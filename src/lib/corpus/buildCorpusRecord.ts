import { artworkHasThroughlineConnections } from '@/lib/artist/reciprocalLinks'
import { resolveMediumLabel } from '@/lib/artwork/mediumVocabulary'
import { computeAvailableTiers } from '@/lib/corpus/availableTiers'
import { CORPUS_BASE } from '@/lib/corpus/constants'
import { resolveGist } from '@/lib/corpus/corpusGist'
import { buildSeriesNode, buildSeriesRef } from '@/lib/corpus/seriesIdentity'
import type { Artist, Artwork, Series } from '@/payload-types'

export type CorpusRecordDepth = 'index' | 'survey'

export type BuildCorpusRecordContext = {
  baseUrl?: string
  sessionCount?: number
  /** Artist row for Tier 1 reciprocal-connection signal (live reverse lookup). */
  artist?: Artist | null
}

function resolveSeries(artwork: Artwork): Series | null {
  if (!artwork.series || typeof artwork.series !== 'object') return null
  return artwork.series as Series
}

function dominantColorHexes(artwork: Artwork): string[] {
  return (
    artwork.dominantColors?.map((row) => row?.hex?.trim()).filter((hex): hex is string => Boolean(hex)) ??
    []
  )
}

function keywordsString(artwork: Artwork): string | null {
  const keywords =
    artwork.conceptualKeywords?.map((row) => row?.keyword?.trim()).filter(Boolean) ?? []
  return keywords.length ? keywords.join(', ') : null
}

/**
 * Shared artwork projection for Tier 1 (index) and Tier 2 (survey).
 * Tier 4 uses buildArtworkJsonLd — do not fork field mapping here.
 */
export function buildCorpusRecord(
  artwork: Artwork,
  depth: CorpusRecordDepth,
  ctx: BuildCorpusRecordContext = {},
): Record<string, unknown> {
  const baseUrl = ctx.baseUrl ?? CORPUS_BASE
  const sessionCount = ctx.sessionCount ?? 0
  const slug = artwork.slug?.trim() || ''
  const pageUrl = `${baseUrl}/${slug}`
  const series = resolveSeries(artwork)
  const gist = resolveGist(artwork)
  const medium = resolveMediumLabel(artwork) || artwork.medium || null

  const availableTiers = computeAvailableTiers(artwork, sessionCount)

  const record: Record<string, unknown> = {
    '@type': 'VisualArtwork',
    '@id': pageUrl,
    name: artwork.title,
    url: pageUrl,
    dateCreated: artwork.yearCreated != null ? String(artwork.yearCreated) : undefined,
    ...(medium ? { artMedium: medium } : {}),
    ...(artwork.catalogueNumber
      ? {
          identifier: {
            '@type': 'PropertyValue',
            propertyID: 'art-official:catalogueNumber',
            value: artwork.catalogueNumber,
          },
        }
      : {}),
    ...(series?.slug ? { isPartOf: buildSeriesRef(series, baseUrl) } : {}),
    'art-official:slug': slug,
    ...(artwork.reasoningStatus
      ? { 'art-official:reasoningStatus': artwork.reasoningStatus }
      : {}),
    ...(gist.text != null
      ? {
          'art-official:gist': gist.text,
          'art-official:gistSource': gist.source,
        }
      : {}),
    'art-official:availableTiers': availableTiers,
  }

  // Drop undefined dateCreated if year missing
  if (record.dateCreated === undefined) delete record.dateCreated

  if (depth === 'survey') {
    const descriptionShort = artwork.descriptionShort?.trim()
    if (descriptionShort) record.description = descriptionShort

    const intentLine = artwork.intent?.trim()
    if (intentLine) record['art-official:intentLine'] = intentLine

    const colors = dominantColorHexes(artwork)
    if (colors.length) record['art-official:dominantColors'] = colors

    const keywords = keywordsString(artwork)
    if (keywords) record.keywords = keywords
  }

  // Literal per-record URLs — required for agents that refuse template-constructed fetches.
  record['art-official:recordUrl'] = `${baseUrl}/api/corpus/${slug}`
  record['art-official:visionPageUrl'] = `${baseUrl}/${slug}/vision`
  if (availableTiers['5']) {
    record['art-official:sessionsUrl'] = `${baseUrl}/api/corpus/${slug}/sessions`
  }

  // Tier 1 signal only — full reciprocal detail stays on Tier 4.
  if (ctx.artist && artworkHasThroughlineConnections(ctx.artist, artwork)) {
    record['art-official:hasThroughlineConnections'] = true
  }

  return record
}

export function buildUrlTemplates(baseUrl: string = CORPUS_BASE): Record<string, string> {
  return {
    page: `${baseUrl}/{slug}`,
    record: `${baseUrl}/api/corpus/{slug}`,
    visionPage: `${baseUrl}/{slug}/vision`,
    sessions: `${baseUrl}/api/corpus/{slug}/sessions`,
    sessionsPage: `${baseUrl}/sessions?artwork={slug}`,
  }
}

/** Re-export for callers that need a full series node beside records. */
export { buildSeriesNode }
