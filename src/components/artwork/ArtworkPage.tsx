import Layer0Image from '@/components/artwork/Layer0Image'
import Layer0Video from '@/components/artwork/Layer0Video'
import Layer1ObjectRecord from '@/components/artwork/Layer1ObjectRecord'
import Layer2StatusAndProvenance from '@/components/artwork/Layer2StatusAndProvenance'
import Layer3ArtistAccount from '@/components/artwork/Layer3ArtistAccount'
import Layer4History from '@/components/artwork/Layer4History'
import SeriesCard from '@/components/artwork/SeriesCard'
import { getEditionTierLabelMaps } from '@/lib/artwork/getEditionTierLabelMaps'
import {
  artworkHasClipEmbedding,
  getSimilarArtworksForPage,
} from '@/lib/payload/similarArtworksPage'
import {
  isVideoPrimaryArtwork,
} from '@/lib/artwork/artworkGalleryImages'
import { artworkShowsProseColumn } from '@/lib/artwork/layer3Prose'
import type { Artist, Artwork } from '@/payload-types'
import config from '@payload-config'
import { getPayload } from 'payload'

import './artwork-page.css'
import './vision-page.css'

export type ArtworkPageProps = {
  artwork: Artwork
  artist: Artist | null
}

export default async function ArtworkPage({ artwork, artist }: ArtworkPageProps) {
  const payload = await getPayload({ config })
  const [similarWorksResult, hasClipEmbedding, editionTierLabelMaps] = await Promise.all([
    typeof artwork.id === 'number'
      ? getSimilarArtworksForPage(artwork.id, 3)
      : Promise.resolve([]),
    typeof artwork.id === 'number'
      ? artworkHasClipEmbedding(artwork.id)
      : Promise.resolve(false),
    getEditionTierLabelMaps(payload),
  ])
  const similarWorks = similarWorksResult ?? []

  const showVideo = isVideoPrimaryArtwork(artwork)
  const hasProseColumn = artworkShowsProseColumn({
    artwork,
    hasClipEmbedding,
    similarWorksCount: similarWorks.length,
  })

  return (
    <article
      className={`artwork-page artwork-image__main-scroll-wrapper${hasProseColumn ? '' : ' artwork-page--single-column'}`}
    >
      {showVideo ? <Layer0Video artwork={artwork} /> : <Layer0Image artwork={artwork} />}

      <div className="artwork-image__info-container artwork-image__info-container--layers">
        <SeriesCard artwork={artwork} />

        <div className="artwork-image__info--details-container artwork-page__columns artwork-page__columns--data">
          <div className="artwork-page__column artwork-page__column--record">
            <Layer1ObjectRecord artwork={artwork} />
            <Layer2StatusAndProvenance
              artwork={artwork}
              artist={artist}
              editionTierLabelMaps={editionTierLabelMaps}
            />
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
