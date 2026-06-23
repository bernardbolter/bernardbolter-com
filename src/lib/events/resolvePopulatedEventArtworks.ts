import type { Artwork, Event } from '@/payload-types'
import type { CatalogueArtwork } from '@/types/frontend'

export function resolvePopulatedEventArtworks(
  artworks: Event['artworks'],
): CatalogueArtwork[] {
  if (!Array.isArray(artworks)) return []
  return artworks.filter(
    (artwork): artwork is Artwork =>
      Boolean(artwork && typeof artwork === 'object' && typeof artwork.id === 'number'),
  )
}
