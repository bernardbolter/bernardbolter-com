import type { Artist } from '@/payload-types'

import { getSiteBaseUrl } from '@/lib/jsonld/site'

const ARTISM_CONTEXT = {
  '@vocab': 'https://schema.org/',
  artism: 'https://artism.org/schema/',
} as const

const BIO_PERSON_ID = '/bio#person'

export type BuildHomeJsonLdOptions = {
  baseUrl?: string
}

export function buildHomeJsonLd(
  artist: Artist | null | undefined,
  options: BuildHomeJsonLdOptions = {},
): Record<string, unknown> {
  const baseUrl = options.baseUrl ?? getSiteBaseUrl()
  const artistName = artist?.name?.trim() || 'Bernard Bolter'
  const description =
    artist?.bioShort?.trim() ||
    'The complete archive of Bernard Bolter\'s work — transfer paintings, satellite image collages, and thirty years of practice across Berlin and San Francisco.'

  return {
    '@context': ARTISM_CONTEXT,
    '@type': ['WebSite', 'CollectionPage'],
    '@id': baseUrl,
    name: `${artistName} — Artist Archive`,
    alternateName: 'bernardbolter.com',
    url: baseUrl,
    description,
    inLanguage: 'en',
    author: {
      '@type': 'Person',
      '@id': `${baseUrl}${BIO_PERSON_ID}`,
      name: artistName,
    },
    about: {
      '@type': 'Person',
      '@id': `${baseUrl}${BIO_PERSON_ID}`,
    },
    hasPart: [
      { '@type': 'WebPage', name: 'Bio', url: `${baseUrl}/bio` },
      { '@type': 'WebPage', name: 'CV', url: `${baseUrl}/cv` },
      { '@type': 'WebPage', name: 'Statement', url: `${baseUrl}/statement` },
      { '@type': 'WebPage', name: 'Contact', url: `${baseUrl}/contact` },
    ],
    'artism:archiveVersion': '1.0',
    'artism:corpusEndpoint': `${baseUrl}/api/corpus/index`,
  }
}
