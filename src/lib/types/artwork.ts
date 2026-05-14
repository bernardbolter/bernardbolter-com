import type { Artwork, Series, Media, Artist } from '@/payload-types'

export type ArtworkWithRelations = Omit<Artwork, 'primaryImage' | 'series' | 'creator'> & {
  primaryImage: Media | null
  series: Series | null
  creator: Artist | null
}