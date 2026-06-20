import type { Artist, Media } from '@/payload-types'

export type StatementImageType = 'photograph' | 'rendering'

export type StatementPhoto = {
  id: string
  url: string
  alt: string
  width: number
  height: number
  caption: string | null
  imageType: StatementImageType
}

type StatementPhotoRow =
  | Artist['statementSceneImagesFirst']
  | Artist['statementSceneImagesSecond']

function readMedia(entry: number | Media | null | undefined): Media | null {
  if (!entry || typeof entry !== 'object') return null
  return entry
}

function readImageType(value: unknown): StatementImageType {
  return value === 'rendering' ? 'rendering' : 'photograph'
}

export function normalizeStatementPhotoRow(
  photos: StatementPhotoRow | null | undefined,
): StatementPhoto[] {
  if (!photos?.length) return []

  return photos
    .map((entry, index) => {
      const media = readMedia(entry.image)
      if (!media?.url) return null

      return {
        id: String(entry.id ?? media.id ?? index),
        url: media.url,
        alt: media.alt?.trim() || entry.caption?.trim() || `Statement image ${index + 1}`,
        width: media.width && media.width > 0 ? media.width : 1600,
        height: media.height && media.height > 0 ? media.height : 900,
        caption: entry.caption?.trim() || null,
        imageType: readImageType(entry.imageType),
      }
    })
    .filter((entry): entry is StatementPhoto => entry !== null)
}

export function normalizeStatementSceneImagesFirst(
  artist: Artist | null | undefined,
): StatementPhoto[] {
  return normalizeStatementPhotoRow(artist?.statementSceneImagesFirst)
}

export function normalizeStatementSceneImagesSecond(
  artist: Artist | null | undefined,
): StatementPhoto[] {
  return normalizeStatementPhotoRow(artist?.statementSceneImagesSecond)
}
