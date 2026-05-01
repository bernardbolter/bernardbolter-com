import { getPayload, type Where } from 'payload'
import config from '@payload-config'
import { unstable_cache } from 'next/cache'

const getPayloadInstance = async () => getPayload({ config })

export const getArtworks = unstable_cache(
  async (seriesSlug?: string) => {
    const payload = await getPayloadInstance()

    const where: Where = seriesSlug
      ? {
          'series.slug': {
            equals: seriesSlug,
          },
        }
      : {}

    const result = await payload.find({
      collection: 'artworks',
      where,
      sort: '-dateCreated',
      depth: 2,
      limit: 500,
    })

    return result.docs
  },
  ['artworks-archive'],
  {
    revalidate: 3600,
    tags: ['artworks'],
  },
)
