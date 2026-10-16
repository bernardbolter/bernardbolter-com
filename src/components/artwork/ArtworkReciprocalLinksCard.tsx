import Link from 'next/link'

import { splitClaimPreview } from '@/lib/artist/claimPreview'
import type { ReciprocalLink } from '@/lib/artist/reciprocalLinks'

type Props = {
  seriesColor: string
  throughlines: ReciprocalLink[]
  bioEvents: ReciprocalLink[]
}

/** Prefer a site-relative path so localhost origins never leak into HTML. */
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

function ClaimText({ claim }: { claim: string }) {
  const { preview, remainder } = splitClaimPreview(claim)
  if (!remainder) {
    return <p className="artwork-reciprocal-links__claim">{claim}</p>
  }

  // Preview + remainder together are the full claim — both always in HTML.
  return (
    <div className="artwork-reciprocal-links__claim-block">
      <p className="artwork-reciprocal-links__claim">{preview}</p>
      <details className="artwork-reciprocal-links__claim-more">
        <summary className="artwork-reciprocal-links__claim-expand">Read the full claim</summary>
        <p className="artwork-reciprocal-links__claim artwork-reciprocal-links__claim--rest">
          {remainder}
        </p>
      </details>
    </div>
  )
}

function ConnectorEntry({ link }: { link: ReciprocalLink }) {
  const href = toPath(link.url)
  return (
    <li className="artwork-reciprocal-links__entry">
      <Link href={href} className="artwork-reciprocal-links__title">
        {link.name}
      </Link>
      <ClaimText claim={link.claim} />
      {link.span ? <p className="artwork-reciprocal-links__span">{link.span}</p> : null}
    </li>
  )
}

function ConnectorGroup({
  label,
  links,
}: {
  label: string
  links: ReciprocalLink[]
}) {
  if (links.length === 0) return null
  return (
    <div className="artwork-reciprocal-links__group">
      <p className="artwork-reciprocal-links__group-label">{label}</p>
      <ul className="artwork-reciprocal-links">
        {links.map((link) => (
          <ConnectorEntry key={link.url} link={link} />
        ))}
      </ul>
    </div>
  )
}

export default function ArtworkReciprocalLinksCard({
  seriesColor,
  throughlines,
  bioEvents,
}: Props) {
  if (throughlines.length === 0 && bioEvents.length === 0) return null

  return (
    <article
      className="artwork-visual-similarity-card artwork-reciprocal-links-card"
      style={{ '--vision-accent-color': seriesColor } as React.CSSProperties}
    >
      <h2 className="artwork-vision-card__label">What runs through this work</h2>
      <p className="artwork-vision-card__explainer">
        Claims that include this work, and the other works they connect.
      </p>

      <ConnectorGroup label="Throughlines" links={throughlines} />
      <ConnectorGroup label="Biography" links={bioEvents} />
    </article>
  )
}
