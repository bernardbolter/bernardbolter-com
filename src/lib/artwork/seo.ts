import type { Artwork } from '@/payload-types'

type ArtworkSeoSource = Pick<
  Artwork,
  'title' | 'descriptionShort' | 'metaTitle' | 'metaDescription'
>

/** Public SEO strings: explicit meta fields win, then catalogue defaults. */
export function resolveArtworkSeo(artwork: ArtworkSeoSource): {
  title: string | undefined
  description: string | undefined
} {
  const title = trimString(artwork.title)
  const metaTitle = trimString(artwork.metaTitle)
  const descriptionShort = trimString(artwork.descriptionShort)
  const metaDescription = trimString(artwork.metaDescription)

  return {
    title: metaTitle || title || undefined,
    description: metaDescription || descriptionShort || undefined,
  }
}

function trimString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}
