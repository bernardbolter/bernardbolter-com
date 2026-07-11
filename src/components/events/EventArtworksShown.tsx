import Link from 'next/link'

import ArtworkR2Image from '@/components/artwork/ArtworkR2Image'
import { getArtworkImagePair } from '@/helpers/artworkCatalog'
import type { CatalogueArtwork } from '@/types/frontend'

function EventArtworkThumbnail({ artwork }: { artwork: CatalogueArtwork }) {
  const imagePair = getArtworkImagePair(artwork, 'grid')
  const slug = artwork.slug?.trim()
  const title = artwork.title?.trim() || 'Untitled'

  if (!slug || !imagePair) return null

  return (
    <Link href={`/${slug}`} className="event-page__artwork-card">
      <div className="event-page__artwork-frame">
        <ArtworkR2Image
          src={imagePair.src}
          fallbackSrc={imagePair.fallback}
          alt={title}
          className="event-page__artwork-image"
          loading="lazy"
          decoding="async"
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
    (artwork) => artwork.slug?.trim() && getArtworkImagePair(artwork, 'grid'),
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
