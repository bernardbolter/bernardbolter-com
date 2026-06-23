import { getPayload } from 'payload'
import config from '@payload-config'

import { withDbRetry } from '@/lib/payload/withDbRetry'

const FIXTURE_SLUG_PATTERN = '__%'

export async function getPublishedSeriesSlugs(): Promise<string[]> {
  return withDbRetry(async () => {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'series',
      where: {
        and: [
          { status: { equals: 'published' } },
          { slug: { not_like: FIXTURE_SLUG_PATTERN } },
        ],
      },
      limit: 100,
      depth: 0,
      overrideAccess: true,
    })

    return result.docs
      .map((doc) => doc.slug?.trim())
      .filter((slug): slug is string => Boolean(slug))
  })
}

export async function getPublishedEventPageSlugs(): Promise<string[]> {
  return withDbRetry(async () => {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'events',
      where: {
        and: [
          { status: { equals: 'published' } },
          { hasPage: { equals: true } },
          { slug: { not_like: FIXTURE_SLUG_PATTERN } },
        ],
      },
      limit: 500,
      depth: 0,
      overrideAccess: true,
    })

    return result.docs
      .map((doc) => doc.slug?.trim())
      .filter((slug): slug is string => Boolean(slug))
  })
}
