import ArtworkContent from '@/components/artworks/ArtworkContent'
import type { Artist, Artwork } from '@/payload-types'

export type ArtworkPageProps = {
  artwork: Artwork
  artist: Artist | null
}

/**
 * Top-level artwork page layout. Layer components (L0–L4) replace ArtworkContent in a later stage.
 */
export default function ArtworkPage({ artwork, artist: _artist }: ArtworkPageProps) {
  return <ArtworkContent artwork={artwork} />
}
