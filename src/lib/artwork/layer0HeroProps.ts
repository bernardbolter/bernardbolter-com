import { getArtworkSizeInput } from '@/lib/artwork/catalogueIdentity'
import {
  artworkHasVideo,
  collectArtworkGalleryImages,
  getPrimaryVideoSource,
  getYoutubeAccessUrl,
  type ArtworkGalleryImage,
} from '@/lib/artwork/artworkGalleryImages'
import { formatArtworkYearRange, resolveWallLabelMedium } from '@/lib/artwork/artworkLabels'
import { getSizeTier, resolveSeriesSlug } from '@/helpers/artworkCatalog'
import { seriesColorBlurDataURLs } from '@/helpers/blurURLs'
import { getSeriesColor } from '@/helpers/seriesColor'
import { mediaPublicUrl } from '@/lib/media/publicUrl'
import type { Artwork, Media } from '@/payload-types'
import type { ArtworkSizeTier } from '@/types/frontend'

export type Layer0SizeInput = {
  width: string
  height: string
  units: string
}

export type Layer0ImageHeroProps = {
  title: string
  yearLabel: string
  mediumLabel: string
  seriesSlug: string
  seriesColor: string
  blurDataURL: string
  sizeTier: ArtworkSizeTier
  orientation: Artwork['orientation']
  sizeInput: Layer0SizeInput | null
  galleryImages: ArtworkGalleryImage[]
  videoSrc: string | null
  hasVideo: boolean
}

export type Layer0VideoHeroProps = {
  title: string
  yearLabel: string
  mediumLabel: string
  sizeInput: Layer0SizeInput | null
  videoSource: string | null
  youtubeAccessUrl: string | null
  posterUrl: string | null
  posterWidth: number
  posterHeight: number
}

function readPosterMedia(artwork: Artwork): Media | null {
  const candidate = artwork.posterImage ?? artwork.primaryImage
  if (candidate && typeof candidate === 'object') return candidate as Media
  return null
}

/** Slim props for Layer0Image — never pass the full Artwork across the client boundary. */
export function buildLayer0ImageHeroProps(artwork: Artwork): Layer0ImageHeroProps {
  const seriesSlug = resolveSeriesSlug(artwork) ?? 'default'
  const sizeInput = getArtworkSizeInput(artwork)
  return {
    title: artwork.title?.trim() || 'Artwork',
    yearLabel: formatArtworkYearRange(artwork),
    mediumLabel: resolveWallLabelMedium(artwork),
    seriesSlug,
    seriesColor: getSeriesColor(seriesSlug),
    blurDataURL: seriesColorBlurDataURLs[seriesSlug] ?? seriesColorBlurDataURLs.default,
    sizeTier: getSizeTier(artwork),
    orientation: artwork.orientation ?? null,
    sizeInput,
    galleryImages: collectArtworkGalleryImages(artwork),
    videoSrc: getPrimaryVideoSource(artwork),
    hasVideo: artworkHasVideo(artwork),
  }
}

/** Slim props for Layer0Video — never pass the full Artwork across the client boundary. */
export function buildLayer0VideoHeroProps(artwork: Artwork): Layer0VideoHeroProps {
  const poster = readPosterMedia(artwork)
  return {
    title: artwork.title?.trim() || 'Artwork',
    yearLabel: formatArtworkYearRange(artwork),
    mediumLabel: resolveWallLabelMedium(artwork),
    sizeInput: getArtworkSizeInput(artwork),
    videoSource: getPrimaryVideoSource(artwork),
    youtubeAccessUrl: getYoutubeAccessUrl(artwork),
    posterUrl: mediaPublicUrl(poster),
    posterWidth: poster?.width && poster.width > 0 ? poster.width : 1600,
    posterHeight: poster?.height && poster.height > 0 ? poster.height : 900,
  }
}
