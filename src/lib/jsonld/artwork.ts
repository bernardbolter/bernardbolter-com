import type { Artwork, Artist, Media, Series, Tag } from '@/payload-types'

import { artistAsSchemaPerson } from '@/lib/jsonld/artistPerson'
import { getSiteBaseUrl } from '@/lib/jsonld/site'

const LICENSE_TO_URI: Record<string, string> = {
  'all-rights-reserved': 'https://rightsstatements.org/vocab/InC/1.0/',
  'cc-by': 'https://creativecommons.org/licenses/by/4.0/',
  'cc-by-nc': 'https://creativecommons.org/licenses/by-nc/4.0/',
  'cc-by-nc-nd': 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
  'cc-by-sa': 'https://creativecommons.org/licenses/by-sa/4.0/',
}

const MEDIUM_LABELS: Record<string, string> = {
  'acrylic-photo-transfer-on-canvas': 'Acrylic photo transfer on canvas',
  'acrylic-on-canvas': 'Acrylic on canvas',
  'mixed-media-on-canvas': 'Mixed media on canvas',
  'photo-collage': 'Photo collage',
  video: 'Video',
  digital: 'Digital',
  other: 'Other',
}

const SUPPORT_LABELS: Record<string, string> = {
  canvas: 'Canvas',
  paper: 'Paper',
  board: 'Board',
  screen: 'Screen',
  file: 'File',
  other: 'Other',
}

function mediaUrl(m: number | Media | null | undefined): string | undefined {
  if (m && typeof m === 'object' && 'url' in m && m.url) return m.url
  return undefined
}

function mmToQuantitativeValue(
  mm: number,
  dimensionUnit: Artwork['dimensionUnit'],
): Record<string, unknown> {
  if (dimensionUnit === 'in') {
    const inches = Math.round((mm / 25.4) * 1000) / 1000
    return {
      '@type': 'QuantitativeValue',
      value: inches,
      unitCode: 'INH',
      unitText: 'in',
    }
  }
  const cm = Math.round((mm / 10) * 100) / 100
  return {
    '@type': 'QuantitativeValue',
    value: cm,
    unitCode: 'CMT',
    unitText: 'cm',
  }
}

function pxToQuantitativeValue(px: number): Record<string, unknown> {
  return {
    '@type': 'QuantitativeValue',
    value: px,
    unitCode: 'E37',
    unitText: 'px',
  }
}

function tagLabels(tags: (number | Tag)[] | null | undefined): string[] {
  if (!tags?.length) return []
  return tags
    .map((t) => (typeof t === 'object' && t && 'label' in t ? String(t.label) : null))
    .filter((x): x is string => Boolean(x))
}

function isoDurationFromSeconds(sec: number): string {
  if (sec < 60) return `PT${sec}S`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return s > 0 ? `PT${m}M${s}S` : `PT${m}M`
}

export type BuildArtworkJsonLdOptions = {
  baseUrl?: string
}

/**
 * Builds schema.org VisualArtwork JSON-LD from a Payload artwork + Artist record.
 * Uses stored widthMm / heightMm / depthMm only (not dimensionsDisplay).
 */
export function buildArtworkJsonLd(
  artwork: Artwork,
  artist: Artist | null | undefined,
  options: BuildArtworkJsonLdOptions = {},
): Record<string, unknown> {
  const baseUrl = options.baseUrl ?? getSiteBaseUrl()
  const url = `${baseUrl}/artworks/${artwork.slug}`
  const creator = artistAsSchemaPerson(artist)

  const unit = artwork.dimensionUnit ?? 'cm'
  let width: Record<string, unknown> | undefined
  let height: Record<string, unknown> | undefined
  let depth: Record<string, unknown> | undefined

  if (typeof artwork.widthMm === 'number') {
    width = mmToQuantitativeValue(artwork.widthMm, unit)
  } else if (typeof artwork.widthPx === 'number') {
    width = pxToQuantitativeValue(artwork.widthPx)
  }

  if (typeof artwork.heightMm === 'number') {
    height = mmToQuantitativeValue(artwork.heightMm, unit)
  } else if (typeof artwork.heightPx === 'number') {
    height = pxToQuantitativeValue(artwork.heightPx)
  }

  if (typeof artwork.depthMm === 'number' && artwork.depthMm > 0) {
    depth = mmToQuantitativeValue(artwork.depthMm, unit)
  }

  const primaryUrl = mediaUrl(artwork.primaryImage) ?? artwork.wpImageUrl ?? undefined
  const thumbUrl = mediaUrl(artwork.posterImage) ?? primaryUrl

  const image =
    primaryUrl ?
      {
        '@type': 'ImageObject',
        url: primaryUrl,
        ...(typeof artwork.primaryImage === 'object' &&
        artwork.primaryImage &&
        typeof artwork.primaryImage.width === 'number' &&
        typeof artwork.primaryImage.height === 'number' ?
          {
            width: pxToQuantitativeValue(artwork.primaryImage.width),
            height: pxToQuantitativeValue(artwork.primaryImage.height),
          }
        : {}),
      }
    : undefined

  const sameAsUris = [
    ...(artwork.sameAsUrls?.map((row) => row.url).filter(Boolean) ?? []),
    ...(artwork.sameAs?.map((row) => row.url).filter(Boolean) ?? []),
  ]
  const sameAs = [...new Set(sameAsUris)]

  const conceptual =
    artwork.conceptualKeywords?.map((k) => k.keyword).filter(Boolean) ?? []

  const tagKeywordBuckets = [
    ...tagLabels(artwork.movementTags),
    ...tagLabels(artwork.styleTags),
    ...tagLabels(artwork.subjectTags),
    ...tagLabels(artwork.genreTags),
    ...tagLabels(artwork.periodTags),
  ]
  const keywords = [...new Set([...tagKeywordBuckets, ...conceptual])]

  let isPartOf: Record<string, unknown> | undefined
  if (artwork.series && typeof artwork.series === 'object') {
    const s = artwork.series as Series
    isPartOf = {
      '@type': 'Collection',
      name: s.name,
      url: `${baseUrl}/series/${s.slug}`,
    }
  }

  const locationCreated =
    artwork.city || artwork.country ?
      {
        '@type': 'Place',
        name: [artwork.city, artwork.country].filter(Boolean).join(', ') || undefined,
        address: {
          '@type': 'PostalAddress',
          ...(artwork.city ? { addressLocality: artwork.city } : {}),
          ...(artwork.country ? { addressCountry: artwork.country } : {}),
        },
        ...(artwork.cityTgnUri ? { sameAs: artwork.cityTgnUri } : {}),
      }
    : undefined

  const mediumKey = artwork.medium
  const artMedium =
    mediumKey === 'other' && artwork.mediumOther ?
      artwork.mediumOther
    : MEDIUM_LABELS[mediumKey] ?? mediumKey

  const artworkSurface =
    artwork.support ? (SUPPORT_LABELS[artwork.support] ?? artwork.support) : undefined

  const dateCreated =
    artwork.yearCompleted && artwork.yearCompleted !== artwork.yearCreated ?
      `${artwork.yearCreated}/${artwork.yearCompleted}`
    : String(artwork.yearCreated)

  const offers =
    artwork.editions?.map((ed) => {
      const inStock = ed.remaining == null || ed.remaining > 0
      return {
        '@type': 'Offer',
        price: ed.pricePerPrint,
        priceCurrency: ed.currency ?? 'EUR',
        availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        itemOffered: {
          '@type': 'VisualArtwork',
          name: artwork.title,
        },
      }
    }) ?? []

  const licenseUri =
    artwork.license ? LICENSE_TO_URI[artwork.license] ?? undefined : undefined

  const doc: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'VisualArtwork',
    '@id': `${url}#artwork`,
    name: artwork.title,
    url,
    identifier: {
      '@type': 'PropertyValue',
      propertyID: 'slug',
      value: artwork.slug,
    },
    creator,
    copyrightHolder: { ...creator },
    copyrightYear: artwork.yearCreated,
    dateCreated,
    description: artwork.descriptionShort ?? undefined,
    artMedium,
    ...(artworkSurface ? { artworkSurface } : {}),
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
    ...(depth ? { depth } : {}),
    ...(locationCreated ? { locationCreated } : {}),
    ...(isPartOf ? { isPartOf } : {}),
    ...(image ? { image } : {}),
    ...(thumbUrl ? { thumbnailUrl: thumbUrl } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    ...(keywords.length ? { keywords } : {}),
    ...(conceptual.length ? { about: conceptual } : {}),
    ...(artwork.creditText ? { creditText: artwork.creditText } : {}),
    ...(licenseUri ? { license: licenseUri } : {}),
    ...(typeof artwork.durationSeconds === 'number' && artwork.durationSeconds > 0 ?
      { duration: isoDurationFromSeconds(artwork.durationSeconds) }
    : {}),
    ...(offers.length ? { offers } : {}),
  }

  return JSON.parse(JSON.stringify(doc)) as Record<string, unknown>
}

/** Alias matching the spec filename wording. */
export const generateArtworkJsonLd = buildArtworkJsonLd
