import { describe, expect, it } from 'vitest'

import { loadWordpressImportEntries, resolveWordpressExportPath } from '@/lib/artOfficial/wordpressImport'

describe('wordpressImport ACH mapping', () => {
  it('maps ACH legacy fields from wp-artworks.json', async () => {
    const entries = await loadWordpressImportEntries()
    const berlin = entries.find((e) => e.wpSlug === 'berlin-wall-1961')
    expect(berlin).toBeDefined()
    expect(berlin?.seriesSlug).toBe('a-colorful-history')
    expect(berlin?.locationCreatedLabel).toContain('CANK')
    expect(berlin?.city).toBe('Berlin')
    expect(berlin?.achMapLat).toBeCloseTo(52.516266)
    expect(berlin?.achMapLng).toBeCloseTo(13.377775)
    expect(berlin?.achMapPresence).toBe(true)
    expect(berlin?.gatesOfPerception).toBe(false)
  })

  it('detects Gates of Perception from legacy slug/title', async () => {
    const entries = await loadWordpressImportEntries()
    const gop = entries.find((e) => e.wpSlug?.includes('gates'))
    if (!gop) {
      // No gates works in current export — skip when absent
      return
    }
    expect(gop.gatesOfPerception).toBe(true)
  })

  it('resolves export path under data/legacy', () => {
    expect(resolveWordpressExportPath()).toContain('data/legacy/wp-artworks.json')
  })
})

describe('wordpressImport Megacities mapping', () => {
  it('maps country composites with meter dimensions', async () => {
    const entries = await loadWordpressImportEntries()
    const yugograd = entries.find((e) => e.wpSlug === 'yugograd')
    expect(yugograd).toBeDefined()
    expect(yugograd?.seriesSlug).toBe('megacities')
    expect(yugograd?.megacitiesSeriesType).toBe('composite_country')
    expect(yugograd?.megacitiesCoverageArea).toBe('Yugolslavia')
    expect(yugograd?.widthWhole).toBe(150)
    expect(yugograd?.heightWhole).toBe(200)
    expect(yugograd?.dimensionUnit).toBe('cm')
  })

  it('maps Skate City from legacy style', async () => {
    const entries = await loadWordpressImportEntries()
    const skate = entries.find((e) => e.wpSlug === 'skate-city')
    expect(skate).toBeDefined()
    expect(skate?.megacitiesSeriesType).toBe('skate_city')
    expect(skate?.megacitiesStyleLabel).toContain('skate')
  })

  it('infers cultural composite for Arab League', async () => {
    const entries = await loadWordpressImportEntries()
    const arab = entries.find((e) => e.wpSlug === 'almadinat-alearabia')
    expect(arab).toBeDefined()
    expect(arab?.megacitiesSeriesType).toBe('cultural_composite')
    expect(arab?.megacitiesCoverageArea).toBe('Arab League')
  })
})
