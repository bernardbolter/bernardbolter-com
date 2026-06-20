import type { Artwork, Artist, Media } from '@/payload-types'

export type StatementRelatedWork = {
  id: string
  note: string | null
  artwork: {
    id: number
    slug: string
    title: string
    yearCreated: number
    posterImage: {
      url: string
      width: number
      height: number
    } | null
    posterImageAltText: string | null
  }
}

function readMedia(entry: number | Media | null | undefined): Media | null {
  if (!entry || typeof entry !== 'object') return null
  return entry
}

function readArtwork(entry: number | Artwork | null | undefined): Artwork | null {
  if (!entry || typeof entry !== 'object') return null
  return entry
}

export function normalizeStatementRelatedWorks(
  relatedWorks: Artist['statementRelatedWorks'],
): StatementRelatedWork[] {
  if (!relatedWorks?.length) return []

  return relatedWorks
    .map((entry, index) => {
      const artwork = readArtwork(entry.artwork)
      if (!artwork?.slug || !artwork.title) return null

      const poster = readMedia(artwork.posterImage) ?? readMedia(artwork.primaryImage)

      return {
        id: String(entry.id ?? artwork.id ?? index),
        note: entry.note?.trim() || null,
        artwork: {
          id: artwork.id,
          slug: artwork.slug,
          title: artwork.title,
          yearCreated: artwork.yearCreated,
          posterImage:
            poster?.url ?
              {
                url: poster.url,
                width: poster.width && poster.width > 0 ? poster.width : 400,
                height: poster.height && poster.height > 0 ? poster.height : 300,
              }
            : null,
          posterImageAltText: artwork.posterImageAltText?.trim() || null,
        },
      }
    })
    .filter((entry): entry is StatementRelatedWork => entry !== null)
}
