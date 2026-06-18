import { describe, expect, it } from 'vitest'

import {
  calculateGridItemLayout,
  gridItemContainerWidth,
  packArtworksIntoColumns,
  resolveGridColumnSpan,
} from '@/lib/artwork/gridLayout'
import { GRID_SPAN_ASPECT_RATIO_THRESHOLD } from '@/utilities/artworkSizeDisplay'
import type { CatalogueArtwork } from '@/types/frontend'

function artwork(overrides: Partial<CatalogueArtwork> = {}): CatalogueArtwork {
  return {
    id: 1,
    slug: 'test-work',
    title: 'Test Work',
    status: 'published',
    widthPx: 1800,
    heightPx: 900,
    sizeTier: 'lg',
    ...overrides,
  } as CatalogueArtwork
}

describe('gridLayout', () => {
  it('includes inter-column gap in spanning container width', () => {
    expect(gridItemContainerWidth(200, 9, 2)).toBe(409)
    expect(gridItemContainerWidth(200, 9, 1)).toBe(200)
  })

  it('only spans at 3+ columns when aspect ratio meets threshold', () => {
    expect(resolveGridColumnSpan(2, 4)).toBe(2)
    expect(resolveGridColumnSpan(GRID_SPAN_ASPECT_RATIO_THRESHOLD, 3)).toBe(2)
    expect(resolveGridColumnSpan(1.79, 3)).toBe(1)
    expect(resolveGridColumnSpan(2, 2)).toBe(1)
    expect(resolveGridColumnSpan(2, 1)).toBe(1)
  })

  it('derives shorter landscape image heights than portrait at the same column width', () => {
    const landscape = calculateGridItemLayout(artwork({ widthPx: 2000, heightPx: 1000, sizeTier: 'sm' }), 300, 9, 1)
    const portrait = calculateGridItemLayout(artwork({ widthPx: 1000, heightPx: 2000, sizeTier: 'sm' }), 300, 9, 1)

    expect(landscape.dimensions.displayHeight).toBeLessThan(portrait.dimensions.displayHeight)
  })

  it('derives smaller sm-tier landscape than xl-tier landscape at the same column width', () => {
    const small = calculateGridItemLayout(artwork({ widthPx: 2000, heightPx: 1000, sizeTier: 'sm' }), 300, 9, 1)
    const large = calculateGridItemLayout(artwork({ widthPx: 2000, heightPx: 1000, sizeTier: 'xl' }), 300, 9, 1)

    expect(small.dimensions.displayHeight).toBeLessThan(large.dimensions.displayHeight)
    expect(small.dimensions.displayWidth).toBeLessThan(large.dimensions.displayWidth)
  })

  it('places spanning items with a spacer in the adjacent column', () => {
    const wide = artwork({ id: 1, widthPx: 2000, heightPx: 1000 })
    const tall = artwork({ id: 2, widthPx: 900, heightPx: 1800 })
    const columns = packArtworksIntoColumns([wide, tall], 3, 280, 9)

    expect(columns[0][0]?.type).toBe('artwork')
    expect(columns[0][0]?.type === 'artwork' && columns[0][0].layout.columnSpan).toBe(2)
    expect(columns[1][0]?.type).toBe('span-spacer')
  })
})
