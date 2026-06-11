import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'
import config from '@payload-config'

import type { Artist } from '@/payload-types'

async function fetchBioPageArtist(): Promise<Artist | null> {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'artists',
    limit: 1,
    depth: 2,
    overrideAccess: false,
  })
  return result.docs[0] ?? null
}

const getCachedBioPageArtist = unstable_cache(fetchBioPageArtist, ['artist-bio-page'], {
  revalidate: 300,
  tags: ['artists'],
})

/** Artist row with populated bio page media. */
export async function getBioPageArtist(): Promise<Artist | null> {
  if (process.env.NODE_ENV === 'development') {
    return fetchBioPageArtist()
  }
  return getCachedBioPageArtist()
}
