import { getPayload } from 'payload'
import config from '@payload-config'
import { unstable_cache } from 'next/cache'

/** Cached primary artist row for layout / provider (replaces legacy People query). */
export const getPerson = unstable_cache(
  async () => {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'artists',
      limit: 1,
      depth: 0,
      overrideAccess: false,
    })
    return result.docs[0] ?? null
  },
  ['artist-site-record'],
  { revalidate: 300, tags: ['artists'] },
)
