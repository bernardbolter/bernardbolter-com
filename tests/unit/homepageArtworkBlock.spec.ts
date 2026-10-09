import { describe, expect, it } from 'vitest'

import {
  formatArtworkDimensionLines,
  resolveCatalogueImageAlt,
  resolveSeriesDisplay,
  resolveVersoDescription,
} from '@/lib/artwork/catalogueIdentity'
import type { CatalogueClientRow, FilterCategory } from '@/types/frontend'

/**
 * Homepage acceptance (Phase A): identity fields that must appear in the
 * per-work HTML block. Rendered by ArtworkBlock from these helpers — if the
 * helpers omit a field, the SSR source will too.
 */
describe('homepage artwork block fields', () => {
  const work = {
    id: 7,
    title: 'The Thinker',
    slug: 'the-thinker',
    status: 'published',
    yearCreated: 1993,
    medium: 'oil-on-canvas',
    mediumOther: null,
    seriesSlug: 'og-oil-paintings',
    measurementType: 'physical',
    widthMm: 610,
    heightMm: 910,
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
  } as unknown as CatalogueClientRow

  const series: FilterCategory[] = [
    { id: 'og', slug: 'og-oil-paintings', name: 'OG Oil Paintings', color: '#395B0E' },
  ]

  it('supplies title, year, series name, medium, and both-unit dimensions', () => {
    const dims = formatArtworkDimensionLines(work)
    const seriesDisplay = resolveSeriesDisplay(work, series)

    expect(work.title).toBe('The Thinker')
    expect(work.yearCreated).toBe(1993)
    expect(seriesDisplay?.name).toBe('OG Oil Paintings')
    expect(seriesDisplay?.href).toBe('/series/og-oil-paintings')
    expect(dims?.primary).toMatch(/cm/)
    expect(dims?.secondary).toMatch(/"/)
  })

  it('does not duplicate the title as alt text', () => {
    const alt = resolveCatalogueImageAlt(work)
    expect(alt).not.toBe(work.title)
    expect(alt).toContain('The Thinker')
    expect(alt).toContain('1993')
  })

  it('keeps verso description empty when short and intent are absent', () => {
    expect(resolveVersoDescription(work)).toBeNull()
  })
})
