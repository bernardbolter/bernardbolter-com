import Link from 'next/link'
import type { CSSProperties } from 'react'

import {
  formatVisionConditioningLine,
  visionAnalysesNewestFirst,
} from '@/lib/artwork/visionPage'
import type { Artwork } from '@/payload-types'

type Props = {
  artwork: Artwork
  seriesColor: string
  showVisionPageLink?: boolean
  /**
   * When false, the parent column already owns heading + framing
   * (artwork-page dialogue pair). Default true for standalone embeds.
   */
  showHeadingAndFrame?: boolean
}

/**
 * Artwork-page vision block — tinted panel (series accent), conditioning line,
 * newest analysis first when several exist.
 */
export default function ArtworkVisionAnalysisCard({
  artwork,
  seriesColor,
  showVisionPageLink = true,
  showHeadingAndFrame = true,
}: Props) {
  const analyses = visionAnalysesNewestFirst(artwork)
  const slug = artwork.slug?.trim()
  if (analyses.length === 0 || !slug) return null

  return (
    <article
      className="artwork-vision-analysis-card"
      style={{ '--vision-accent-color': seriesColor } as CSSProperties}
    >
      {showHeadingAndFrame ? (
        <>
          <p className="artwork-vision-card__label">Vision Analysis</p>
          <p className="artwork-vision-card__explainer artwork-vision-card__explainer--vision-frame">
            A description of the work written by an AI looking at the image, kept separate from
            the artist&apos;s account so the two can be compared.
          </p>
        </>
      ) : null}
      {analyses.map((analysis, index) => {
        const conditioning = formatVisionConditioningLine(analysis)
        return (
          <div
            key={`${analysis.model}-${analysis.date}-${index}`}
            className="artwork-vision-analysis-card__entry"
          >
            {conditioning ? (
              <p className="artwork-vision-card__conditioning">{conditioning}</p>
            ) : null}
            <p className="artwork-vision-card__text">{analysis.text}</p>
          </div>
        )
      })}
      {showVisionPageLink ? (
        <Link href={`/${slug}/vision#analyses`} className="artwork-vision-card__link">
          View all analyses →
        </Link>
      ) : null}
    </article>
  )
}
