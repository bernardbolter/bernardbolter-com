import Link from 'next/link'

import ArtworkReciprocalLinksCard from '@/components/artwork/ArtworkReciprocalLinksCard'
import ArtworkRecordMeta from '@/components/artwork/ArtworkRecordMeta'
import ArtworkSessionsSection from '@/components/artwork/ArtworkSessionsSection'
import ArtworkVisionAnalysisCard from '@/components/artwork/ArtworkVisionAnalysisCard'
import Layer0Image from '@/components/artwork/Layer0Image'
import Layer0Video from '@/components/artwork/Layer0Video'
import Layer1ObjectRecord from '@/components/artwork/Layer1ObjectRecord'
import Layer2StatusAndProvenance from '@/components/artwork/Layer2StatusAndProvenance'
import Layer3ArtistAccount from '@/components/artwork/Layer3ArtistAccount'
import Layer4History from '@/components/artwork/Layer4History'
import SeriesCard from '@/components/artwork/SeriesCard'
import CorpusBackLink from '@/components/corpus/CorpusBackLink'
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
import { visionAnalysesNewestFirst } from '@/lib/artwork/visionPage'
import { resolveSeriesSlug } from '@/helpers/artworkCatalog'
import { getSeriesColor } from '@/helpers/seriesColor'
import { messagesForPublicTranscript } from '@/lib/corpus/sessionTranscript'
import { getArtworkPageSessions } from '@/lib/payload/artworkPageSessions'
import type { Artist, Artwork } from '@/payload-types'

import './artwork-page.css'
import './vision-page.css'

export type ArtworkPageProps = {
  artwork: Artwork
  artist: Artist | null
}

export default async function ArtworkPage({ artwork, artist }: ArtworkPageProps) {
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
  // Relative paths only — never pass a host (avoids localhost leaking into HTML).
  const relatedThroughlines = findRelatedThroughlines(artist, artwork, '')
  const relatedBioEvents = findRelatedBioEvents(artist, artwork, '')
  const hasReciprocalLinks =
    relatedThroughlines.length > 0 || relatedBioEvents.length > 0

  const showVideo = isVideoPrimaryArtwork(artwork)
  const hasTranscript =
    sessionGroups.primary.some(
      (session) => messagesForPublicTranscript(session.messages).length > 0,
    ) || sessionGroups.mentioned.length > 0
  const hasVision = visionAnalysesNewestFirst(artwork).length > 0
  // Reciprocal links live in the record column now — they do not open the prose column.
  const hasProseColumn =
    artworkShowsProseColumn({
      artwork,
      hasClipEmbedding,
      similarWorksCount: similarWorks.length,
      hasReciprocalLinks: false,
    }) || hasTranscript

  const seriesColor = getSeriesColor(resolveSeriesSlug(artwork) ?? 'default')

  const recordColumn = (
    <>
      <Layer1ObjectRecord artwork={artwork} />
      <Layer2StatusAndProvenance
        artwork={artwork}
        artist={artist}
        editionTierLabelMaps={editionTierLabelMaps}
      />
      <Layer4History artwork={artwork} />
      {hasReciprocalLinks ? (
        <div className="artwork-page__connections-in-record">
          <ArtworkReciprocalLinksCard
            seriesColor={seriesColor}
            throughlines={relatedThroughlines}
            bioEvents={relatedBioEvents}
          />
        </div>
      ) : null}
      {hasVision ? (
        <div className="artwork-page__vision-in-column" aria-label="Vision analysis">
          <header className="artwork-page__dialogue-head artwork-page__dialogue-head--in-record">
            <h2 className="artwork-page__dialogue-heading">Vision analysis</h2>
            <p className="artwork-page__dialogue-frame">
              A description of the work written by an AI looking at the image, kept separate
              from the artist&apos;s account so the two can be compared.
            </p>
          </header>
          <ArtworkVisionAnalysisCard
            artwork={artwork}
            seriesColor={seriesColor}
            showHeadingAndFrame={false}
          />
        </div>
      ) : null}
      <div className="artwork-page__record-footer">
        <ArtworkRecordMeta artwork={artwork} />
        <CorpusMachineLinks
          slug={artwork.slug}
          hasSessions={hasSessions}
          className="corpus-page__links artwork-page__corpus-machine-links"
        />
      </div>
    </>
  )

  const proseColumn = (
    <>
      <Layer3ArtistAccount
        artwork={artwork}
        similarWorks={similarWorks}
        hasClipEmbedding={hasClipEmbedding}
        relatedThroughlines={[]}
        relatedBioEvents={[]}
        includeVisionAnalysis={false}
      />
      {hasTranscript ? (
        <section
          id="sessions"
          className="artwork-page__sessions-in-column"
          aria-label="Art/Official sessions"
        >
          <header className="artwork-page__dialogue-head">
            <h2 className="artwork-page__dialogue-heading">Art/Official sessions</h2>
            <p className="artwork-page__dialogue-frame">
              Every work in this archive is catalogued through a{' '}
              <Link href="/art-official/protocol" className="bio__inline-link">
                recorded conversation
              </Link>{' '}
              between the artist and an AI. The record above was written during this session —
              the transcript is where it came from, kept whole so any claim on this page can be
              checked against what was actually said.
            </p>
          </header>
          <ArtworkSessionsSection
            artworkSlug={artwork.slug}
            artworkTitle={artwork.title?.trim() || 'Artwork'}
            primarySessions={sessionGroups.primary}
            mentionedSessions={sessionGroups.mentioned}
            wrapSection={false}
            framedByPage
          />
        </section>
      ) : null}
    </>
  )

  return (
    <article
      className={`artwork-page artwork-image__main-scroll-wrapper${hasProseColumn ? '' : ' artwork-page--single-column'}`}
    >
      <div className="corpus-ladder-wrap">
        <CorpusBackLink />
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
      </div>
    </article>
  )
}
