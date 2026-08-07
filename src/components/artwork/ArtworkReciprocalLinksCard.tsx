import Link from 'next/link'

import type { ReciprocalLink } from '@/lib/artist/reciprocalLinks'

type Props = {
  seriesColor: string
  throughlines: ReciprocalLink[]
  bioEvents: ReciprocalLink[]
}

function toPath(absoluteOrPath: string): string {
  try {
    if (absoluteOrPath.startsWith('http://') || absoluteOrPath.startsWith('https://')) {
      return new URL(absoluteOrPath).pathname
    }
  } catch {
    // fall through
  }
  return absoluteOrPath
}

export default function ArtworkReciprocalLinksCard({
  seriesColor,
  throughlines,
  bioEvents,
}: Props) {
  if (throughlines.length === 0 && bioEvents.length === 0) return null

  return (
    <article
      className="artwork-visual-similarity-card"
      style={{ '--vision-accent-color': seriesColor } as React.CSSProperties}
    >
      <p className="artwork-vision-card__label">Related Patterns</p>
      <p className="artwork-vision-card__explainer">
        Throughlines and bio events that include this work — the same connections shown on those
        pages, linked back here.
      </p>

      {throughlines.length > 0 ? (
        <ul className="artwork-reciprocal-links">
          {throughlines.map((link) => (
            <li key={link.url}>
              <Link href={toPath(link.url)} className="artwork-vision-card__link">
                {link.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {bioEvents.length > 0 ? (
        <ul className="artwork-reciprocal-links">
          {bioEvents.map((link) => (
            <li key={link.url}>
              <Link href={toPath(link.url)} className="artwork-vision-card__link">
                {link.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  )
}
