import Layer0Image from '@/components/artwork/Layer0Image'
import Layer1ObjectRecord from '@/components/artwork/Layer1ObjectRecord'
import Layer2WorldPresence from '@/components/artwork/Layer2WorldPresence'
import Layer3ArtistAccount from '@/components/artwork/Layer3ArtistAccount'
import Layer4History from '@/components/artwork/Layer4History'
import SeriesCard from '@/components/artwork/SeriesCard'
import {
  artworkHasClipEmbedding,
  getSimilarArtworksForPage,
} from '@/lib/payload/similarArtworksPage'
import type { Artist, Artwork } from '@/payload-types'

import './artwork-page.css'

export type ArtworkPageProps = {
  artwork: Artwork
  artist: Artist | null
}

export default async function ArtworkPage({ artwork, artist }: ArtworkPageProps) {
  const [similarWorks, hasClipEmbedding] = await Promise.all([
    getSimilarArtworksForPage(artwork.id, 4),
    artworkHasClipEmbedding(artwork.id),
  ])

  return (
    <article className="artwork-page">
      <Layer0Image artwork={artwork} />
      <SeriesCard artwork={artwork} />
      <Layer1ObjectRecord artwork={artwork} />
      <Layer2WorldPresence artwork={artwork} artist={artist} />
      <Layer3ArtistAccount
        artwork={artwork}
        similarWorks={similarWorks}
        hasClipEmbedding={hasClipEmbedding}
      />
      <Layer4History artwork={artwork} />
    </article>
  )
}
