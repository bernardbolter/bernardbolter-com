import { getPayload } from 'payload'
import config from '@payload-config'
import { unstable_cache } from 'next/cache'

export const getPerson = unstable_cache(
  async () => {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'people',
      where: { role: { contains: 'artist' } },
      limit: 1,
      depth: 1,
    })
    return result.docs[0] ?? null
  },
  ['person-artist'],
  { revalidate: 300, tags: ['people'] }
)