import type { Payload } from 'payload'

import type { Artwork, FieldNote, Media, Series, User } from '@/payload-types'

import { getDefaultArtistId, resolveSeriesId } from '@/lib/studio/defaults'
import { slugifyStudioTitle } from '@/lib/studio/slugify'

/** Subset returned by listStudioArtworks select. */
export type StudioArtworkListItem = Pick<
  Artwork,
  | 'id'
  | 'title'
  | 'medium'
  | 'status'
  | 'updatedAt'
  | 'primaryImage'
  | 'finalReferenceImage'
  | 'processPhotos'
  | 'series'
>

export async function listStudioArtworks(payload: Payload, user: User, limit = 50) {
  return payload.find({
    collection: 'artworks',
    sort: '-updatedAt',
    limit,
    depth: 1,
    overrideAccess: false,
    user,
    select: {
      title: true,
      medium: true,
      status: true,
      updatedAt: true,
      primaryImage: true,
      finalReferenceImage: true,
      processPhotos: true,
      series: true,
    },
  })
}

export async function getStudioArtwork(payload: Payload, user: User, id: number) {
  return payload.findByID({
    collection: 'artworks',
    id,
    depth: 2,
    overrideAccess: false,
    user,
  })
}

export async function listArtworkProcessNotes(
  payload: Payload,
  user: User,
  artworkId: number,
): Promise<FieldNote[]> {
  const { docs } = await payload.find({
    collection: 'field-notes',
    where: { relatedArtwork: { equals: artworkId } },
    sort: 'capturedAt',
    limit: 200,
    depth: 1,
    overrideAccess: false,
    user,
  })
  return docs
}

export async function createStudioArtwork(
  payload: Payload,
  user: User,
  input: { title: string; medium?: string; seriesId?: number },
): Promise<Artwork> {
  const title = input.title.trim()
  if (!title) throw new Error('Title is required')

  const creator = await getDefaultArtistId(payload, user)
  const series = await resolveSeriesId(payload, user, input.seriesId)
  const slug = `${slugifyStudioTitle(title)}-${Date.now().toString(36)}`
  const year = new Date().getFullYear()

  return payload.create({
    collection: 'artworks',
    data: {
      title,
      slug,
      creator,
      series,
      status: 'draft',
      recordOrigin: 'artist-catalogued',
      yearCreated: year,
      medium: (input.medium as Artwork['medium']) ?? 'acrylic-on-canvas',
      measurementType: ['physical'],
      support: 'canvas',
    },
    overrideAccess: false,
    user,
  })
}

export function processPhotoCount(artwork: Pick<Artwork, 'processPhotos'>): number {
  return artwork.processPhotos?.totalDocs ?? artwork.processPhotos?.docs?.length ?? 0
}
