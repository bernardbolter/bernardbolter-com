import Link from 'next/link'
import type { CSSProperties } from 'react'

import { preferredVisionAnalysis } from '@/lib/artwork/visionPage'
import type { Artwork } from '@/payload-types'

type Props = {
  artwork: Artwork
  seriesColor: string
}

export default function ArtworkVisionAnalysisCard({ artwork, seriesColor }: Props) {
  const analysis = preferredVisionAnalysis(artwork)
  const slug = artwork.slug?.trim()
  if (!analysis || !slug) return null

  return (
    <article
      className="artwork-vision-analysis-card"
      style={{ '--vision-accent-color': seriesColor } as CSSProperties}
    >
      <p className="artwork-vision-card__label">Vision Analysis</p>
      <p className="artwork-vision-card__text">{analysis.text}</p>
      <Link href={`/${slug}/vision#analyses`} className="artwork-vision-card__link">
        View all analyses →
      </Link>
    </article>
  )
}
