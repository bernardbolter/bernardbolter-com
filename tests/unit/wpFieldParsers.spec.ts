import { describe, expect, it } from 'vitest'

import {
  matchWpImportEntryByFilename,
  mapMegacitiesSeriesType,
  parseWpAreaKm2,
  parseWpDensityPerKm2,
  parseWpDimension,
  parseWpElevationM,
  parseWpPopulation,
} from '@/lib/artOfficial/wpFieldParsers'
import type { WordpressImportEntry } from '@/lib/artOfficial/wordpressImport.shared'

describe('parseWpDimension', () => {
  it('parses inch marks as inches', () => {
    expect(parseWpDimension('48"', ['metric'])).toEqual({
      whole: 48,
      unit: 'in',
    })
  })

  it('parses metric units as cm', () => {
    expect(parseWpDimension('90', ['metric'])).toEqual({
      whole: 90,
      unit: 'cm',
    })
  })

  it('parses whole plus fraction in inches', () => {
    expect(parseWpDimension('48 3/16"', ['metric'])).toEqual({
      whole: 48,
      fraction: '3/16',
      unit: 'in',
    })
  })

  it('parses meter dimensions as centimeters', () => {
    expect(parseWpDimension('1.5m', ['metric'])).toEqual({
      whole: 150,
      unit: 'cm',
    })
    expect(parseWpDimension('2m', ['metric'])).toEqual({
      whole: 200,
      unit: 'cm',
    })
  })
})

describe('mapMegacitiesSeriesType', () => {
  it('maps legacy style labels', () => {
    expect(
      mapMegacitiesSeriesType({ style: 'composite country portrait' }),
    ).toBe('composite_country')
    expect(
      mapMegacitiesSeriesType({ style: 'composite skateboarding portrait' }),
    ).toBe('skate_city')
    expect(
      mapMegacitiesSeriesType({ country: 'Arab League', medium: 'composite country portrait' }),
    ).toBe('cultural_composite')
  })
})

describe('parseWp city stats', () => {
  it('parses Madrid sample values', () => {
    expect(parseWpPopulation('3,322,416')).toBe(3322416)
    expect(parseWpAreaKm2('604.31 km2 (233.33 sq mi)')).toBe(604.31)
    expect(parseWpDensityPerKm2('5,500/km2 (14,000/sq mi)')).toBe(5500)
    expect(parseWpElevationM('650 m (2,130 ft)')).toBe(650)
  })
})

describe('matchWpImportEntryByFilename', () => {
  const madrid: WordpressImportEntry = {
    id: 233,
    title: 'MADRID spain',
    wpSlug: 'madrid-spain',
    year: 2013,
    medium: 'digital',
    widthWhole: 48,
    widthFraction: null,
    heightWhole: 48,
    heightFraction: null,
    dimensionUnit: 'in',
    seriesName: 'Digital City Series',
    seriesSlug: 'digital-city-series',
    orientation: 'square',
    sizeTier: 'lg',
    availabilityStatus: 'available',
    city: 'Madrid',
    country: 'Spain',
    lat: null,
    lng: null,
    artworkImageUrl:
      'https://artism.org/bolter/wp-content/uploads/2013/02/madrid_lg.jpg',
    streetPhotoCaption: 'Agua Super',
    cityPopulation: 3322416,
    cityAreaKm2: 604.31,
    cityPopulationDensity: 5500,
    cityElevationM: 650,
    coordinatesText: null,
    locationCreatedLabel: null,
    achMapLat: null,
    achMapLng: null,
    achMapPresence: false,
    provenanceNotes: null,
    sourceImageUrls: [],
    storyEn: null,
    gatesOfPerception: false,
    megacitiesSeriesType: null,
    megacitiesStyleLabel: null,
    megacitiesCoverageArea: null,
  }

  it('matches by legacy image filename', () => {
    expect(
      matchWpImportEntryByFilename('madrid_lg.jpg', [madrid], 'digital-city-series'),
    ).toEqual(madrid)
  })

  it('matches by city token in filename', () => {
    expect(
      matchWpImportEntryByFilename('madrid-composite-final.png', [madrid], 'digital-city-series'),
    ).toEqual(madrid)
  })

  it('respects series filter', () => {
    expect(matchWpImportEntryByFilename('madrid_lg.jpg', [madrid], 'megacities')).toBeNull()
  })
})
