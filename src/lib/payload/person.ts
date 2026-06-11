import { getPayload } from 'payload'
import config from '@payload-config'
import { unstable_cache } from 'next/cache'

import type { Artist } from '@/payload-types'

async function fetchArtistRecord(): Promise<Artist | null> {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'artists',
    limit: 1,
    depth: 0,
    overrideAccess: false,
  })
  return result.docs[0] ?? null
}

const getCachedPerson = unstable_cache(fetchArtistRecord, ['artist-site-record'], {
  revalidate: 300,
  tags: ['artists'],
})

/** Primary artist row for layout / provider (replaces legacy People query). */
export async function getPerson(): Promise<Artist | null> {
  if (process.env.NODE_ENV === 'development') {
    return fetchArtistRecord()
  }
  return getCachedPerson()
}
