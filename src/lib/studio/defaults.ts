import type { Payload } from 'payload'
import type { User } from '@/payload-types'

export async function getDefaultArtistId(payload: Payload, user: User): Promise<number> {
  const { docs } = await payload.find({
    collection: 'artists',
    limit: 1,
    depth: 0,
    overrideAccess: false,
    user,
  })
  const artist = docs[0]
  if (!artist) {
    throw new Error('Artist singleton not found. Create the Artist record first.')
  }
  return artist.id
}

export async function resolveSeriesId(
  payload: Payload,
  user: User,
  seriesId?: number,
): Promise<number> {
  if (seriesId) return seriesId
  const { docs } = await payload.find({
    collection: 'series',
    limit: 1,
    sort: 'name',
    depth: 0,
    overrideAccess: false,
    user,
  })
  const series = docs[0]
  if (!series) {
    throw new Error('No series found. Create a Series record first.')
  }
  return series.id
}
