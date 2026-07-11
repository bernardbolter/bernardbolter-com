import type { Artwork, Media } from '@/payload-types'

import {
  getArtworkImageSources,
} from '@/lib/media/artworkR2Images'
import { stripMediaUrlVersion } from '@/lib/media/r2Object'
import { mediaPublicUrl } from '@/lib/media/publicUrl'

export type ArtworkGalleryImage = {
  url: string
  fallbackUrl: string
  alt: string
  width: number
  height: number
}

function readMedia(media: number | Media | null | undefined): ArtworkGalleryImage | null {
  const mediaDoc = media && typeof media === 'object' ? media : null
  if (!mediaDoc?.url?.trim()) return null

  const fallbackUrl = stripMediaUrlVersion(mediaDoc.url.trim())
  return {
    url: fallbackUrl,
    fallbackUrl,
    alt: mediaDoc.alt?.trim() || '',
    width: mediaDoc.width && mediaDoc.width > 0 ? mediaDoc.width : 1200,
    height: mediaDoc.height && mediaDoc.height > 0 ? mediaDoc.height : 900,
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
    const sources = getArtworkImageSources(artwork, 'artwork-page')
    push({
      ...primary,
      url: sources?.src ?? primary.url,
      fallbackUrl: sources?.fallback ?? primary.fallbackUrl,
      alt: artwork.primaryImageAltText?.trim() || artwork.title || 'Artwork',
    })
  } else {
    const poster = readMedia(artwork.posterImage)
    if (poster) {
      const sources = getArtworkImageSources(artwork, 'artwork-page')
      push({
        ...poster,
        url: sources?.src ?? poster.url,
        fallbackUrl: sources?.fallback ?? poster.fallbackUrl,
      })
    }
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
  if (artwork.videoFile && typeof artwork.videoFile === 'object') {
    return mediaPublicUrl(artwork.videoFile as Media)
  }
  if (artwork.videoUrl?.trim()) return artwork.videoUrl.trim()
  const clips = artwork.videos ?? []
  const preferred = clips.find((clip) => clip.videoRole === 'primary') ?? clips[0]
  if (!preferred) return null
  if (preferred.videoFile && typeof preferred.videoFile === 'object') {
    return mediaPublicUrl(preferred.videoFile as Media)
  }
  return preferred.videoUrl?.trim() ?? null
}

const YOUTUBE_URL_PATTERN = /(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)/

export function isYoutubeVideoUrl(url: string): boolean {
  return YOUTUBE_URL_PATTERN.test(url)
}

/** External YouTube link for access when the primary player is self-hosted (R2). */
export function getYoutubeAccessUrl(artwork: Artwork): string | null {
  const candidates: Array<string | null | undefined> = [artwork.videoUrl, artwork.documentationVideoUrl]
  for (const clip of artwork.videos ?? []) {
    candidates.push(clip.videoUrl)
  }
  for (const url of candidates) {
    const trimmed = url?.trim()
    if (trimmed && isYoutubeVideoUrl(trimmed)) return trimmed
  }
  return null
}

/** True when Layer 0 should render the video player instead of the image slider. */
export function isVideoPrimaryArtwork(artwork: Artwork): boolean {
  if (!artworkHasVideo(artwork)) return false

  const hasExtraGallery =
    (artwork.alternateViewImages?.length ?? 0) > 0 || (artwork.detailImages?.length ?? 0) > 0
  if (hasExtraGallery) return false

  const hasUploadedPrimaryVideo =
    artwork.videoFile &&
    typeof artwork.videoFile === 'object' &&
    Boolean(mediaPublicUrl(artwork.videoFile as Media))

  if (hasUploadedPrimaryVideo) return true

  if (artwork.primaryImage) return false

  return collectArtworkGalleryImages(artwork).length === 0
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
