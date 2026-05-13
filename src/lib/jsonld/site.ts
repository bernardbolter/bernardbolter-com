/** Canonical site origin for absolute URLs in JSON-LD. */
export function getSiteBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bernardbolter.com'
  return raw.replace(/\/$/, '')
}
