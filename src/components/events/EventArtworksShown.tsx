import Image from 'next/image'
import Link from 'next/link'

import { getDisplayImageUrl } from '@/helpers/artworkCatalog'
import type { CatalogueArtwork } from '@/types/frontend'

function EventArtworkThumbnail({ artwork }: { artwork: CatalogueArtwork }) {
  const imageUrl = getDisplayImageUrl(artwork)
  const slug = artwork.slug?.trim()
  const title = artwork.title?.trim() || 'Untitled'

  if (!slug || !imageUrl) return null

  return (
    <Link href={`/${slug}`} className="event-page__artwork-card">
      <div className="event-page__artwork-frame">
        <Image
          src={imageUrl}
          alt={title}
          fill
          className="event-page__artwork-image"
          sizes="(max-width: 550px) 45vw, 200px"
        />
      </div>
      <p className="event-page__artwork-title">{title}</p>
    </Link>
  )
}

export function EventArtworksShown({
  artworks,
  presentationNote,
}: {
  artworks: CatalogueArtwork[]
  presentationNote?: string | null
}) {
  const visibleArtworks = artworks.filter(
    (artwork) => artwork.slug?.trim() && getDisplayImageUrl(artwork),
  )

  if (visibleArtworks.length === 0) return null

  return (
    <section className="event-page__section event-page__artworks">
      <h2>Artworks Shown</h2>
      {presentationNote?.trim() ? (
        <p className="event-page__artworks-note">{presentationNote.trim()}</p>
      ) : null}
      <div className="event-page__artworks-grid" role="region" aria-label="Artworks shown in this event">
        {visibleArtworks.map((artwork) => (
          <EventArtworkThumbnail key={artwork.id} artwork={artwork} />
        ))}
      </div>
    </section>
  )
}
