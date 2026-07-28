/** Cache headers shared by all public corpus machine endpoints. */
export const CORPUS_CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=0, s-maxage=60, must-revalidate',
} as const

/**
 * Content-negotiate corpus responses.
 * Clients that ask for ld+json get it (with charset); everyone else gets
 * application/json so fetch tools that treat bare ld+json as binary still work.
 * Never emit application/ld+json without charset=utf-8.
 */
export function corpusContentType(req: Request): string {
  const accept = req.headers.get('accept') ?? ''
  return accept.includes('application/ld+json')
    ? 'application/ld+json; charset=utf-8'
    : 'application/json; charset=utf-8'
}

export function corpusResponseHeaders(req: Request): Record<string, string> {
  return {
    'Content-Type': corpusContentType(req),
    ...CORPUS_CACHE_HEADERS,
  }
}

/** @deprecated Prefer corpusResponseHeaders(req) — kept for non-Request call sites. */
export const CORPUS_LD_JSON_HEADERS = {
  'Content-Type': 'application/ld+json; charset=utf-8',
  ...CORPUS_CACHE_HEADERS,
} as const
