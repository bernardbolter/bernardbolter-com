export type ArtworkMediaNode = {
  mediaDetails?: {
    width?: number | null
    height?: number | null
  } | null
}

export type Artwork = {
  date?: Date | string | number | null
  artworkFields?: {
    artworkImage?: { node?: ArtworkMediaNode | null } | null
    videoPoster?: { node?: ArtworkMediaNode | null } | null
  } | null
}
