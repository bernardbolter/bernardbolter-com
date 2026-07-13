import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  getPublicSiteOrigin,
  pathsToAbsoluteUrls,
  purgeCloudflareCache,
} from '@/lib/cache/purgeCloudflare'

describe('purgeCloudflare', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('getPublicSiteOrigin prefers NEXT_PUBLIC_SITE_URL', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://bernardbolter.com')
    vi.stubEnv('PAYLOAD_PUBLIC_SERVER_URL', 'https://other.example')
    expect(getPublicSiteOrigin()).toBe('https://bernardbolter.com')
  })

  it('pathsToAbsoluteUrls dedupes and normalizes', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://bernardbolter.com/')
    expect(pathsToAbsoluteUrls(['/foo', 'foo', '/api/corpus'])).toEqual([
      'https://bernardbolter.com/foo',
      'https://bernardbolter.com/api/corpus',
    ])
  })

  it('purgeCloudflareCache no-ops without env', async () => {
    const result = await purgeCloudflareCache(['https://bernardbolter.com/foo'])
    expect(result).toEqual({ ok: false, reason: 'missing_cloudflare_env' })
  })

  it('purgeCloudflareCache calls Cloudflare API when configured', async () => {
    vi.stubEnv('CLOUDFLARE_ZONE_ID', 'zone123')
    vi.stubEnv('CLOUDFLARE_API_TOKEN', 'token123')

    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', fetchMock)

    const files = ['https://bernardbolter.com/deutsche-stadt']
    const result = await purgeCloudflareCache(files)

    expect(result).toEqual({ ok: true, status: 200 })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.cloudflare.com/client/v4/zones/zone123/purge_cache',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ files }),
      }),
    )
  })
})
