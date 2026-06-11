import type { Artist, Media } from '@/payload-types'

export type BioPageImage = {
  id: string
  url: string
  alt: string
  width: number
  height: number
}

function readMedia(entry: number | Media | null | undefined): Media | null {
  if (!entry || typeof entry !== 'object') return null
  return entry
}

export function normalizeBioPhotos(bioPhotos: Artist['bioPhotos']): BioPageImage[] {
  if (!bioPhotos?.length) return []

  return bioPhotos
    .map((entry, index) => {
      const media = readMedia(entry.image)
      if (!media?.url) return null

      return {
        id: String(media.id ?? index),
        url: media.url,
        alt: entry.caption?.trim() || media.alt || `Bio image ${index + 1}`,
        width: media.width && media.width > 0 ? media.width : 1200,
        height: media.height && media.height > 0 ? media.height : 800,
      }
    })
    .filter((entry): entry is BioPageImage => entry !== null)
}
