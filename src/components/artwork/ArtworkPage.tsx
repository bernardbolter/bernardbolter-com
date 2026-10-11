import Link from 'next/link'

import ArtworkSessionsSection from '@/components/artwork/ArtworkSessionsSection'
import ArtworkVisionAnalysisCard from '@/components/artwork/ArtworkVisionAnalysisCard'
import Layer0Image from '@/components/artwork/Layer0Image'
import Layer0Video from '@/components/artwork/Layer0Video'
import Layer1ObjectRecord from '@/components/artwork/Layer1ObjectRecord'
import Layer2StatusAndProvenance from '@/components/artwork/Layer2StatusAndProvenance'
import Layer3ArtistAccount from '@/components/artwork/Layer3ArtistAccount'
import Layer4History from '@/components/artwork/Layer4History'
import SeriesCard from '@/components/artwork/SeriesCard'
import CorpusLadder from '@/components/corpus/CorpusLadder'
import CorpusMachineLinks from '@/components/corpus/CorpusMachineLinks'
import {
  findRelatedBioEvents,
  findRelatedThroughlines,
} from '@/lib/artist/reciprocalLinks'
import { getCachedEditionTierLabelMaps } from '@/lib/artwork/getEditionTierLabelMaps'
import {
  artworkHasClipEmbedding,
  getSimilarArtworksForPage,
} from '@/lib/payload/similarArtworksPage'
import { isVideoPrimaryArtwork } from '@/lib/artwork/artworkGalleryImages'
import {
  buildLayer0ImageHeroProps,
  buildLayer0VideoHeroProps,
} from '@/lib/artwork/layer0HeroProps'
import { artworkShowsProseColumn } from '@/lib/artwork/layer3Prose'
import { preferredVisionAnalysis } from '@/lib/artwork/visionPage'
import { getSeriesColor } from '@/helpers/seriesColor'
import { resolveSeriesSlug } from '@/helpers/artworkCatalog'
import { getArtworkPageSessions } from '@/lib/payload/artworkPageSessions'
import type { Artist, Artwork } from '@/payload-types'

import './artwork-page.css'
import './vision-page.css'

export type ArtworkPageProps = {
  artwork: Artwork
  artist: Artist | null
  /** Plain-text /record surface: same fields, no hero/series chrome. */
  variant?: 'default' | 'plain'
}

export default async function ArtworkPage({
  artwork,
  artist,
  variant = 'default',
}: ArtworkPageProps) {
  const artworkId = typeof artwork.id === 'number' ? artwork.id : null
  const artworkSlug = artwork.slug?.trim() || ''
  const [similarWorksResult, hasClipEmbedding, editionTierLabelMaps, sessionGroups] =
    await Promise.all([
      artworkId != null ? getSimilarArtworksForPage(artworkId, 3) : Promise.resolve([]),
      artworkId != null ? artworkHasClipEmbedding(artworkId) : Promise.resolve(false),
      getCachedEditionTierLabelMaps(),
      artworkId != null && artworkSlug
        ? getArtworkPageSessions(artworkId, artworkSlug)
        : Promise.resolve({ primary: [], mentioned: [] }),
    ])
  const similarWorks = similarWorksResult ?? []
  const hasSessions = sessionGroups.primary.length + sessionGroups.mentioned.length > 0
  const relatedThroughlines = findRelatedThroughlines(artist, artwork, '')
  const relatedBioEvents = findRelatedBioEvents(artist, artwork, '')

  const showVideo = isVideoPrimaryArtwork(artwork)
  const hasProseColumn = artworkShowsProseColumn({
    artwork,
    hasClipEmbedding,
    similarWorksCount: similarWorks.length,
    hasReciprocalLinks: relatedThroughlines.length > 0 || relatedBioEvents.length > 0,
  })
  const seriesSlug = resolveSeriesSlug(artwork) ?? 'default'
  const seriesColor = getSeriesColor(seriesSlug)
  const latestAnalysis = preferredVisionAnalysis(artwork)
  const ladderCurrent = variant === 'plain' ? 'record' : 'artwork'
  const isPlain = variant === 'plain'

  const recordColumn = (
    <>
      <Layer1ObjectRecord artwork={artwork} />
      <Layer2StatusAndProvenance
        artwork={artwork}
        artist={artist}
        editionTierLabelMaps={editionTierLabelMaps}
      />
      <Layer4History artwork={artwork} />
      <CorpusMachineLinks
        slug={artwork.slug}
        hasSessions={hasSessions}
        className="corpus-page__links artwork-page__corpus-machine-links"
      />
    </>
  )

  const proseColumn = (
    <Layer3ArtistAccount
      artwork={artwork}
      similarWorks={similarWorks}
      hasClipEmbedding={hasClipEmbedding}
      relatedThroughlines={relatedThroughlines}
      relatedBioEvents={relatedBioEvents}
      includeVisionAnalysis={false}
    />
  )

  const sessionsBlock = (
    <ArtworkSessionsSection
      artworkSlug={artwork.slug}
      artworkTitle={artwork.title?.trim() || 'Artwork'}
      primarySessions={sessionGroups.primary}
      mentionedSessions={sessionGroups.mentioned}
    />
  )

  const visionBlock =
    latestAnalysis != null ? (
      <section className="artwork-page__layer artwork-page__vision-tail" aria-label="Vision analysis">
        <div className="artwork-page__inner">
          <ArtworkVisionAnalysisCard artwork={artwork} seriesColor={seriesColor} />
        </div>
      </section>
    ) : null

  if (isPlain) {
    return (
      <article className="artwork-plain-record">
        <CorpusLadder slug={artwork.slug} current={ladderCurrent} />
        <h1>{artwork.title}</h1>
        <p>
          Plain-text copy of the artwork record. Canonical page:{' '}
          <Link href={`/${artwork.slug}`}>{`/${artwork.slug}`}</Link>.
        </p>
        {recordColumn}
        {proseColumn}
        {sessionsBlock}
        {visionBlock}
      </article>
    )
  }

  return (
    <article
      className={`artwork-page artwork-image__main-scroll-wrapper${hasProseColumn ? '' : ' artwork-page--single-column'}`}
    >
      <div className="corpus-ladder-wrap">
        <CorpusLadder slug={artwork.slug} current="artwork" />
      </div>

      {showVideo ? (
        <Layer0Video {...buildLayer0VideoHeroProps(artwork)} />
      ) : (
        <Layer0Image {...buildLayer0ImageHeroProps(artwork)} />
      )}

      <div className="artwork-image__info-container artwork-image__info-container--layers">
        <SeriesCard artwork={artwork} />

        <div className="artwork-image__info--details-container artwork-page__columns artwork-page__columns--data">
          <div className="artwork-page__column artwork-page__column--record">{recordColumn}</div>
          <div className="artwork-page__column artwork-page__column--prose">{proseColumn}</div>
        </div>

        {sessionsBlock}
        {visionBlock}
      </div>
    </article>
  )
}
