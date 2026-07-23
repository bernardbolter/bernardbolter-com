/**
 * Cross-origin allowlist for public Payload REST + corpus APIs
 * (e.g. A Colorful History site fetching published artworks).
 *
 * Set `CORS_ORIGINS` to a comma-separated list of origins, e.g.:
 *   CORS_ORIGINS=https://acolorfulhistory.com,http://localhost:3001
 */
export function getCorsOrigins(): string[] {
  const fromEnv =
    process.env.CORS_ORIGINS?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean) ?? []

  if (fromEnv.length > 0) return fromEnv

  if (process.env.NODE_ENV === 'development') {
    return [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
    ]
  }

  return []
}

export function isCorsOriginAllowed(origin: string | null): origin is string {
  if (!origin) return false
  return getCorsOrigins().includes(origin)
}

/** CORS response headers for an allowed Origin (no credentials). */
export function corsHeadersForOrigin(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}
