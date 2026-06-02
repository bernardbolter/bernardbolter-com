/**
 * @deprecated Import `Artwork` / `CatalogueArtwork` from `@/types/frontend` or `@/payload-types`.
 * Legacy WordPress-shaped types remain only for hooks not yet ported in Phase 3.
 */
export type { Artwork } from '@/payload-types'

export type ArtworkMediaDetails = {
  width: number
  height: number
}

export type ArtworkImageNode = {
  altText?: string
  sourceUrl?: string
  srcSet?: string
  mediaDetails?: ArtworkMediaDetails
}

export type ArtworkImage = {
  node?: ArtworkImageNode | null
}

/** @deprecated Use Payload `Artwork` fields (`primaryImage`, `sizeTier`, etc.). */
export type LegacyArtworkFields = {
  artworkImage?: ArtworkImage | null
  videoPoster?: ArtworkImage | null
  size?: string | null
}

/** @deprecated */
export type LegacyArtwork = {
  date?: Date | string | number | null
  artworkFields?: LegacyArtworkFields | null
}
