import { getPayload } from 'payload'
import config from '@payload-config'
import type { Artwork } from '@/payload-types'

const defaultLocale = 'en' as const

/** Depth for series parent chain + populated events and tags on the artwork page. */
export const ARTWORK_PAGE_DEPTH = 3

export async function getPublishedArtworkSlugs(): Promise<string[]> {
  const payload = await getPayload({ config })
  const slugs: string[] = []
  let page = 1
  let hasNextPage = true

  while (hasNextPage) {
    const result = await payload.find({
      collection: 'artworks',
      locale: defaultLocale,
      where: { status: { equals: 'published' } },
      limit: 100,
      page,
      depth: 0,
      select: { slug: true },
      overrideAccess: false,
    })

    for (const doc of result.docs) {
      const slug = doc.slug?.trim()
      if (slug && !slug.startsWith('__')) {
        slugs.push(slug)
      }
    }

    hasNextPage = result.hasNextPage
    page += 1
  }

  return slugs
}

export async function getPublishedArtworkForPage(slug: string): Promise<Artwork | null> {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'artworks',
    locale: defaultLocale,
    where: {
      and: [{ slug: { equals: slug } }, { status: { equals: 'published' } }],
    },
    limit: 1,
    depth: ARTWORK_PAGE_DEPTH,
    overrideAccess: false,
  })
  return result.docs[0] ?? null
}

/** Dev-only styling preview — draft fixture records with full field access. */
export async function getArtworkForPreview(slug: string): Promise<Artwork | null> {
  if (!slug.startsWith('__')) return null

  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'artworks',
    locale: defaultLocale,
    where: { slug: { equals: slug } },
    limit: 1,
    depth: ARTWORK_PAGE_DEPTH,
    overrideAccess: true,
  })
  return result.docs[0] ?? null
}
