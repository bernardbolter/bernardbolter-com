import { getPayload } from 'payload'
import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import type { Event } from '@/payload-types'

const defaultLocale = 'en' as const

/**
 * Published events intended for the public CV (respects `excludeFromCv`).
 */
export const getCvEvents = unstable_cache(
  async (): Promise<Event[]> => {
    const payload = await getPayload({ config })
    const { docs } = await payload.find({
      collection: 'events',
      locale: defaultLocale,
      where: {
        and: [
          { status: { equals: 'published' } },
          { excludeFromCv: { not_equals: true } },
        ],
      },
      limit: 500,
      depth: 0,
      sort: '-startDate',
      overrideAccess: false,
    })
    return docs
  },
  ['cv-events-published'],
  { revalidate: 3600, tags: ['events'] },
)
