import Link from 'next/link'

import { getArtworkExhibitionEvents } from '@/lib/artwork/artworkExhibitionEvents'
import {
  deriveProvenanceConfidenceSummary,
  getPublicLoanHistory,
  getPublicOwnershipTimeline,
  provenanceConfidenceStatement,
} from '@/lib/artwork/artworkProvenancePublic'
import { resolveWorkStateLabel } from '@/lib/artwork/artworkLabels'
import type { Artwork } from '@/payload-types'

type Props = {
  artwork: Artwork
}

function formatDateRange(start?: string, end?: string): string {
  if (start && end) return `${start} – ${end}`
  return start || end || ''
}

export default function Layer4History({ artwork }: Props) {
  const exhibitions = getArtworkExhibitionEvents(artwork)
  const provenanceSummary = deriveProvenanceConfidenceSummary(artwork)
  const ownership = getPublicOwnershipTimeline(artwork)
  const loans = getPublicLoanHistory(artwork)
  const showProvenance =
    provenanceSummary !== null || ownership.length > 0 || artwork.provenanceOriginKnown === false
  const showWorkState =
    (artwork.workState && artwork.workState !== 'original') ||
    (Array.isArray(artwork.stateVersions) && artwork.stateVersions.length > 0)

  return (
    <section className="artwork-page__layer artwork-page__layer--secondary">
      <div className="artwork-page__inner">
        {exhibitions.length > 0 ? (
          <>
            <p className="artwork-page__section-title">Exhibition history</p>
            <ul className="space-y-3 text-sm">
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
          </>
        ) : null}

        {showProvenance ? (
          <>
            <hr className="artwork-page__divider" />
            <p className="artwork-page__section-title">Provenance</p>
            {provenanceSummary ? (
              <p className="artwork-page__prose">{provenanceConfidenceStatement(provenanceSummary)}</p>
            ) : null}
            <p className="artwork-page__prose artwork-page__prose--secondary mt-2">
              Ownership history is held privately. This statement reflects the level of documentation
              on record.
            </p>
            {ownership.length > 0 ? (
              <ul className="mt-4 space-y-2 text-sm">
                {ownership.map((entry, index) => (
                  <li key={`${entry.displayName}-${index}`}>
                    <span className="font-medium">{entry.displayName}</span>
                    {entry.city ? <span className="text-secondary"> · {entry.city}</span> : null}
                    {entry.dateAcquired || entry.dateRelinquished ? (
                      <span className="text-secondary">
                        {' '}
                        · {formatDateRange(entry.dateAcquired, entry.dateRelinquished)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </>
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
