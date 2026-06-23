import { getPayload } from 'payload'
import config from '@payload-config'
import type { Artist, Media } from '@/payload-types'

import { withDbRetry } from '@/lib/payload/withDbRetry'

const defaultLocale = 'en' as const

async function populateLocationMapImages(artist: Artist, payload: Awaited<ReturnType<typeof getPayload>>): Promise<Artist> {
  const locations = artist.locations
  if (!locations?.length) return artist

  const enriched = await Promise.all(
    locations.map(async (location) => {
      const mapImage = location.mapImage
      if (!mapImage || typeof mapImage !== 'number') return location

      try {
        const media = await payload.findByID({
          collection: 'media',
          id: mapImage,
          depth: 0,
          overrideAccess: false,
        })
        return { ...location, mapImage: media as Media }
      } catch {
        return location
      }
    }),
  )

  return { ...artist, locations: enriched }
}

/** Artist record with contact page fields for /contact. */
export async function getArtistForContactPage(): Promise<Artist | null> {
  return withDbRetry(async () => {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'artists',
      locale: defaultLocale,
      limit: 1,
      depth: 2,
      sort: 'id',
      overrideAccess: false,
    })

    const artist = result.docs[0]
    if (!artist) return null

    return populateLocationMapImages(artist, payload)
  })
}
