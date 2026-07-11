import Link from 'next/link'

import type { BioPageImage } from '@/helpers/bioPhotos'

interface BioPhotoItemProps {
  image: BioPageImage
  colSpan: number
  rowSpan: number
  onOpen: () => void
}

export default function BioPhotoItem({ image, colSpan, rowSpan, onOpen }: BioPhotoItemProps) {
  const event = image.relatedEvent
  const canLink = event?.hasPage === true

  return (
    <div
      className="bio__masonry-item"
      style={{
        gridColumn: `span ${colSpan}`,
        gridRow: `span ${rowSpan}`,
      }}
    >
      <div
        className="bio__masonry-item-image"
        onClick={onOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(keyboardEvent) => {
          if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
            keyboardEvent.preventDefault()
            onOpen()
          }
        }}
      >
        <img
          src={image.url}
          alt={image.alt}
          className="bio__image-masonry"
          loading="lazy"
          decoding="async"
          style={{ objectFit: 'cover', width: '100%', height: '100%', display: 'block' }}
        />
      </div>
      {image.caption ? (
        canLink ? (
          <Link href={`/events/${event.slug}`} className="bio__masonry-caption-link">
            <p className="bio__masonry-caption">{image.caption}</p>
          </Link>
        ) : (
          <p className="bio__masonry-caption">{image.caption}</p>
        )
      ) : null}
    </div>
  )
}
