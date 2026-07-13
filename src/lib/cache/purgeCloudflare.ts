/** Public site origin for cache purge URLs (post–Netcup / Cloudflare cutover). */
export function getPublicSiteOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.PAYLOAD_PUBLIC_SERVER_URL ??
    'https://bernardbolter.com'
  return raw.replace(/\/$/, '')
}

/** Turn app paths into absolute URLs for Cloudflare `files` purge. */
export function pathsToAbsoluteUrls(paths: string[]): string[] {
  const origin = getPublicSiteOrigin()
  const unique = new Set<string>()

  for (const path of paths) {
    const normalized = path.startsWith('/') ? path : `/${path}`
    unique.add(`${origin}${normalized}`)
  }

  return [...unique]
}

export type PurgeCloudflareResult = { ok: true; status: number } | { ok: false; reason: string }

/**
 * Purge explicit URLs at Cloudflare edge. No-op when env is unset (local dev, pre-DNS).
 * Uses URL-list purge (not tag purge — Enterprise only).
 */
export async function purgeCloudflareCache(files: string[]): Promise<PurgeCloudflareResult> {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID?.trim()
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim()

  if (!zoneId || !apiToken) {
    return { ok: false, reason: 'missing_cloudflare_env' }
  }

  if (files.length === 0) {
    return { ok: false, reason: 'no_files' }
  }

  const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ files }),
  })

  if (!response.ok) {
    return { ok: false, reason: `http_${response.status}` }
  }

  return { ok: true, status: response.status }
}
