import Link from 'next/link'

import ArtworkR2Image from '@/components/artwork/ArtworkR2Image'
import type { SimilarWorkItem } from '@/components/artwork/similarWorkItem'

type Props = {
  artworkSlug: string
  seriesColor: string
  similarWorks: SimilarWorkItem[]
}

export default function ArtworkVisualSimilarityCard({
  artworkSlug,
  seriesColor,
  similarWorks,
}: Props) {
  const thumbnails = similarWorks.slice(0, 3)

  return (
    <article
      className="artwork-visual-similarity-card"
      style={{ '--vision-accent-color': seriesColor } as React.CSSProperties}
    >
      <p className="artwork-vision-card__label">Visual Similarity</p>
      <p className="artwork-vision-card__explainer">
        Works with similar visual structure, found by comparing image embeddings across the
        archive.
      </p>

      {thumbnails.length > 0 ? (
        <div className="clip-embedding-note__similar">
          <div className="clip-embedding-note__similar-grid">
            {thumbnails.map((work) => (
              <Link
                key={work.slug}
                href={`/${work.slug}`}
                className="clip-embedding-note__similar-link"
              >
                <div className="clip-embedding-note__similar-image">
                  <ArtworkR2Image
                    src={work.imageSrc}
                    fallbackSrc={work.imageFallback}
                    alt={work.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <Link href={`/${artworkSlug}/vision#embeddings`} className="artwork-vision-card__link">
        Explore visual embeddings →
      </Link>
    </article>
  )
}
