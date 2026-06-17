import { describe, expect, it } from 'vitest'

import {
  formatCatalogueNumber,
  seriesCodeFromSlug,
  seriesIdsInTopLevelTree,
  type SeriesTreeRow,
} from '@/lib/artwork/catalogueNumber'

describe('formatCatalogueNumber', () => {
  it('formats prefix, series code, year, and zero-padded sequence', () => {
    expect(
      formatCatalogueNumber({
        prefix: 'bb',
        seriesCode: 'ach',
        year: 2019,
        sequence: 3,
      }),
    ).toBe('BB-ACH-2019-003')
  })

  it('defaults prefix to BB and series code to GEN when empty', () => {
    expect(
      formatCatalogueNumber({
        seriesCode: '',
        year: 2020,
        sequence: 1,
      }),
    ).toBe('BB-GEN-2020-001')
  })
})

describe('seriesCodeFromSlug', () => {
  it('uses mapped initials for known series slugs', () => {
    expect(seriesCodeFromSlug('a-colorful-history')).toBe('ACH')
  })

  it('falls back to first letters of hyphenated slug', () => {
    expect(seriesCodeFromSlug('some-new-series')).toBe('SNS')
  })
})

describe('seriesIdsInTopLevelTree', () => {
  const rows: SeriesTreeRow[] = [
    { id: 1, slug: 'a-colorful-history', parentSeriesId: null },
    { id: 2, slug: 'mediums-of-perception', parentSeriesId: 1 },
    { id: 15, slug: 'gates-of-perception', parentSeriesId: 1 },
  ]

  it('includes sibling sub-series under the same ACH root', () => {
    expect(seriesIdsInTopLevelTree(rows, 15).sort((a, b) => a - b)).toEqual([1, 2, 15])
  })

  it('includes only the root when querying the parent series', () => {
    expect(seriesIdsInTopLevelTree(rows, 1).sort((a, b) => a - b)).toEqual([1, 2, 15])
  })
})
