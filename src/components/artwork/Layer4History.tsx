import Link from 'next/link'

import { getArtworkExhibitionEvents } from '@/lib/artwork/artworkExhibitionEvents'
import { resolveWorkStateLabel } from '@/lib/artwork/artworkLabels'
import type { Artwork } from '@/payload-types'

type Props = {
  artwork: Artwork
}

export default function Layer4History({ artwork }: Props) {
  const exhibitions = getArtworkExhibitionEvents(artwork)

  const showWorkState =
    (artwork.workState && artwork.workState !== 'original') ||
    (Array.isArray(artwork.stateVersions) && artwork.stateVersions.length > 0)

  if (exhibitions.length === 0 && !showWorkState) return null

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

        {showWorkState ? (
          <>
            {exhibitions.length > 0 ? <hr className="artwork-page__divider" /> : null}
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
