import type { Metadata } from 'next'

import { getSiteBaseUrl } from '@/lib/jsonld/site'

export type BuildPageMetadataInput = {
  title: string
  description: string
  /** Site path beginning with `/`, or `/` for the homepage. */
  path: string
  /** Extra fields merged on top (e.g. corpus alternates on the homepage). */
  extras?: Metadata
}

/**
 * Wire description + Open Graph + Twitter from the same per-page source.
 * Root layout only carries site-wide defaults (siteName, images, locale);
 * page-specific og:description / og:url / twitter:description must be set here
 * or they inherit the homepage values forever.
 */
export function buildPageMetadata({
  title,
  description,
  path,
  extras,
}: BuildPageMetadataInput): Metadata {
  const base = getSiteBaseUrl().replace(/\/$/, '')
  const url = path === '/' ? base : `${base}${path.startsWith('/') ? path : `/${path}`}`

  const page: Metadata = {
    title,
    description,
    alternates: { canonical: path === '/' ? '/' : path },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }

  if (!extras) return page

  return {
    ...page,
    ...extras,
    alternates: { ...page.alternates, ...extras.alternates },
    openGraph: { ...page.openGraph, ...extras.openGraph },
    twitter: { ...page.twitter, ...extras.twitter },
  }
}
