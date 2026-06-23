import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'
import config from '@payload-config'

import { withDbRetry } from '@/lib/payload/withDbRetry'
import type { Series } from '@/payload-types'

async function fetchSeriesBySlug(slug: string): Promise<Series | null> {
  return withDbRetry(async () => {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'series',
      where: {
        and: [{ slug: { equals: slug } }, { status: { equals: 'published' } }],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    return result.docs[0] ?? null
  })
}

const getCachedSeriesBySlug = (slug: string) =>
  unstable_cache(() => fetchSeriesBySlug(slug), ['series-page', slug], {
    revalidate: 3600,
    tags: ['series', `series-${slug}`],
  })

/** Published series row for /series/[slug] (404 when missing or unpublished). */
export async function getSeriesBySlug(slug: string): Promise<Series | null> {
  if (process.env.NODE_ENV === 'development') {
    return fetchSeriesBySlug(slug)
  }
  return getCachedSeriesBySlug(slug)()
}
