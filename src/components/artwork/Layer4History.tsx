import Link from 'next/link'

import { getSeriesColor } from '@/helpers/seriesColor'
import { getArtworkExhibitionEvents } from '@/lib/artwork/artworkExhibitionEvents'
import {
  buildOwnershipDisplay,
  getPublicLoanHistory,
} from '@/lib/artwork/artworkProvenancePublic'
import { resolveWorkStateLabel } from '@/lib/artwork/artworkLabels'
import { resolveArtworkTopLevelSeries } from '@/lib/artwork/resolveTopLevelSeries'
import type { Artist, Artwork } from '@/payload-types'

type Props = {
  artwork: Artwork
  artist: Artist | null
}

function formatDateRange(start?: string, end?: string): string {
  if (start && end) return `${start} – ${end}`
  return start || end || ''
}

export default function Layer4History({ artwork, artist }: Props) {
  const exhibitions = getArtworkExhibitionEvents(artwork)
  const ownership = buildOwnershipDisplay(artwork, artist)
  const loans = getPublicLoanHistory(artwork)
  const seriesSlug = resolveArtworkTopLevelSeries(artwork.series)?.slug ?? ''
  const seriesColor = getSeriesColor(seriesSlug)
  const timelineBorderColor = `${seriesColor}40`

  const showWorkState =
    (artwork.workState && artwork.workState !== 'original') ||
    (Array.isArray(artwork.stateVersions) && artwork.stateVersions.length > 0)

  return (
    <section className="artwork-page__layer artwork-page__layer--secondary">
      <div className="artwork-page__inner">
        {exhibitions.length > 0 ? (
          <div className="artwork-image__info--exhibition-history-wrapper">
            <h2>Exhibition History</h2>
            <ul className="artwork-image__info--exhibition-history">
              {exhibitions.map(({ event, year }) => (
                <li key={event.id}>
                  <span className="text-secondary">{year}</span>
                  {' — '}
                  {event.hasPage ? (
                    <Link href={`/events/${event.slug}`} className="text-dark underline">
                      {event.title}
                    </Link>
                  ) : (
                    <span>{event.title}</span>
                  )}
                  {event.venueName || event.venueCity ? (
                    <span className="text-secondary">
                      {' '}
                      · {[event.venueName, event.venueCity].filter(Boolean).join(', ')}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {ownership.showSection ? (
          <div className="artwork-image__info--ownership-wrapper">
            <h2>Ownership</h2>
            <div className="artwork-page__ownership">
              {ownership.currentHolderLine ? (
                <p className="artwork-page__ownership-current">{ownership.currentHolderLine}</p>
              ) : null}

              {ownership.showOriginHonesty ? (
                <p className="artwork-page__ownership-honesty">
                  The early history of this work&apos;s ownership is not fully documented.
                </p>
              ) : null}

              {ownership.showTimeline ? (
                <ul
                  className="artwork-page__ownership-timeline"
                  style={{ ['--ownership-timeline-color' as string]: timelineBorderColor }}
                >
                  {ownership.timelineRows.map((row, index) => (
                    <li key={`${row.text}-${index}`} className="artwork-page__ownership-timeline-row">
                      {row.text}
                    </li>
                  ))}
                </ul>
              ) : null}

              {ownership.showUnclaimedAppeal && ownership.claimContactHref ? (
                <p className="artwork-page__ownership-appeal">
                  If you own this work,{' '}
                  <Link href={ownership.claimContactHref} className="text-dark underline">
                    get in touch
                  </Link>
                  . I&apos;ll add you to the record and officially connect you to its history.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

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

        {showWorkState ? (
          <>
            <hr className="artwork-page__divider" />
            <p className="artwork-page__section-title">Work state record</p>
            {resolveWorkStateLabel(artwork.workState) ? (
              <p className="artwork-page__prose">
                {resolveWorkStateLabel(artwork.workState)}
                {artwork.workStateDate ? ` · ${artwork.workStateDate}` : ''}
              </p>
            ) : null}
            {Array.isArray(artwork.stateVersions)
              ? artwork.stateVersions.map((row, index) => {
                  if (!row || typeof row !== 'object') return null
                  const record = row as Record<string, unknown>
                  const description = String(record.description ?? record.note ?? '').trim()
                  const date = String(record.date ?? '').trim()
                  if (!description && !date) return null
                  return (
                    <p key={index} className="artwork-page__prose artwork-page__prose--secondary mt-2">
                      {[date, description].filter(Boolean).join(' — ')}
                    </p>
                  )
                })
              : null}
          </>
        ) : null}
      </div>
    </section>
  )
}
