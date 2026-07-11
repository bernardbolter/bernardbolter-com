import { getPayload } from 'payload'
import config from '@payload-config'

import { withDbUnavailableFallback } from '@/lib/payload/buildSafeDb'
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

/** Artist row with populated bio page media. */
export async function getBioPageArtist(): Promise<Artist | null> {
  return withDbUnavailableFallback(fetchBioPageArtist, null)
}
