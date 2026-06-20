import type { Artist, Event, Media } from '@/payload-types'

export type BioPageRelatedEvent = {
  slug: string
  hasPage: true
}

export type BioPageImage = {
  id: string
  url: string
  alt: string
  caption: string | null
  width: number
  height: number
  relatedEvent: BioPageRelatedEvent | null
}

function readMedia(entry: number | Media | null | undefined): Media | null {
  if (!entry || typeof entry !== 'object') return null
  return entry
}

function readRelatedEvent(entry: number | Event | null | undefined): BioPageRelatedEvent | null {
  if (!entry || typeof entry !== 'object') return null
  if (entry.hasPage !== true) return null
  const slug = entry.slug?.trim()
  if (!slug) return null
  return { slug, hasPage: true }
}

export function normalizeBioPhotos(bioPhotos: Artist['bioPhotos']): BioPageImage[] {
  if (!bioPhotos?.length) return []

  return bioPhotos
    .map((entry, index) => {
      const media = readMedia(entry.image)
      if (!media?.url) return null

      return {
        id: String(entry.id ?? media.id ?? index),
        url: media.url,
        alt: media.alt?.trim() || entry.caption?.trim() || `Bio image ${index + 1}`,
        caption: entry.caption?.trim() || null,
        width: media.width && media.width > 0 ? media.width : 1200,
        height: media.height && media.height > 0 ? media.height : 800,
        relatedEvent: readRelatedEvent(entry.relatedEvent),
      }
    })
    .filter((entry): entry is BioPageImage => entry !== null)
}
