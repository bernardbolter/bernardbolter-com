import { describe, expect, it } from 'vitest'

import { fetchArtworksForPicker } from '@/lib/artOfficial/fetchArtworksForPicker'

describe('fetchArtworksForPicker', () => {
  it('builds a Payload REST query with OR clauses', async () => {
    const originalFetch = global.fetch
    let capturedUrl = ''

    global.fetch = async (input) => {
      capturedUrl = String(input)
      return new Response(
        JSON.stringify({
          docs: [
            {
              id: 230,
              title: 'Skate City',
              slug: 'skate-city',
              yearCreated: 2020,
              series: { name: 'Megacities' },
              primaryImage: { url: 'https://example.com/skate.jpg' },
            },
          ],
        }),
        { status: 200 },
      )
    }

    try {
      const docs = await fetchArtworksForPicker('skate', 12)
      expect(capturedUrl).toContain('/api/artworks?')
      expect(capturedUrl).toContain('where%5Bor%5D%5B1%5D%5Bslug%5D%5Bcontains%5D=skate')
      expect(docs).toEqual([
        {
          id: 230,
          title: 'Skate City',
          slug: 'skate-city',
          yearCreated: 2020,
          seriesTitle: 'Megacities',
          thumbnailUrl: 'https://example.com/skate.jpg',
        },
      ])
    } finally {
      global.fetch = originalFetch
    }
  })
})
