import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'
import config from '@payload-config'

import type { Artist } from '@/payload-types'

async function fetchCvPageArtist(): Promise<Artist | null> {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'artists',
    locale: 'en',
    limit: 1,
    depth: 2,
    overrideAccess: false,
  })
  return result.docs[0] ?? null
}

const getCachedCvPageArtist = unstable_cache(fetchCvPageArtist, ['artist-cv-page'], {
  revalidate: 300,
  tags: ['artists'],
})

/** Artist row with populated CV footer media. */
export async function getCvPageArtist(): Promise<Artist | null> {
  if (process.env.NODE_ENV === 'development') {
    return fetchCvPageArtist()
  }
  return getCachedCvPageArtist()
}
