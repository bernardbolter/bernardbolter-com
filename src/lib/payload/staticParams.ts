import { getPayload } from 'payload'
import config from '@payload-config'

import { isPublicCatalogueSlug } from '@/lib/payload/publicSlug'
import { withDbRetry } from '@/lib/payload/withDbRetry'

export async function getPublishedSeriesSlugs(): Promise<string[]> {
  return withDbRetry(async () => {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'series',
      where: { status: { equals: 'published' } },
      limit: 100,
      depth: 0,
      overrideAccess: true,
    })

    return result.docs
      .map((doc) => doc.slug?.trim())
      .filter((slug): slug is string => isPublicCatalogueSlug(slug))
  })
}

export async function getPublishedEventPageSlugs(): Promise<string[]> {
  return withDbRetry(async () => {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'events',
      where: {
        and: [{ status: { equals: 'published' } }, { hasPage: { equals: true } }],
      },
      limit: 500,
      depth: 0,
      overrideAccess: true,
    })

    return result.docs
      .map((doc) => doc.slug?.trim())
      .filter((slug): slug is string => isPublicCatalogueSlug(slug))
  })
}
