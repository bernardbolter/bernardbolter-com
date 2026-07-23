import type { Metadata } from 'next'

import { getSiteBaseUrl } from '@/lib/jsonld/site'

/** Canonical Tier-1 machine index. */
export function corpusIndexUrl(baseUrl = getSiteBaseUrl()): string {
  return `${baseUrl}/api/corpus/index`
}

/** Per-artwork machine-readable corpus record. */
export function corpusRecordUrl(slug: string, baseUrl = getSiteBaseUrl()): string {
  return `${baseUrl}/api/corpus/${slug}`
}

/** Next.js metadata alternate that emits `<link rel="alternate" type="application/ld+json">`. */
export function corpusAlternateTypes(href: string): NonNullable<Metadata['alternates']> {
  return {
    types: {
      'application/ld+json': href,
    },
  }
}
