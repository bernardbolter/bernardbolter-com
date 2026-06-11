import type { Artwork } from '@/payload-types'

import type { CustomMediumRow } from '@/lib/artOfficial/artworkMediumOptions'
import { BUILTIN_ARTWORK_MEDIUM_OPTIONS } from '@/lib/artOfficial/artworkMediumOptions'

/** Built-in medium slugs → Getty AAT URI. Extend as terms are confirmed. */
export const BUILTIN_MEDIUM_AAT: Record<string, string> = {
  // Example: 'acrylic-on-canvas': 'http://vocab.getty.edu/aat/300014666',
}

export function resolveMediumLabel(artwork: Artwork): string {
  if (artwork.medium === 'other' && artwork.mediumOther?.trim()) {
    return artwork.mediumOther.trim()
  }
  const slug = artwork.medium
  if (!slug) return ''
  const builtin = BUILTIN_ARTWORK_MEDIUM_OPTIONS.find((o) => o.value === slug)
  if (builtin) return builtin.label
  return slug.replaceAll('-', ' ')
}

export function aatTermCodeFromUri(uri: string): string | undefined {
  const match = uri.trim().match(/aat\/(\d+)/i)
  return match?.[1]
}

export function lookupMediumAatUri(
  mediumSlug: string,
  customMediums: readonly CustomMediumRow[] = [],
): string | undefined {
  const fromBuiltin = BUILTIN_MEDIUM_AAT[mediumSlug]?.trim()
  if (fromBuiltin) return fromBuiltin

  const custom = customMediums.find((row) => row.value === mediumSlug)
  const fromCustom = custom?.aatUri?.trim()
  return fromCustom || undefined
}

export function buildDefinedTermMedium(
  name: string,
  aatUri: string,
): Record<string, unknown> {
  const termCode = aatTermCodeFromUri(aatUri)
  return {
    '@type': 'DefinedTerm',
    name,
    inDefinedTermSet: 'http://vocab.getty.edu/aat/',
    ...(termCode ? { termCode } : {}),
    sameAs: aatUri,
  }
}

/**
 * JSON-LD artMedium value: DefinedTerm when AAT is known, otherwise plain label string.
 * Prefers artwork.mediumAatUri, then registry lookup for the medium slug.
 */
export function buildArtMediumJsonLdValue(
  artwork: Artwork,
  customMediums: readonly CustomMediumRow[] = [],
): string | Record<string, unknown> {
  const label = resolveMediumLabel(artwork)
  const uri =
    artwork.mediumAatUri?.trim() ||
    (artwork.medium ? lookupMediumAatUri(artwork.medium, customMediums) : undefined)
  if (uri) return buildDefinedTermMedium(label, uri)
  return label
}
