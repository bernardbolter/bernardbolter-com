import { describe, expect, it } from 'vitest'

import { dcsTab } from '@/collections/artworks/dcsTabFields'
import { megacitiesTab } from '@/collections/artworks/megacitiesTabFields'

function collectSelectValues(fields: unknown[], path = ''): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  if (!Array.isArray(fields)) return result

  for (const field of fields) {
    if (!field || typeof field !== 'object') continue
    const f = field as Record<string, unknown>
    const name = typeof f.name === 'string' ? f.name : ''
    const nextPath = name ? (path ? `${path}.${name}` : name) : path

    if (f.type === 'select' && Array.isArray(f.options)) {
      result[nextPath] = (f.options as Array<{ value: string }>).map((o) => o.value)
    }
    if (Array.isArray(f.fields)) {
      Object.assign(result, collectSelectValues(f.fields as unknown[], nextPath))
    }
  }
  return result
}

describe('dcsTab', () => {
  it('is visible only for digital-city-series', () => {
    const cond = dcsTab.admin?.condition
    expect(cond?.({ seriesSlug: 'digital-city-series' } as never, {} as never, {} as never)).toBe(
      true,
    )
    expect(cond?.({ seriesSlug: 'megacities' } as never, {} as never, {} as never)).toBe(false)
  })

  it('includes edition tier tierName options', () => {
    const selects = collectSelectValues(dcsTab.fields ?? [])
    expect(selects['dcs.editionTiers.tierName']).toContain('small-print')
    expect(selects['dcs.editionTiers.tierName']).toContain('monumental')
  })
})

describe('megacitiesTab', () => {
  it('is visible only for megacities series', () => {
    const cond = megacitiesTab.admin?.condition
    expect(cond?.({ seriesSlug: 'megacities' } as never, {} as never, {} as never)).toBe(true)
    expect(cond?.({ seriesSlug: 'digital-city-series' } as never, {} as never, {} as never)).toBe(
      false,
    )
  })

  it('includes seriesType and framingType enums', () => {
    const selects = collectSelectValues(megacitiesTab.fields ?? [])
    expect(selects['megacities.series.seriesType']).toContain('composite_country')
    expect(selects['megacities.series.seriesType']).toContain('skate_city')
    expect(selects['megacities.framings.framingType']).toContain('overview_effect')
    expect(selects['megacities.framings.framingType']).toContain('historical_document')
  })
})
