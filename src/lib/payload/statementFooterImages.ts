import type { Artist, Media } from '@/payload-types'

export type StatementFooterImage = {
  url: string
  alt: string
}

/** Populated statement footer uploads from the artist record. */
export function readStatementFooterImages(
  artist: Artist | null | undefined,
): StatementFooterImage[] {
  const rows = artist?.statementFooterImages ?? []

  return rows
    .map((row) => {
      const media = row?.image
      if (!media || typeof media !== 'object') return null
      const resolved = media as Media
      if (!resolved.url) return null
      return {
        url: resolved.url,
        alt: resolved.alt?.trim() || 'Statement image',
      }
    })
    .filter((entry): entry is StatementFooterImage => entry !== null)
}
