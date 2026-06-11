import type { Artwork, Media } from '@/payload-types'

export type ArtworkGalleryImage = {
  url: string
  alt: string
  width: number
  height: number
}

function readMedia(media: number | Media | null | undefined): ArtworkGalleryImage | null {
  if (!media || typeof media !== 'object' || !media.url) return null
  return {
    url: media.url,
    alt: media.alt?.trim() || '',
    width: media.width && media.width > 0 ? media.width : 1200,
    height: media.height && media.height > 0 ? media.height : 900,
  }
}

/** Primary + alternate views + detail images for Layer 0 slider. */
export function collectArtworkGalleryImages(artwork: Artwork): ArtworkGalleryImage[] {
  const images: ArtworkGalleryImage[] = []
  const seen = new Set<string>()

  const push = (image: ArtworkGalleryImage | null) => {
    if (!image || seen.has(image.url)) return
    seen.add(image.url)
    images.push(image)
  }

  const primary = readMedia(artwork.primaryImage)
  if (primary) {
    push({
      ...primary,
      alt: artwork.primaryImageAltText?.trim() || artwork.title || 'Artwork',
    })
  } else {
    push(readMedia(artwork.posterImage))
  }

  for (const row of artwork.alternateViewImages ?? []) {
    const media = readMedia(row.image)
    if (media) {
      push({
        ...media,
        alt: row.altText?.trim() || row.caption?.trim() || media.alt || artwork.title || 'Artwork',
      })
    }
  }

  for (const row of artwork.detailImages ?? []) {
    const media = readMedia(row.image)
    if (media) {
      push({
        ...media,
        alt: row.altText?.trim() || row.caption?.trim() || media.alt || 'Detail',
      })
    }
  }

  return images
}

export function artworkHasVideo(artwork: Artwork): boolean {
  if (artwork.videoFile && typeof artwork.videoFile === 'object' && artwork.videoFile.url) {
    return true
  }
  if (artwork.videoUrl?.trim()) return true
  return (artwork.videos ?? []).some(
    (clip) =>
      (clip.videoFile && typeof clip.videoFile === 'object' && clip.videoFile.url) ||
      Boolean(clip.videoUrl?.trim()),
  )
}

export function getPrimaryVideoSource(artwork: Artwork): string | null {
  if (artwork.videoFile && typeof artwork.videoFile === 'object' && artwork.videoFile.url) {
    return artwork.videoFile.url
  }
  if (artwork.videoUrl?.trim()) return artwork.videoUrl.trim()
  const clips = artwork.videos ?? []
  const preferred = clips.find((clip) => clip.videoRole === 'primary') ?? clips[0]
  if (!preferred) return null
  if (preferred.videoFile && typeof preferred.videoFile === 'object' && preferred.videoFile.url) {
    return preferred.videoFile.url
  }
  return preferred.videoUrl?.trim() ?? null
}

export function getDocumentationVideoSource(artwork: Artwork): string | null {
  if (
    artwork.documentationVideoFile &&
    typeof artwork.documentationVideoFile === 'object' &&
    artwork.documentationVideoFile.url
  ) {
    return artwork.documentationVideoFile.url
  }
  return artwork.documentationVideoUrl?.trim() ?? null
}
