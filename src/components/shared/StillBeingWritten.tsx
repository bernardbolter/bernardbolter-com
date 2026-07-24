import Link from 'next/link'

import type { AccumulatingEntry, HistoricalDocumentLink } from '@/lib/artist/accumulatingEntries'

type Props = {
  heading?: string
  entries: AccumulatingEntry[]
  historicalLinks?: HistoricalDocumentLink[]
  historicalHeading?: string
}

export default function StillBeingWritten({
  heading = 'Still being written',
  entries,
  historicalLinks = [],
  historicalHeading = 'Earlier versions',
}: Props) {
  if (!entries.length && !historicalLinks.length) return null

  return (
    <section className="still-being-written" aria-label={heading}>
      {entries.length > 0 ? (
        <>
          <h2 className="still-being-written__heading">{heading}</h2>
          <ul className="still-being-written__timeline">
            {entries.map((entry) => (
              <li key={entry.id} className="still-being-written__row">
                <span className="still-being-written__date">{entry.dateLabel}</span>
                <div className="still-being-written__body">
                  {entry.permalinkHref ? (
                    <Link
                      href={entry.permalinkHref}
                      className="bio__masonry-caption still-being-written__text still-being-written__text-link"
                    >
                      {entry.text}
                    </Link>
                  ) : (
                    <p className="bio__masonry-caption still-being-written__text">{entry.text}</p>
                  )}
                  <div className="still-being-written__meta">
                    {entry.permalinkHref ? (
                      <Link
                        href={entry.permalinkHref}
                        className="still-being-written__session-link"
                      >
                        → more
                      </Link>
                    ) : entry.sessionHref ? (
                      <Link href={entry.sessionHref} className="still-being-written__session-link">
                        → session
                      </Link>
                    ) : null}
                    {typeof entry.reinforcingCount === 'number' && entry.reinforcingCount > 0 ? (
                      <span className="still-being-written__reinforce">
                        reinforced ×{entry.reinforcingCount}
                      </span>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {historicalLinks.length > 0 ? (
        <div className="still-being-written__historical">
          <h2 className="still-being-written__heading">{historicalHeading}</h2>
          <ul className="still-being-written__historical-list">
            {historicalLinks.map((link) => (
              <li key={link.id}>
                <Link href={link.href} className="still-being-written__historical-link">
                  <span className="still-being-written__date">{link.dateLabel}</span>
                  <span className="bio__masonry-caption">
                    {link.context ? link.context : 'Full text'}
                    {' →'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
