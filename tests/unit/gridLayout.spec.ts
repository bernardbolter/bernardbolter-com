import { describe, expect, it } from 'vitest'

import { packArtworksIntoColumns } from '@/lib/artwork/gridLayout'
import {
  buildGridItemLayouts,
  CELL_PAD,
  COMPRESSION,
  getAvailableInteriorWidth,
  getDisplayDimensions,
  getGridItemContentHeight,
  getMedianArea,
  getRealAreaMm2,
  getScaleFactor,
  MAX_SCALE,
  MIN_SCALE,
  resolveArtworkAspectRatio,
  resolveArtworkArea,
  TIER_FALLBACK_AREA_MM2,
} from '@/lib/artwork/gridRealSize'
import { getTranslateMaxOffset, getTranslateOffset, TRANSLATE_MAX_OFFSET_PX } from '@/lib/artwork/gridTranslate'
import type { CatalogueArtwork } from '@/types/frontend'

function artwork(overrides: Partial<CatalogueArtwork> = {}): CatalogueArtwork {
  return {
    id: 1,
    slug: 'test-work',
    title: 'Test Work',
    status: 'published',
    widthMm: 700,
    heightMm: 500,
    aspectRatio: 1.4,
    sizeTier: 'lg',
    measurementType: ['physical'],
    ...overrides,
  } as CatalogueArtwork
}

describe('gridRealSize', () => {
  it('derives height from display width and aspect ratio', () => {
    const { displayWidth, displayHeight } = getDisplayDimensions(2, 300, 1)
    expect(displayWidth / displayHeight).toBeCloseTo(2, 1)
  })

  it('scales against available interior width, not full column width', () => {
    const columnWidth = 300
    const available = getAvailableInteriorWidth(columnWidth)
    const { displayWidth } = getDisplayDimensions(1, columnWidth, MAX_SCALE)
    expect(displayWidth).toBeCloseTo(available * MAX_SCALE, 0)
    expect(displayWidth).toBeLessThan(columnWidth)
  })

  it('clamps median-area portrait works at MAX_SCALE when raw exceeds the ceiling', () => {
    expect(getScaleFactor(500_000, 500_000, 1)).toBe(MAX_SCALE)
  })

  it('boosts landscape scale factor relative to portrait at the same area', () => {
    const portrait = getScaleFactor(200_000, 500_000, 0.75)
    const landscape = getScaleFactor(200_000, 500_000, 1.5)
    expect(landscape).toBeGreaterThan(portrait)
  })

  it('clamps scale factor to configured bounds', () => {
    expect(getScaleFactor(1, 500_000, 1)).toBe(MIN_SCALE)
    expect(getScaleFactor(1_000_000_000, 500_000, 1)).toBe(MAX_SCALE)
  })

  it('includes cell padding in masonry content height', () => {
    const contentHeight = getGridItemContentHeight(100)
    expect(contentHeight).toBe(100 + 2 * CELL_PAD + 26)
  })

  it('renders landscape wider than portrait at identical real area', () => {
    const anchor = artwork({ id: 3, widthMm: 900, heightMm: 900 })
    const landscape = buildGridItemLayouts(
      [
        artwork({ id: 1, widthMm: 400, heightMm: 280, aspectRatio: 400 / 280 }),
        artwork({ id: 2, widthMm: 280, heightMm: 400, aspectRatio: 280 / 400 }),
        anchor,
        artwork({ id: 4, widthMm: 900, heightMm: 900 }),
      ],
      320,
    )[0]
    const portrait = buildGridItemLayouts(
      [
        artwork({ id: 1, widthMm: 400, heightMm: 280, aspectRatio: 400 / 280 }),
        artwork({ id: 2, widthMm: 280, heightMm: 400, aspectRatio: 280 / 400 }),
        anchor,
        artwork({ id: 4, widthMm: 900, heightMm: 900 }),
      ],
      320,
    )[1]

    expect(landscape.displayWidth).toBeGreaterThan(portrait.displayWidth)
  })

  it('recalculates median against the filtered subset', () => {
    const a = artwork({ id: 1, widthMm: 400, heightMm: 400 })
    const b = artwork({ id: 2, widthMm: 600, heightMm: 600 })
    const outlier = artwork({ id: 3, widthMm: 3000, heightMm: 2000 })

    const filteredMedian = getMedianArea([getRealAreaMm2(a)!, getRealAreaMm2(b)!])
    const fullMedian = getMedianArea([
      getRealAreaMm2(a)!,
      getRealAreaMm2(b)!,
      getRealAreaMm2(outlier)!,
    ])

    expect(filteredMedian).not.toBe(fullMedian)
    expect(buildGridItemLayouts([a, b], 300)[0].scaleFactor).not.toBe(
      buildGridItemLayouts([a, b, outlier], 300)[0].scaleFactor,
    )
  })

  it('uses tier fallback area when no dimensions are available', () => {
    const resolved = resolveArtworkArea(
      artwork({ widthMm: null, heightMm: null, sizeTier: 'sm', measurementType: ['physical'] }),
    )
    expect(resolved.areaMm2).toBe(TIER_FALLBACK_AREA_MM2.sm)
    expect(resolved.usingFallbackSizing).toBe(true)
  })

  it('keeps compression gentle', () => {
    expect(1 + Math.log(2) * COMPRESSION).toBeLessThan(1.2)
  })

  it('corrects inverted aspect ratio for landscape video metadata', () => {
    const ratio = resolveArtworkAspectRatio({
      aspectRatio: 540 / 960,
      orientation: 'landscape',
      widthPx: null,
      heightPx: null,
      widthMm: null,
      heightMm: null,
      primaryImage: null,
      posterImage: null,
    })
    expect(ratio).toBeCloseTo(960 / 540, 2)
  })

  it('prefers poster dimensions over a mismatched stored aspect ratio', () => {
    const ratio = resolveArtworkAspectRatio({
      aspectRatio: 0.5,
      orientation: 'landscape',
      widthPx: 960,
      heightPx: 540,
      widthMm: null,
      heightMm: null,
      primaryImage: null,
      posterImage: null,
    })
    expect(ratio).toBeCloseTo(960 / 540, 2)
  })
})

describe('gridLayout', () => {
  it('packs every item into a single column slot', () => {
    const layouts = buildGridItemLayouts(
      [
        artwork({ id: 1, sizeTier: 'xl' }),
        artwork({ id: 2, sizeTier: 'lg', orientation: 'landscape' }),
        artwork({ id: 3, sizeTier: 'sm' }),
      ],
      280,
    )
    const columns = packArtworksIntoColumns(layouts, 3, 9)
    const placed = columns.flat()

    expect(placed).toHaveLength(3)
    expect(placed.every((layout) => layout.columnWidth === 280)).toBe(true)
  })
})

describe('gridTranslate', () => {
  it('returns stable offsets for the same artwork id', () => {
    const first = getTranslateOffset('artwork-42')
    const second = getTranslateOffset('artwork-42')
    expect(first).toEqual(second)
  })

  it('keeps offsets within the configured cap', () => {
    const maxOffset = getTranslateMaxOffset(20)
    const { x, y } = getTranslateOffset(99, 20)
    expect(maxOffset).toBe(TRANSLATE_MAX_OFFSET_PX)
    expect(Math.abs(x)).toBeLessThanOrEqual(maxOffset)
    expect(Math.abs(y)).toBeLessThanOrEqual(maxOffset)
  })
})
