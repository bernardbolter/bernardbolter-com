import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  purgeCloudflareCache: vi.fn().mockResolvedValue({ ok: true, status: 200 }),
}))

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
  revalidateTag: mocks.revalidateTag,
}))

vi.mock('@/lib/cache/purgeCloudflare', () => ({
  pathsToAbsoluteUrls: (paths: string[]) => paths.map((p) => `https://example.com${p}`),
  purgeCloudflareCache: mocks.purgeCloudflareCache,
}))

import {
  CORPUS_FEED_PATHS,
  revalidateCorpusFeed,
} from '@/lib/cache/revalidateCorpusFeed'

describe('revalidateCorpusFeed', () => {
  it('busts the shared corpus feed paths plus optional slug/session URLs', () => {
    revalidateCorpusFeed({
      artworkSlug: 'centraal-station-boats',
      sessionId: 'sess-1',
    })

    expect(mocks.revalidateTag).toHaveBeenCalledWith('corpus', 'max')
    for (const path of CORPUS_FEED_PATHS) {
      expect(mocks.revalidatePath).toHaveBeenCalledWith(path)
    }
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/api/corpus/centraal-station-boats')
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      '/api/corpus/centraal-station-boats/sessions',
    )
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/api/corpus/sessions/sess-1')
  })
})
