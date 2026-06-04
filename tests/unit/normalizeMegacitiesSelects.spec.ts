import { describe, expect, it } from 'vitest'

import { normalizeArtworkSelectFields } from '@/lib/artOfficial/normalizeArtworkSelects'
import { normalizeMegacitiesSelectFields } from '@/lib/artOfficial/normalizeMegacitiesSelects'

describe('normalizeMegacitiesSelectFields', () => {
  it('maps main-series to full_series', () => {
    const out = normalizeMegacitiesSelectFields({
      megacities: {
        series: {
          seriesStatus: 'main-series',
          completionStatus: 'full-size-complete',
        },
      },
    })
    expect(out.megacities).toMatchObject({
      series: {
        seriesStatus: 'full_series',
        completionStatus: 'completed_full_size',
      },
    })
  })

  it('maps population ranking prose to largest_by_population', () => {
    const out = normalizeMegacitiesSelectFields({
      megacities: {
        composition: {
          citySelectionCriteria: 'largest cities by population ranking',
        },
      },
    })
    expect(
      (out.megacities as { composition: { citySelectionCriteria: string } }).composition
        .citySelectionCriteria,
    ).toBe('largest_by_population')
  })

  it('strips empty positionInCollage from location rows', () => {
    const out = normalizeMegacitiesSelectFields({
      megacities: {
        composition: {
          locations: [
            { name: 'Berlin', positionInCollage: {} },
            { name: 'Hamburg', positionInCollage: { x: 10, y: 20 } },
          ],
        },
      },
    })
    const locations = (out.megacities as { composition: { locations: unknown[] } }).composition
      .locations as Array<Record<string, unknown>>
    expect(locations[0].positionInCollage).toBeUndefined()
    expect(locations[1].positionInCollage).toEqual({ x: 10, y: 20 })
  })

  it('runs via normalizeArtworkSelectFields on commit path', () => {
    const out = normalizeArtworkSelectFields(
      {
        megacities: { series: { seriesStatus: 'main-series' } },
      },
      { seriesSlug: 'megacities' },
    )
    expect((out.megacities as { series: { seriesStatus: string } }).series.seriesStatus).toBe(
      'full_series',
    )
  })
})
