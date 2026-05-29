import Link from 'next/link'

import type { Media, Series } from '@/payload-types'

import { resolveMediaUrl } from '@/lib/studio/media'
import { processPhotoCount, type StudioArtworkListItem } from '@/lib/studio/artworks'

type PaintingCardProps = {
  artwork: StudioArtworkListItem
}

function thumbUrl(artwork: StudioArtworkListItem): string | null {
  const primary = artwork.primaryImage
  const finalRef = artwork.finalReferenceImage
  if (primary && typeof primary === 'object') return resolveMediaUrl(primary as Media)
  if (finalRef && typeof finalRef === 'object') return resolveMediaUrl(finalRef as Media)
  return null
}

function seriesLabel(artwork: StudioArtworkListItem): string | null {
  const series = artwork.series
  if (!series || typeof series === 'number') return null
  return (series as Series).name ?? null
}

export function PaintingCard({ artwork }: PaintingCardProps) {
  const image = thumbUrl(artwork)
  const count = processPhotoCount(artwork)

  return (
    <Link href={`/studio/paintings/${artwork.id}`} className="studio-painting-card">
      <div className="studio-painting-card__thumb">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" />
        ) : (
          <span className="studio-painting-card__placeholder">No image</span>
        )}
      </div>
      <div className="studio-painting-card__body">
        <h3>{artwork.title}</h3>
        <p>
          {artwork.medium?.replace(/-/g, ' ')}
          {seriesLabel(artwork) ? ` · ${seriesLabel(artwork)}` : ''}
        </p>
        <p className="studio-painting-card__meta">
          {count} process note{count === 1 ? '' : 's'} · {artwork.status}
        </p>
      </div>
    </Link>
  )
}
