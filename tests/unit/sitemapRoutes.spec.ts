import { describe, expect, it } from 'vitest'

import {
  artworkHasVisionAnalysis,
  latestVisionAnalysisDate,
  seriesLastModified,
  visionPageLastModified,
  type SitemapArtwork,
} from '@/lib/payload/sitemapRoutes'

function artwork(overrides: Partial<SitemapArtwork> = {}): SitemapArtwork {
  return {
    slug: 'test-work',
    updatedAt: '2026-01-01T00:00:00.000Z',
    seriesSlug: 'megacities',
    visionAnalyses: null,
    ...overrides,
  }
}

describe('sitemapRoutes helpers', () => {
  it('detects vision analyses with text', () => {
    expect(artworkHasVisionAnalysis(artwork())).toBe(false)
    expect(
      artworkHasVisionAnalysis(
        artwork({
          visionAnalyses: [{ text: 'A grid of windows.', model: 'claude', date: '2026-02-01' }],
        }),
      ),
    ).toBe(true)
  })

  it('vision lastmod prefers the later of analysis date and artwork updatedAt', () => {
    const row = artwork({
      updatedAt: '2026-03-01T00:00:00.000Z',
      visionAnalyses: [
        { text: 'older', model: 'x', date: '2026-01-15T00:00:00.000Z' },
        { text: 'newer', model: 'x', date: '2026-04-01T00:00:00.000Z' },
      ],
    })
    expect(latestVisionAnalysisDate(row)?.toISOString()).toBe('2026-04-01T00:00:00.000Z')
    expect(visionPageLastModified(row)?.toISOString()).toBe('2026-04-01T00:00:00.000Z')

    const artworkNewer = artwork({
      updatedAt: '2026-05-01T00:00:00.000Z',
      visionAnalyses: [{ text: 'a', model: 'x', date: '2026-04-01T00:00:00.000Z' }],
    })
    expect(visionPageLastModified(artworkNewer)?.toISOString()).toBe('2026-05-01T00:00:00.000Z')
  })

  it('series lastmod uses the newest artwork in that series', () => {
    const artworks = [
      artwork({ slug: 'a', seriesSlug: 'megacities', updatedAt: '2026-01-01T00:00:00.000Z' }),
      artwork({ slug: 'b', seriesSlug: 'megacities', updatedAt: '2026-06-01T00:00:00.000Z' }),
      artwork({ slug: 'c', seriesSlug: 'digital-city-series', updatedAt: '2026-07-01T00:00:00.000Z' }),
    ]
    expect(seriesLastModified('megacities', artworks, '2020-01-01T00:00:00.000Z')?.toISOString()).toBe(
      '2026-06-01T00:00:00.000Z',
    )
    expect(
      seriesLastModified('empty-series', [], '2020-01-01T00:00:00.000Z')?.toISOString(),
    ).toBe('2020-01-01T00:00:00.000Z')
  })
})
