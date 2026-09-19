import { describe, expect, it } from 'vitest'

import {
  formatArtworkDimensionLines,
  formatCoverageLine,
  formatCatalogueStatus,
  resolveCatalogueImageAlt,
  resolveConnectorCardLabel,
  resolveSeriesDisplay,
  resolveVersoDescription,
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

  it('uses descriptionShort, else intent, else nothing', () => {
    expect(
      resolveVersoDescription(
        artwork({ descriptionShort: 'A seated figure in a studio.', intent: 'To sit with doubt.' }),
      ),
    ).toBe('A seated figure in a studio.')
    expect(resolveVersoDescription(artwork({ intent: 'To sit with doubt.' }))).toBe(
      'To sit with doubt.',
    )
    expect(resolveVersoDescription(artwork())).toBeNull()
  })

  it('prefers the series relationship name over the filter fallback', () => {
    const series: FilterCategory[] = [
      { id: '1', slug: 'megacities', name: 'Filter label', color: '#E8453C' },
    ]
    expect(
      resolveSeriesDisplay(
        artwork({
          series: { id: 3, name: 'Megacities', slug: 'megacities' } as Artwork['series'],
        }),
        series,
      )?.name,
    ).toBe('Megacities')
  })

  it('does not slice a long throughline into a card label', () => {
    expect(
      resolveConnectorCardLabel({
        text: 'The city is not a backdrop but the subject, carried from canvas to composite.',
        slug: 'the-city-is-not-a-backdrop-but-the-subject-carried-from-canvas-to-composite',
      }),
    ).toBeNull()
    expect(
      resolveConnectorCardLabel({
        text: 'City as subject.',
        slug: 'city-as-subject',
      }),
    ).toBe('City as subject.')
  })

  it('formats catalogue status from session dates', () => {
    expect(formatCatalogueStatus([])).toBe('Not yet catalogued')
    expect(formatCatalogueStatus(['2026-07-28T12:00:00.000Z'])).toBe('Catalogued July 2026')
    expect(
      formatCatalogueStatus(['2026-07-28T12:00:00.000Z', '2027-07-02T12:00:00.000Z']),
    ).toBe('Last catalogued July 2027')
  })
})
