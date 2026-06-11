import type {
  ArtHistoricalReference,
  Artwork,
  Artist,
  Media,
  Series,
  Tag,
} from '@/payload-types'

import { buildArtMediumJsonLdValue } from '@/lib/artwork/mediumVocabulary'
import { artistAsSchemaPerson } from '@/lib/jsonld/artistPerson'
import { getSiteBaseUrl } from '@/lib/jsonld/site'

const LICENSE_TO_URI: Record<string, string> = {
  'all-rights-reserved': 'https://rightsstatements.org/vocab/InC/1.0/',
  'cc-by': 'https://creativecommons.org/licenses/by/4.0/',
  'cc-by-nc': 'https://creativecommons.org/licenses/by-nc/4.0/',
  'cc-by-nc-nd': 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
  'cc-by-sa': 'https://creativecommons.org/licenses/by-sa/4.0/',
}

const SUPPORT_LABELS: Record<string, string> = {
  canvas: 'Canvas',
  paper: 'Paper',
  board: 'Board',
  screen: 'Screen',
  file: 'File',
  other: 'Other',
}

const ARTISM_CONTEXT = {
  '@vocab': 'https://schema.org/',
  artism: 'https://artism.org/schema/',
} as const

export type GenerateArtworkJsonLdOptions = {
  baseUrl?: string
}

function mediaUrl(m: number | Media | null | undefined): string | undefined {
  if (m && typeof m === 'object' && 'url' in m && m.url) return m.url
  return undefined
}

function trimString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function tagLabels(tags: (number | Tag)[] | null | undefined): string[] {
  if (!tags?.length) return []
  return tags
    .map((t) => (typeof t === 'object' && t && 'label' in t ? String(t.label) : null))
    .filter((x): x is string => Boolean(x))
}

function cmQuantitativeValue(mm: number): Record<string, unknown> {
  const cm = Math.round((mm / 10) * 100) / 100
  return {
    '@type': 'QuantitativeValue',
    value: cm,
    unitCode: 'CMT',
    unitText: 'cm',
  }
}

function resolveSupportLabel(artwork: Artwork): string | undefined {
  if (!artwork.support) return undefined
  return SUPPORT_LABELS[artwork.support] ?? artwork.support
}

function collectSameAsUris(artwork: Artwork): string[] {
  const uris = new Set<string>()
  for (const row of artwork.sameAsUrls ?? []) {
    const url = trimString(row.url)
    if (url) uris.add(url)
  }
  for (const row of artwork.sameAs ?? []) {
    const url = trimString(row.url)
    if (url) uris.add(url)
  }
  return [...uris]
}

function resolveTopLevelSeries(series: Series): Series {
  let current: Series = series
  while (current.parentSeries && typeof current.parentSeries === 'object') {
    current = current.parentSeries as Series
  }
  return current
}

function buildMentions(
  refs: (number | ArtHistoricalReference)[] | null | undefined,
): Array<Record<string, unknown>> {
  if (!refs?.length) return []
  const out: Array<Record<string, unknown>> = []
  for (const ref of refs) {
    if (!ref || typeof ref !== 'object') continue
    const title = trimString(ref.artworkTitle)
    const artistName = trimString(ref.artistName)
    if (title) {
      out.push({
        '@type': 'VisualArtwork',
        name: title,
        ...(artistName ? { creator: { '@type': 'Person', name: artistName } } : {}),
        ...(ref.yearCreated ? { dateCreated: String(ref.yearCreated) } : {}),
        ...(ref.referenceUrl ? { sameAs: ref.referenceUrl } : {}),
      })
      continue
    }
    if (artistName) {
      out.push({ '@type': 'Person', name: artistName })
    }
  }
  return out
}

type ProvenanceLayerRow = {
  confidenceLevel?: string
}

function deriveProvenanceConfidenceLevel(artwork: Artwork): string | undefined {
  const originKnown = (artwork as { provenanceOriginKnown?: boolean | null }).provenanceOriginKnown
  if (originKnown === false) return 'undocumented'

  const layers = (artwork as { provenanceConfidenceLayer?: ProvenanceLayerRow[] | null })
    .provenanceConfidenceLayer
  if (!Array.isArray(layers) || layers.length === 0) return undefined

  const levels = layers.map((row) => row.confidenceLevel).filter(Boolean)
  if (levels.length === 0) return undefined
  if (levels.every((level) => level === 'documented-fact')) return 'documented'
  return 'partial'
}

function setArtismField(
  target: Record<string, unknown>,
  key: string,
  value: unknown,
): void {
  if (value == null) return
  if (typeof value === 'string' && !value.trim()) return
  if (Array.isArray(value) && value.length === 0) return
  target[`artism:${key}`] = value
}

/**
 * Programmatic VisualArtwork JSON-LD per artwork-page-directive.md.
 * Omits empty artism: fields; never emits private commerce/provenance raw data.
 */
export function generateArtworkJsonLd(
  artwork: Artwork,
  artist: Artist | null | undefined,
  options: GenerateArtworkJsonLdOptions = {},
): Record<string, unknown> {
  const baseUrl = options.baseUrl ?? getSiteBaseUrl()
  const slug = artwork.slug
  const url = `${baseUrl}/${slug}`
  const creator = artistAsSchemaPerson(artist)

  const doc: Record<string, unknown> = {
    '@context': ARTISM_CONTEXT,
    '@type': 'VisualArtwork',
    name: artwork.title,
    url,
    inLanguage: 'en',
    creator,
    copyrightHolder: { ...creator },
    copyrightYear: artwork.yearCreated,
    dateCreated: String(artwork.yearCreated),
  }

  const altTitle = trimString(artwork.altTitle)
  if (altTitle) doc.alternateName = altTitle

  const catalogueNumber = trimString(artwork.catalogueNumber)
  if (catalogueNumber) {
    doc.identifier = {
      '@type': 'PropertyValue',
      propertyID: 'CatalogueNumber',
      value: catalogueNumber,
    }
  }

  const sameAs = collectSameAsUris(artwork)
  if (sameAs.length) doc.sameAs = sameAs

  if (
    artwork.yearCompleted != null &&
    artwork.yearCompleted !== artwork.yearCreated
  ) {
    doc.dateModified = String(artwork.yearCompleted)
  }

  const artMedium = buildArtMediumJsonLdValue(artwork)
  doc.artMedium = artMedium
  const mediumLabel =
    typeof artMedium === 'string'
      ? artMedium
      : (typeof artMedium.name === 'string' ? artMedium.name : artwork.medium)

  const supportLabel = resolveSupportLabel(artwork)
  if (supportLabel) doc.artworkSurface = supportLabel

  const genreLabels = tagLabels(artwork.genreTags)
  if (genreLabels.length) doc.artform = genreLabels

  const material = [mediumLabel, supportLabel].filter(Boolean)
  if (material.length) doc.material = material

  if (typeof artwork.widthMm === 'number') doc.width = cmQuantitativeValue(artwork.widthMm)
  if (typeof artwork.heightMm === 'number') doc.height = cmQuantitativeValue(artwork.heightMm)
  if (typeof artwork.depthMm === 'number' && artwork.depthMm > 0) {
    doc.depth = cmQuantitativeValue(artwork.depthMm)
  }

  if (artwork.city || artwork.country) {
    doc.locationCreated = {
      '@type': 'Place',
      name: [artwork.city, artwork.country].filter(Boolean).join(', ') || undefined,
      address: {
        '@type': 'PostalAddress',
        ...(artwork.city ? { addressLocality: artwork.city } : {}),
        ...(artwork.country ? { addressCountry: artwork.country } : {}),
      },
      ...(artwork.cityTgnUri ? { sameAs: artwork.cityTgnUri } : {}),
    }
  }

  if (artwork.series && typeof artwork.series === 'object') {
    const top = resolveTopLevelSeries(artwork.series as Series)
    doc.isPartOf = {
      '@type': 'Collection',
      name: top.name,
      url: `${baseUrl}/series/${top.slug}`,
    }
  }

  const keywords =
    artwork.conceptualKeywords?.map((k) => k.keyword).filter(Boolean) ?? []
  if (keywords.length) doc.keywords = keywords

  const about = tagLabels(artwork.subjectTags)
  if (about.length) doc.about = about

  const mentions = buildMentions(artwork.artHistoricalReferences)
  if (mentions.length) doc.mentions = mentions

  const description = trimString(artwork.descriptionShort)
  if (description) doc.description = description

  const primaryUrl = mediaUrl(artwork.primaryImage) ?? mediaUrl(artwork.posterImage)
  if (primaryUrl) {
    const image: Record<string, unknown> = {
      '@type': 'ImageObject',
      url: primaryUrl,
    }
    if (
      typeof artwork.primaryImage === 'object' &&
      artwork.primaryImage &&
      typeof artwork.primaryImage.width === 'number'
    ) {
      image.width = artwork.primaryImage.width
    }
    if (
      typeof artwork.primaryImage === 'object' &&
      artwork.primaryImage &&
      typeof artwork.primaryImage.height === 'number'
    ) {
      image.height = artwork.primaryImage.height
    }
    doc.image = image
  }

  const licenseUri = artwork.license ? LICENSE_TO_URI[artwork.license] : undefined
  if (licenseUri) doc.license = licenseUri

  const creditText = trimString(artwork.creditText)
  if (creditText) doc.creditText = creditText

  setArtismField(doc, 'intent', artwork.intent)
  setArtismField(doc, 'makingNote', artwork.makingNote)
  setArtismField(doc, 'directInspiration', artwork.directInspiration)
  setArtismField(doc, 'encounterNote', artwork.encounterNote)
  setArtismField(doc, 'workContext', artwork.workContext)
  setArtismField(doc, 'intentVsOutcome', artwork.intentVsOutcome)
  setArtismField(doc, 'consciousRejections', artwork.consciousRejections)
  setArtismField(
    doc,
    'formalContributionAssessment',
    artwork.formalContributionAssessment,
  )
  setArtismField(doc, 'seriesContext', artwork.seriesContext)
  setArtismField(doc, 'artHistoricalContext', artwork.artHistoricalContext)
  setArtismField(doc, 'processNotes', artwork.processNotes)
  setArtismField(doc, 'materialAndProcessMeaning', artwork.materialAndProcessMeaning)
  setArtismField(doc, 'sourceMaterials', artwork.sourceMaterials)

  if (artwork.reasoningStatus) {
    setArtismField(doc, 'reasoningStatus', artwork.reasoningStatus)
  }

  doc['artism:clipEmbeddingEndpoint'] = `${baseUrl}/${slug}/embedding`

  const dominantColours =
    artwork.dominantColors?.map((row) => trimString(row.hex)).filter(Boolean) ?? []
  if (dominantColours.length) {
    setArtismField(doc, 'dominantColours', dominantColours)
  }

  const provenanceLevel = deriveProvenanceConfidenceLevel(artwork)
  if (provenanceLevel) {
    setArtismField(doc, 'provenanceConfidenceLevel', provenanceLevel)
  }

  if (artwork.workState) {
    setArtismField(doc, 'workState', artwork.workState)
  }

  return JSON.parse(JSON.stringify(doc)) as Record<string, unknown>
}
