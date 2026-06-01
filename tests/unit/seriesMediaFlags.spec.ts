import { describe, expect, it } from 'vitest'

import { seriesMediaFlagsFromTimeline } from '@/lib/artOfficial/seriesMediaFlags'

describe('seriesMediaFlagsFromTimeline', () => {
  it('detects Megacities and hides other series slots', () => {
    const flags = seriesMediaFlagsFromTimeline([
      { targetCollection: 'artworks', field: 'seriesSlug', value: 'megacities' },
    ])
    expect(flags.isMegacitiesWork).toBe(true)
    expect(flags.isDcsWork).toBe(false)
    expect(flags.isAchWork).toBe(false)
  })

  it('detects DCS from seriesSlug', () => {
    const flags = seriesMediaFlagsFromTimeline([
      { targetCollection: 'artworks', field: 'seriesSlug', value: 'digital-city-series' },
    ])
    expect(flags.isDcsWork).toBe(true)
    expect(flags.isMegacitiesWork).toBe(false)
  })
})
