import Image from 'next/image'
import Link from 'next/link'

import EditionTierRegistry from '@/components/artwork/EditionTierRegistry'
import { getSeriesColor } from '@/helpers/seriesColor'
import { getDocumentationVideoSource } from '@/lib/artwork/artworkGalleryImages'
import {
  buildOwnershipClaimHref,
  buildOwnershipDisplay,
  deriveProvenanceConfidenceSummary,
  getPublicLoanHistory,
  hasUnclaimedOwnershipAppeal,
  provenanceConfidenceStatement,
} from '@/lib/artwork/artworkProvenancePublic'
import { collectArtworkSameAsUris } from '@/lib/artwork/sameAsUris'
import { labelForSameAsUri } from '@/lib/artwork/sameAsDomainLabel'
import { getSeriesSiteUrl } from '@/lib/artwork/seriesSiteUrl'
import { resolveArtworkTopLevelSeries } from '@/lib/artwork/resolveTopLevelSeries'
import type { Artist, Artwork, Media } from '@/payload-types'

type Props = {
  artwork: Artwork
  artist: Artist | null
}

function mediaUrl(media: number | Media | null | undefined): string | null {
  if (!media || typeof media !== 'object' || !media.url) return null
  return media.url
}

function collectExternalLinks(artwork: Artwork, artist: Artist | null): string[] {
  const links = new Set<string>()
  collectArtworkSameAsUris(artwork).forEach((uri) => links.add(uri))
  ;(artist?.otherLinks ?? []).forEach((entry) => {
    if (entry?.url) links.add(entry.url)
  })
  return [...links]
}

function formatDateRange(start?: string, end?: string): string {
  if (start && end) return `${start} – ${end}`
  return start || end || ''
}

function isInArtistsStudio(artwork: Artwork): boolean {
  return artwork.currentLocation?.category === 'artists-studio'
}

export default function Layer2StatusAndProvenance({ artwork, artist }: Props) {
  const documentationVideo = getDocumentationVideoSource(artwork)
  const installationShots = artwork.installationShots ?? []
  const topSeries = resolveArtworkTopLevelSeries(artwork.series)
  const seriesSite = topSeries ? getSeriesSiteUrl(topSeries.slug) : null
  const externalLinks = collectExternalLinks(artwork, artist)
  const ownership = buildOwnershipDisplay(artwork, artist)
  const provenanceSummary = deriveProvenanceConfidenceSummary(artwork)
  const loans = getPublicLoanHistory(artwork)
  const showUnclaimedAppeal = hasUnclaimedOwnershipAppeal(artwork) && !isInArtistsStudio(artwork)
  const showDocsBlock = Boolean(documentationVideo || artwork.arEnabled || installationShots.length)
  const showStatusBlock = ownership.showSection
  const seriesColor = topSeries?.slug ? getSeriesColor(topSeries.slug) : undefined

  return (
    <section className="artwork-page__layer artwork-page__layer--status">
      <div className="artwork-page__inner">
        {showDocsBlock ? (
          <>
            <p className="artwork-page__section-title">Documentation &amp; media</p>
            <div className="flex flex-col gap-2 text-sm">
              {documentationVideo ? (
                <a
                  href={documentationVideo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="series-card__cta inline-block w-fit"
                >
                  ▶ Documentation video
                </a>
              ) : null}
              {artwork.arEnabled && seriesSite ? (
                <a
                  href={seriesSite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="series-card__cta inline-block w-fit"
                >
                  ◈ AR experience — available on the series page
                </a>
              ) : null}
              {installationShots.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {installationShots.map((shot) => {
                    const url = mediaUrl(shot.image)
                    if (!url) return null
                    return (
                      <Image
                        key={shot.id ?? url}
                        src={url}
                        alt={shot.altText ?? 'Installation view'}
                        width={120}
                        height={90}
                        className="h-[4.5rem] w-[6rem] object-contain"
                      />
                    )
                  })}
                </div>
              ) : null}
            </div>
          </>
        ) : null}

        {showStatusBlock ? (
          <div
            className="artwork-page__status-block"
            style={
              seriesColor
                ? ({ ['--status-accent-color' as string]: seriesColor } as React.CSSProperties)
                : undefined
            }
          >
            <p className="artwork-page__section-title">Status &amp; ownership</p>
            {ownership.currentHolderLine ? (
              <p className="artwork-page__status-lead">{ownership.currentHolderLine}</p>
            ) : null}

            {artwork.availabilityStatus === 'on-consignment' ? (
              <p className="artwork-page__prose artwork-page__prose--secondary">
                Available via {artwork.galleryReference?.trim() || 'gallery'}.{' '}
                <Link href="/contact" className="text-dark underline">
                  Get in touch
                </Link>
              </p>
            ) : null}

            {provenanceSummary ? (
              <p className="artwork-page__ownership-honesty">
                {provenanceConfidenceStatement(provenanceSummary)}. Ownership history is held
                privately. This statement reflects the level of documentation on record.
              </p>
            ) : null}

            {ownership.showOriginHonesty ? (
              <p className="artwork-page__ownership-honesty">
                The early history of this work&apos;s ownership is not fully documented.
              </p>
            ) : null}

            {ownership.showTimeline ? (
              <ul className="artwork-page__ownership-timeline">
                {ownership.timelineRows.map((row, index) => (
                  <li key={`${row.text}-${index}`} className="artwork-page__ownership-timeline-row">
                    {row.text}
                  </li>
                ))}
              </ul>
            ) : null}

            {showUnclaimedAppeal ? (
              <p className="artwork-page__ownership-appeal">
                If you own this work,{' '}
                <Link href={buildOwnershipClaimHref(artwork)} className="text-dark underline">
                  get in touch
                </Link>
                . I&apos;ll add you to the record and officially connect you to its history.
              </p>
            ) : null}
          </div>
        ) : null}

        <EditionTierRegistry artwork={artwork} />

        {loans.length > 0 ? (
          <>
            <hr className="artwork-page__divider" />
            <p className="artwork-page__section-title">Loan history</p>
            <ul className="space-y-2 text-sm">
              {loans.map((loan, index) => (
                <li key={`${loan.institution}-${index}`}>
                  <span className="font-medium">{loan.institution}</span>
                  {loan.dateOut || loan.dateReturned ? (
                    <span className="text-secondary">
                      {' '}
                      · {formatDateRange(loan.dateOut, loan.dateReturned)}
                    </span>
                  ) : null}
                  {loan.eventId ? (
                    <span className="text-secondary"> · linked to event #{loan.eventId}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {externalLinks.length > 0 ? (
          <>
            <hr className="artwork-page__divider" />
            <p className="artwork-page__section-title">External links</p>
            <div className="flex flex-wrap gap-2">
              {externalLinks.map((uri) => (
                <a
                  key={uri}
                  href={uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="series-card__cta text-xs"
                >
                  {labelForSameAsUri(uri)}
                </a>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  )
}
