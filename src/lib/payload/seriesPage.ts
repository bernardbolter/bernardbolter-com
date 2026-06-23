import { getPayload } from 'payload'
import config from '@payload-config'

import { withDbRetry } from '@/lib/payload/withDbRetry'
import type { Series } from '@/payload-types'

const defaultLocale = 'en' as const

/** Published series row for /series/[slug] (404 when missing or unpublished). */
export async function getSeriesBySlug(slug: string): Promise<Series | null> {
  return withDbRetry(async () => {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'series',
      locale: defaultLocale,
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
