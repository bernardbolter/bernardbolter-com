import type { Artwork, Event, Media, Series, Tag } from '@/payload-types'

import { collectArtworkSameAsUris } from '@/lib/artwork/sameAsUris'
import { buildArtMediumJsonLdValue } from '@/lib/artwork/mediumVocabulary'
import { lexicalToPlain } from '@/lib/artOfficial/lexicalToPlain'
import { applyArtworkJsonLdExtensions } from '@/lib/jsonld/artworkExtensions'
import { getSiteBaseUrl } from '@/lib/jsonld/site'
import {
  artworkHasEmbeddingMetadata,
  resolveEmbeddingMetadataList,
  visionPageUrl,
} from '@/lib/artwork/visionPage'
import { countryNameToIsoCode } from '@/utilities/countryNameToIsoCode'

const ARTISM_CONTEXT = {
  '@vocab': 'https://schema.org/',
  artism: 'https://artism.org/schema/',
} as const

const BIO_PERSON_ID = '/bio#person'

const LICENSE_TO_URI: Record<string, string> = {
  'all-rights-reserved': 'https://rightsstatements.org/vocab/InC/1.0/',
  'cc-by': 'https://creativecommons.org/licenses/by/4.0/',
  'cc-by-nc': 'https://creativecommons.org/licenses/by-nc/4.0/',
  'cc-by-nc-nd': 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
  'cc-by-sa': 'https://creativecommons.org/licenses/by-sa/4.0/',
}

export type BuildArtworkJsonLdOptions = {
  baseUrl?: string
}

function trimString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function mediaUrl(m: number | Media | null | undefined): string | undefined {
  if (m && typeof m === 'object' && 'url' in m && m.url) return m.url
  return undefined
}

function tagLabels(tags: (number | Tag)[] | null | undefined): string[] {
  if (!tags?.length) return []
  return tags
    .map((tag) => (typeof tag === 'object' && tag && 'label' in tag ? String(tag.label) : null))
    .filter((label): label is string => Boolean(label))
}

function dimensionQuantitativeValue(
  whole: number | null | undefined,
  unit: Artwork['dimensionUnit'],
): Record<string, unknown> | undefined {
  if (whole == null || Number.isNaN(Number(whole))) return undefined
  const value = unit === 'in' ? Math.round(Number(whole) * 2.54 * 100) / 100 : Number(whole)
  return {
    '@type': 'QuantitativeValue',
    value,
    unitCode: 'CMT',
  }
}

function artworkDescription(artwork: Artwork): string | undefined {
  const long = lexicalToPlain(artwork.descriptionLong).replace(/\s+/g, ' ').trim()
  if (long) return long
  const short = trimString(artwork.descriptionShort)
  return short || undefined
}

function buildAdditionalProperty(artwork: Artwork, baseUrl: string): Record<string, unknown>[] {
  const additionalProperty: Record<string, unknown>[] = []

  const addProp = (id: string, name: string, value: unknown) => {
    if (value == null) return
    const normalized = typeof value === 'object' ? JSON.stringify(value) : String(value)
    if (!normalized.trim() || normalized === 'null') return
    additionalProperty.push({
      '@type': 'PropertyValue',
      propertyID: id,
      name,
      value: normalized,
    })
  }

  addProp('artism:intent', 'Intent', artwork.intent)
  addProp(
    'artism:formalContributionAssessment',
    'Formal Contribution Assessment',
    artwork.formalContributionAssessment,
  )
  addProp('artism:consciousRejections', 'Conscious Rejections', artwork.consciousRejections)
  addProp('artism:encounterNote', 'Encounter Note', artwork.encounterNote)
  addProp('artism:intentVsOutcome', 'Intent vs Outcome', artwork.intentVsOutcome)
  addProp('artism:makingNote', 'Making Note', artwork.makingNote)
  addProp('artism:directInspiration', 'Direct Inspiration', artwork.directInspiration)
  addProp('artism:workContext', 'Work Context', artwork.workContext)
  addProp('artism:seriesContext', 'Series Context', artwork.seriesContext)
  addProp(
    'artism:artHistoricalContext',
    'Art Historical Context',
    artwork.artHistoricalContext,
  )
  addProp('artism:compositionalNotes', 'Compositional Notes', artwork.compositionalNotes)
  addProp('artism:sizeTier', 'Size Tier', artwork.sizeTier)
  addProp('artism:orientation', 'Orientation', artwork.orientation)
  addProp('artism:catalogueNumber', 'Catalogue Number', artwork.catalogueNumber)
  const reasoningStatus = trimString(artwork.reasoningStatus)
  if (reasoningStatus && reasoningStatus !== 'stub') {
    addProp('artism:reasoningStatus', 'Reasoning Status', reasoningStatus)
  }

  const dominantColors =
    artwork.dominantColors?.map((row) => trimString(row.hex)).filter(Boolean) ?? []
  if (dominantColors.length) {
    addProp('artism:dominantColors', 'Dominant Colors', dominantColors.join(', '))
  }

  return additionalProperty
}

function buildSubjectOf(artwork: Artwork, baseUrl: string): Record<string, unknown>[] {
  const docs = artwork.events?.docs
  if (!Array.isArray(docs)) return []

  return docs
    .filter((event): event is Event => typeof event === 'object' && event !== null)
    .filter((event) => event.hasPage && trimString(event.slug))
    .map((event) => ({ '@id': `${baseUrl}/events/${event.slug!.trim()}` }))
}

function resolveSeries(artwork: Artwork): Series | null {
  if (!artwork.series || typeof artwork.series !== 'object') return null
  return artwork.series as Series
}

/**
 * Programmatic VisualArtwork JSON-LD per homepage-interaction-jsonld-spec.md Part 4.
 */
export function buildArtworkJsonLd(
  artwork: Artwork,
  _artist?: unknown,
  options: BuildArtworkJsonLdOptions = {},
): Record<string, unknown> {
  const baseUrl = options.baseUrl ?? getSiteBaseUrl()
  const slug = artwork.slug
  const url = `${baseUrl}/${slug}`
  const description = artworkDescription(artwork)
  const additionalProperty = buildAdditionalProperty(artwork, baseUrl)
  const subjectOf = buildSubjectOf(artwork, baseUrl)
  const series = resolveSeries(artwork)
  const location = artwork.locationCreated
  const addressCountry =
    trimString(location?.countryCode) ||
    countryNameToIsoCode(location?.country) ||
    trimString(location?.country)

  const doc: Record<string, unknown> = {
    '@context': ARTISM_CONTEXT,
    '@type': 'VisualArtwork',
    '@id': url,
    name: artwork.title,
    url,
    dateCreated: String(artwork.yearCreated),
    creator: { '@id': `${baseUrl}${BIO_PERSON_ID}` },
  }

  const altTitle = trimString(artwork.altTitle)
  if (altTitle) doc.alternateName = altTitle
  if (description) doc.description = description

  const artMedium = buildArtMediumJsonLdValue(artwork)
  if (artMedium) doc.artMedium = artMedium

  const width = dimensionQuantitativeValue(artwork.widthWhole, artwork.dimensionUnit)
  if (width) doc.width = width

  const height = dimensionQuantitativeValue(artwork.heightWhole, artwork.dimensionUnit)
  if (height) doc.height = height

  if (series?.name && series.slug) {
    doc.isPartOf = {
      '@type': 'CreativeWorkSeries',
      name: series.name,
      url: `${baseUrl}/series/${series.slug}`,
    }
  }

  if (location?.city) {
    doc.locationCreated = {
      '@type': 'Place',
      name: location.city,
      address: {
        '@type': 'PostalAddress',
        addressLocality: location.city,
        ...(addressCountry ? { addressCountry } : {}),
      },
    }
  }

  const keywords =
    artwork.conceptualKeywords?.map((row) => trimString(row.keyword)).filter(Boolean) ?? []
  if (keywords.length) doc.keywords = keywords.join(', ')

  const genreLabels = tagLabels(artwork.genreTags)
  if (genreLabels.length) doc.genre = genreLabels.join(', ')

  const subjectLabels = tagLabels(artwork.subjectTags)
  if (subjectLabels.length) {
    doc.about = subjectLabels.map((label) => ({ '@type': 'Thing', name: label }))
  }

  const imageUrl = mediaUrl(artwork.primaryImage) ?? mediaUrl(artwork.posterImage)
  if (imageUrl) doc.image = imageUrl

  const sameAs = collectArtworkSameAsUris(artwork)
  if (sameAs.length) doc.sameAs = sameAs

  if (subjectOf.length) doc.subjectOf = subjectOf

  const licenseUri = artwork.license ? LICENSE_TO_URI[artwork.license] : undefined
  if (licenseUri) doc.license = licenseUri

  const creditText = trimString(artwork.creditText)
  if (creditText) doc.creditText = creditText

  if (additionalProperty.length) doc.additionalProperty = additionalProperty

  if (artworkHasEmbeddingMetadata(artwork) && artwork.slug?.trim()) {
    doc['artism:visionPageUrl'] = visionPageUrl(baseUrl, artwork.slug.trim())
  }

  applyArtworkJsonLdExtensions(doc, artwork, baseUrl)

  return JSON.parse(JSON.stringify(doc)) as Record<string, unknown>
}
