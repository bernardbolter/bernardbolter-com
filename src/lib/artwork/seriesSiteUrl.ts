import type { Artwork } from '@/payload-types'

type ArtworkWithSeriesSite = Artwork & {
  /** Full URL to this work on its series site — set on the artwork when live. */
  seriesSiteUrl?: string | null
}

/** Per-artwork series site page URL from the artwork record (not inferred from series slug). */
export function getArtworkSeriesSiteUrl(artwork: Artwork): string | null {
  const url = (artwork as ArtworkWithSeriesSite).seriesSiteUrl?.trim()
  return url || null
}
