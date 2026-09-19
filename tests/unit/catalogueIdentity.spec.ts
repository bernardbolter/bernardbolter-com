import { describe, expect, it } from 'vitest'

import {
  formatArtworkDimensionLines,
  formatCoverageLine,
  resolveCatalogueImageAlt,
  resolveSeriesDisplay,
  VERSO_MIN_WIDTH_PX,
} from '@/lib/artwork/catalogueIdentity'
import type { Artwork } from '@/payload-types'
import type { FilterCategory } from '@/types/frontend'

function artwork(overrides: Partial<Artwork> = {}): Artwork {
  return {
    id: 1,
    title: 'The Thinker',
    slug: 'the-thinker',
    status: 'published',
    yearCreated: 2008,
    medium: 'acrylic-on-canvas',
    mediumOther: null,
    seriesSlug: 'megacities',
    measurementType: 'physical',
    widthMm: 500,
    heightMm: 400,
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as Artwork
}

describe('catalogueIdentity', () => {
  it('keeps the verso size floor as a single variable', () => {
    expect(VERSO_MIN_WIDTH_PX).toBe(320)
  })

  it('formats both metric and imperial from millimetres', () => {
    const lines = formatArtworkDimensionLines(artwork())
    expect(lines?.primary).toContain('cm')
    expect(lines?.secondary).toContain('"')
  })

  it('resolves series name from the filter list, not a sliced field', () => {
    const series: FilterCategory[] = [
      { id: '1', slug: 'megacities', name: 'Megacities', color: '#E8453C' },
    ]
    expect(resolveSeriesDisplay(artwork(), series)).toMatchObject({
      slug: 'megacities',
      name: 'Megacities',
      href: '/series/megacities',
    })
  })

  it('does not use title-only alt when year and medium exist', () => {
    const alt = resolveCatalogueImageAlt(artwork())
    expect(alt).not.toBe('The Thinker')
    expect(alt).toContain('The Thinker')
    expect(alt).toContain('2008')
  })

  it('prefers primaryImageAltText over the identity line', () => {
    expect(
      resolveCatalogueImageAlt(
        artwork({ primaryImageAltText: 'A seated bronze figure against a pale ground.' }),
      ),
    ).toBe('A seated bronze figure against a pale ground.')
  })

  it('does not invent a description from a missing short field', () => {
    const alt = resolveCatalogueImageAlt(artwork({ visionAnalyses: [] }))
    expect(alt.includes('…')).toBe(false)
  })

  it('formats the homepage coverage sentence', () => {
    expect(formatCoverageLine(220, 29)).toBe('220 artworks · 29 fully catalogued')
  })
})
