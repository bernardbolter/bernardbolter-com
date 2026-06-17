import Layer0Image from '@/components/artwork/Layer0Image'
import Layer0Video from '@/components/artwork/Layer0Video'
import Layer1ObjectRecord from '@/components/artwork/Layer1ObjectRecord'
import Layer2StatusAndProvenance from '@/components/artwork/Layer2StatusAndProvenance'
import Layer3ArtistAccount from '@/components/artwork/Layer3ArtistAccount'
import Layer4History from '@/components/artwork/Layer4History'
import SeriesCard from '@/components/artwork/SeriesCard'
import {
  artworkHasClipEmbedding,
  getSimilarArtworksForPage,
} from '@/lib/payload/similarArtworksPage'
import { collectArtworkGalleryImages, artworkHasVideo } from '@/lib/artwork/artworkGalleryImages'
import { artworkHasArtistAccountProse } from '@/lib/artwork/layer3Prose'
import type { Artist, Artwork } from '@/payload-types'

import './artwork-page.css'

export type ArtworkPageProps = {
  artwork: Artwork
  artist: Artist | null
}

function isVideoPrimaryArtwork(artwork: Artwork): boolean {
  const hasGalleryImages = collectArtworkGalleryImages(artwork).length > 0
  return artworkHasVideo(artwork) && !hasGalleryImages
}

export default async function ArtworkPage({ artwork, artist }: ArtworkPageProps) {
  const [similarWorks, hasClipEmbedding] = await Promise.all([
    getSimilarArtworksForPage(artwork.id, 4),
    artworkHasClipEmbedding(artwork.id),
  ])

  const showVideo = isVideoPrimaryArtwork(artwork)
  const hasProseColumn = artworkHasArtistAccountProse(artwork)

  return (
    <article
      className={`artwork-page artwork-image__main-scroll-wrapper${hasProseColumn ? '' : ' artwork-page--single-column'}`}
    >
      {showVideo ? <Layer0Video artwork={artwork} /> : <Layer0Image artwork={artwork} />}

      <div className="artwork-image__info-container artwork-image__info-container--layers">
        <SeriesCard artwork={artwork} />

        <div className="artwork-image__info--details-container artwork-page__columns">
          <div className="artwork-page__column artwork-page__column--record">
            <Layer1ObjectRecord artwork={artwork} />
            <Layer2StatusAndProvenance artwork={artwork} artist={artist} />
            <Layer4History artwork={artwork} />
          </div>

          <div className="artwork-page__column artwork-page__column--prose">
            <Layer3ArtistAccount
              artwork={artwork}
              similarWorks={similarWorks}
              hasClipEmbedding={hasClipEmbedding}
            />
          </div>
        </div>
      </div>
    </article>
  )
}
