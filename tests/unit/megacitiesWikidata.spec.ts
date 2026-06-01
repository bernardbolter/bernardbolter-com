import { describe, expect, it } from 'vitest'

import {
  applyWikidataToMegacitiesLocation,
  mergeMegacitiesLocationWikidata,
} from '@/lib/artOfficial/megacitiesWikidata'

describe('megacitiesWikidata', () => {
  it('merges Wikidata facts into an existing location row', () => {
    const next = mergeMegacitiesLocationWikidata(
      [{ name: 'Berlin', country: 'Germany', citySelectionNote: 'Capital' }],
      'Berlin',
      {
        id: 'Q64',
        uri: 'https://www.wikidata.org/entity/Q64',
        population: 3664088,
        populationYear: '2021',
        coordinates: { lat: 52.52, lng: 13.405 },
      },
    )

    expect(next).toHaveLength(1)
    expect(next[0]).toMatchObject({
      name: 'Berlin',
      country: 'Germany',
      citySelectionNote: 'Capital',
      wikidataUri: 'https://www.wikidata.org/entity/Q64',
      population: 3664088,
      populationYear: '2021',
      coordinates: { lat: 52.52, lng: 13.405 },
    })
  })

  it('appends a new row when the city name is not found', () => {
    const next = mergeMegacitiesLocationWikidata([], 'Hamburg', {
      id: 'Q1055',
      uri: 'https://www.wikidata.org/entity/Q1055',
      label: 'Hamburg',
      population: 1900000,
    })

    expect(next).toHaveLength(1)
    expect(next[0].name).toBe('Hamburg')
    expect(next[0].wikidataUri).toContain('Q1055')
  })

  it('does not overwrite artist-provided population', () => {
    const row = applyWikidataToMegacitiesLocation(
      { name: 'Kyiv', population: 2900000, populationYear: '2020' },
      {
        id: 'Q1899',
        uri: 'https://www.wikidata.org/entity/Q1899',
        population: 2960000,
        populationYear: '2022',
      },
    )

    expect(row.population).toBe(2900000)
    expect(row.populationYear).toBe('2020')
    expect(row.wikidataUri).toContain('Q1899')
  })
})
