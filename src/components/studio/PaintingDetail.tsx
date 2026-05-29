import Link from 'next/link'

import type { Artwork, FieldNote, Media, Series } from '@/payload-types'

import { resolveMediaUrl } from '@/lib/studio/media'

import { ProcessTimeline } from './ProcessTimeline'
import { TimelapsePlayer } from './TimelapsePlayer'

type PaintingDetailProps = {
  artwork: Artwork
  processNotes: FieldNote[]
}

export function PaintingDetail({ artwork, processNotes }: PaintingDetailProps) {
  const series =
    artwork.series && typeof artwork.series === 'object' ? (artwork.series as Series) : null
  const finalImage =
    artwork.finalReferenceImage && typeof artwork.finalReferenceImage === 'object'
      ? (artwork.finalReferenceImage as Media)
      : null
  const finalUrl = resolveMediaUrl(finalImage)

  return (
    <article className="studio-detail">
      <header className="studio-detail__header">
        <h2>{artwork.title}</h2>
        <p>
          {artwork.medium?.replace(/-/g, ' ')}
          {series?.name ? ` · ${series.name}` : ''} · {artwork.status}
        </p>
        <Link href={`/admin/collections/artworks/${artwork.id}`} className="studio-detail__admin">
          Open in admin →
        </Link>
      </header>

      {finalUrl ? (
        <section>
          <h3>Final reference</h3>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={finalUrl} alt="" className="studio-detail__hero" />
        </section>
      ) : null}

      <section>
        <h3>Process timeline</h3>
        <ProcessTimeline notes={processNotes} />
      </section>

      <section>
        <h3>Timelapse</h3>
        <TimelapsePlayer file={artwork.timelapseFile} />
      </section>
    </article>
  )
}
