import Image from 'next/image'

import { resolveMediaUrl } from '@/lib/studio/media'
import type { Artist, Media } from '@/payload-types'

type Props = {
  artist: Artist
}

export default function ContactPhoto({ artist }: Props) {
  const photo = artist.contactPhoto
  if (!photo || typeof photo === 'number') return null

  const media = photo as Media
  const url = resolveMediaUrl(media)
  if (!url) return null

  const caption = artist.contactPhotoCaption?.trim()
  const width = media.width ?? 600
  const height = media.height ?? 800

  return (
    <div>
      <div className="aspect-[3/4] w-full overflow-hidden rounded-[0.25rem]">
        <Image
          src={url}
          alt={media.alt?.trim() || 'Bernard Bolter in the studio'}
          width={width}
          height={height}
          className="h-full w-full object-cover"
          sizes="(min-width: 979px) 17.5rem, 100vw"
        />
      </div>
      {caption ? (
        <p className="mt-[0.75rem] font-heading text-[0.8125rem] leading-[1.5] text-muted">
          {caption}
        </p>
      ) : null}
    </div>
  )
}
