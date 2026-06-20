import Link from 'next/link'

import EditionTierRegistry from '@/components/artwork/EditionTierRegistry'
import { reasoningStatusCopy } from '@/components/artwork/ReasoningStatusBadge'
import { getSeriesColor } from '@/helpers/seriesColor'
import { getArtworkExhibitionEvents } from '@/lib/artwork/artworkExhibitionEvents'
import {
  buildOwnershipClaimHref,
  buildOwnershipDisplay,
  getPublicLoanHistory,
  getPublicProvenanceClaims,
  hasUnclaimedOwnershipAppeal,
} from '@/lib/artwork/artworkProvenancePublic'
import {
  formatRelatedWorkLine,
  getPublicRelatedWorks,
} from '@/lib/artwork/relatedWorksPublic'
import {
  buildOriginalCopyClaimHref,
  buildOriginalTierDisplayCopies,
  buildPublicEditionTiers,
  getOriginalTier,
  isOriginalCopyPubliclyClaimed,
  originalCopyOwnerLabel,
} from '@/lib/artwork/ownershipRegistryPublic'
import { collectArtworkSameAsUris } from '@/lib/artwork/sameAsUris'
import { labelForSameAsUri } from '@/lib/artwork/sameAsDomainLabel'
import { resolveArtworkTopLevelSeries } from '@/lib/artwork/resolveTopLevelSeries'
import { formatMonthYear } from '@/utilities/formatMonthYear'
import type { Artist, Artwork } from '@/payload-types'

type Props = {
  artwork: Artwork
  artist: Artist | null
}

function formatDateRange(start?: string, end?: string): string {
  if (start && end) return `${start} – ${end}`
  return start || end || ''
}

function isInArtistsStudio(artwork: Artwork): boolean {
  return artwork.currentLocation?.category === 'artists-studio'
}

function ProvenanceClaimsList({ artwork }: { artwork: Artwork }) {
  const { prominent, demoted, hasDocumentedFact, hasCredibleInference } =
    getPublicProvenanceClaims(artwork)

  if (prominent.length === 0 && demoted.length === 0) return null

  return (
    <>
      {prominent.length > 0 ? (
        <>
          <p className="artwork-page__status-section-label artwork-page__provenance-record-label">
            Provenance record
          </p>
          {prominent.map((claim) => (
            <div key={claim.claim} className="artwork-page__provenance-claim">
              {claim.confidenceLevel === 'documented-fact' ? (
                <span className="artwork-page__provenance-marker artwork-page__provenance-marker--fact" />
              ) : (
                <span className="artwork-page__provenance-marker artwork-page__provenance-marker--inference" />
              )}
              <p
                className={`artwork-page__provenance-claim-text${
                  claim.confidenceLevel === 'credible-inference'
                    ? ' artwork-page__provenance-claim-text--inference'
                    : ''
                }`}
              >
                {claim.claim}
                {claim.confidenceLevel === 'credible-inference' ? (
                  <span className="artwork-page__provenance-inferred"> — inferred</span>
                ) : null}
              </p>
            </div>
          ))}
          {hasDocumentedFact || hasCredibleInference ? (
            <p className="artwork-page__provenance-legend">
              {hasDocumentedFact ? '● Documented fact' : null}
              {hasDocumentedFact && hasCredibleInference ? '   ' : null}
              {hasCredibleInference ? '○ Credible inference' : null}
            </p>
          ) : null}
        </>
      ) : null}

      {demoted.length > 0 ? (
        <div className="artwork-page__provenance-demoted">
          <p className="artwork-page__provenance-demoted-label">Additional records</p>
          {demoted.map((claim) => (
            <p key={claim.claim} className="artwork-page__provenance-demoted-row">
              {claim.claim}
            </p>
          ))}
        </div>
      ) : null}
    </>
  )
}

function RelatedWorksList({ artwork }: { artwork: Artwork }) {
  const relatedWorks = getPublicRelatedWorks(artwork)
  if (relatedWorks.length === 0) return null

  return (
    <div className="artwork-page__related-works">
      {relatedWorks.map((item, index) => {
        const line = formatRelatedWorkLine(item)
        if (item.href && item.linkLabel) {
          const prefix = `A related ${item.relationshipLabel} exists — `
          return (
            <p
              key={`${item.href}-${index}`}
              className="artwork-page__prose artwork-page__prose--secondary artwork-page__related-work-line"
            >
              {prefix}
              <Link href={item.href} className="text-dark underline">
                {item.linkLabel}
              </Link>
              .
            </p>
          )
        }

        return (
          <p
            key={`${line}-${index}`}
            className="artwork-page__prose artwork-page__prose--secondary artwork-page__related-work-line"
          >
            {line}
          </p>
        )
      })}
    </div>
  )
}

function OriginalTierBlock({ artwork }: { artwork: Artwork }) {
  const originalTier = getOriginalTier(artwork)
  if (!originalTier) return null

  const editionSize = originalTier.editionSize ?? 0
  const apCount = originalTier.apCount ?? 0
  const copies = buildOriginalTierDisplayCopies(originalTier)

  return (
    <>
      <p className="artwork-page__original-tier-headline">
        Original edition — {editionSize + apCount} copies
      </p>
      <p className="artwork-page__original-tier-intro">
        An edition of {editionSize} plus {apCount} artist&apos;s proof{apCount > 1 ? 's' : ''}.
        Each numbered copy is a complete original.
      </p>

      {copies.map((copy) => {
        const copyNumber = copy.copyNumber?.trim() || '—'
        const claimed = isOriginalCopyPubliclyClaimed(copy)

        return (
          <div key={copyNumber} className="artwork-page__original-copy-row">
            {claimed ? (
              <p className="artwork-page__original-copy-headline">
                {copyNumber} — {originalCopyOwnerLabel(copy)}
              </p>
            ) : (
              <>
                <p className="artwork-page__original-copy-headline artwork-page__original-copy-headline--unclaimed">
                  {copyNumber} — Unclaimed
                </p>
                <p className="artwork-page__original-copy-appeal">
                  Do you own this copy?{' '}
                  <Link
                    href={buildOriginalCopyClaimHref(artwork, copyNumber)}
                    className="text-dark underline"
                  >
                    Claim it →
                  </Link>
                </p>
              </>
            )}
          </div>
        )
      })}
    </>
  )
}

function RecordMetaFooter({ artwork }: { artwork: Artwork }) {
  const reasoningLabel = artwork.reasoningStatus
    ? reasoningStatusCopy[artwork.reasoningStatus]
    : null
  const lastUpdated = formatMonthYear(artwork.updatedAt)

  if (!artwork.catalogueNumber && !reasoningLabel && !lastUpdated) return null

  return (
    <div className="artwork-page__record-meta">
      {artwork.catalogueNumber ? (
        <p className="artwork-page__record-meta-line">{artwork.catalogueNumber}</p>
      ) : null}
      {reasoningLabel ? (
        <p className="artwork-page__record-meta-line">{reasoningLabel}</p>
      ) : null}
      {lastUpdated ? (
        <p className="artwork-page__record-meta-line">Last updated {lastUpdated}</p>
      ) : null}
    </div>
  )
}

export default function Layer2StatusAndProvenance({ artwork, artist }: Props) {
  const exhibitions = getArtworkExhibitionEvents(artwork)
  const topSeries = resolveArtworkTopLevelSeries(artwork.series)
  const externalLinks = collectArtworkSameAsUris(artwork)
  const ownership = buildOwnershipDisplay(artwork, artist)
  const loans = getPublicLoanHistory(artwork)
  const editionTiers = buildPublicEditionTiers(artwork)
  const originalTier = getOriginalTier(artwork)
  const relatedWorks = getPublicRelatedWorks(artwork)
  const provenanceClaims = getPublicProvenanceClaims(artwork)
  const showEditionRegistry =
    editionTiers.length > 0 || Boolean(artwork.untrackedEditionsNote?.trim())
  const showUnclaimedAppeal =
    hasUnclaimedOwnershipAppeal(artwork) && !isInArtistsStudio(artwork) && !originalTier
  const showStatusBlock =
    ownership.showSection ||
    Boolean(originalTier) ||
    relatedWorks.length > 0 ||
    provenanceClaims.prominent.length > 0 ||
    provenanceClaims.demoted.length > 0
  const seriesColor = topSeries?.slug ? getSeriesColor(topSeries.slug) : undefined
  const locationDetail =
    !originalTier &&
    artwork.currentLocation?.locationDetail?.trim() &&
    artwork.currentLocation?.category !== 'institution' &&
    artwork.currentLocation?.category !== 'artists-studio'
      ? artwork.currentLocation.locationDetail.trim()
      : null

  const hasContent =
    showStatusBlock ||
    showEditionRegistry ||
    exhibitions.length > 0 ||
    loans.length > 0 ||
    externalLinks.length > 0 ||
    Boolean(artwork.catalogueNumber || artwork.reasoningStatus || artwork.updatedAt)

  if (!hasContent) return null

  const showDividerBeforeExhibitions = exhibitions.length > 0 && showStatusBlock
  const showDividerBeforeEdition =
    showEditionRegistry && (showStatusBlock || exhibitions.length > 0)
  const showDividerBeforeLoans =
    loans.length > 0 && (showStatusBlock || exhibitions.length > 0 || showEditionRegistry)
  const showDividerBeforeExternal =
    externalLinks.length > 0 &&
    (showStatusBlock || exhibitions.length > 0 || showEditionRegistry || loans.length > 0)

  return (
    <section className="artwork-page__layer artwork-page__layer--status">
      <div className="artwork-page__inner">
        {showStatusBlock ? (
          <div
            className="artwork-page__status-block"
            style={
              seriesColor
                ? ({ ['--status-accent-color' as string]: seriesColor } as React.CSSProperties)
                : undefined
            }
          >
            <p className="artwork-page__status-section-label">Status &amp; ownership</p>

            {originalTier ? (
              <OriginalTierBlock artwork={artwork} />
            ) : (
              <>
                {ownership.currentHolderLine ? (
                  <p className="artwork-page__status-lead">{ownership.currentHolderLine}</p>
                ) : null}
                {locationDetail ? (
                  <p className="artwork-page__prose artwork-page__prose--secondary">{locationDetail}</p>
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
              </>
            )}

            <ProvenanceClaimsList artwork={artwork} />

            <RelatedWorksList artwork={artwork} />

            {ownership.showOriginHonesty ? (
              <p className="artwork-page__ownership-honesty">
                The early history of this work&apos;s ownership is not fully documented.
              </p>
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

        {exhibitions.length > 0 ? (
          <>
            {showDividerBeforeExhibitions ? (
              <hr className="artwork-page__status-divider artwork-page__status-divider--spaced" />
            ) : null}
            <div className="artwork-page__exhibition-panel">
              <p className="artwork-page__status-section-label">Exhibition history</p>
              <ul className="artwork-page__exhibition-list">
                {exhibitions.map(({ event, year }) => {
                  if (!event || typeof event.id !== 'number') return null
                  const venueLine = [event.venueName, event.venueCity].filter(Boolean).join(', ')
                  return (
                    <li key={event.id} className="artwork-page__exhibition-row">
                      <div className="artwork-page__exhibition-primary">
                        <span>{year}</span>
                        {' — '}
                        {event.hasPage ? (
                          <Link href={`/events/${event.slug}`} className="text-dark underline">
                            {event.title} ↗
                          </Link>
                        ) : (
                          <span>{event.title}</span>
                        )}
                      </div>
                      {venueLine ? (
                        <div className="artwork-page__exhibition-venue">· {venueLine}</div>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </div>
          </>
        ) : null}

        {showEditionRegistry ? (
          <>
            {showDividerBeforeEdition ? (
              <hr className="artwork-page__status-divider artwork-page__status-divider--spaced" />
            ) : null}
            <EditionTierRegistry artwork={artwork} />
          </>
        ) : null}

        {loans.length > 0 ? (
          <>
            {showDividerBeforeLoans ? (
              <hr className="artwork-page__status-divider artwork-page__status-divider--spaced" />
            ) : null}
            <p className="artwork-page__status-section-label">Loan history</p>
            <ul className="artwork-page__loan-list">
              {loans.map((loan, index) => (
                <li key={`${loan.institution}-${index}`} className="artwork-page__loan-row">
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
            {showDividerBeforeExternal ? (
              <hr className="artwork-page__status-divider artwork-page__status-divider--spaced" />
            ) : null}
            <p className="artwork-page__status-section-label">External links</p>
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

        <RecordMetaFooter artwork={artwork} />
      </div>
    </section>
  )
}
