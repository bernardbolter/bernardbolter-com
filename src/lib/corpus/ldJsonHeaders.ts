/** Shared response headers for all public corpus machine endpoints. */
export const CORPUS_LD_JSON_HEADERS = {
  'Content-Type': 'application/ld+json',
  'Cache-Control': 'public, max-age=0, s-maxage=60, must-revalidate',
} as const
