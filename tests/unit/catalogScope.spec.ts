import { describe, expect, it } from 'vitest'

import type { CatalogField } from '@/lib/artOfficial/fieldCatalog'
import {
  artworkIsPhysical,
  artworkMatchesAchSeries,
  artworkMatchesDcsSeries,
  artworkMatchesMegacitiesSeries,
  buildArtworkCoverageContext,
  isFieldExpectedForArtwork,
  resolveArtworkSeriesSlug,
} from '@/lib/artOfficial/catalogScope'
import type { SeriesRecord } from '@/lib/artOfficial/seriesSlugs'

const seriesRecords: SeriesRecord[] = [
  { id: 1, slug: 'a-colorful-history', parentSeriesId: null },
  { id: 2, slug: 'gates-of-perception', parentSeriesId: 1 },
  { id: 3, slug: 'digital-city-series', parentSeriesId: null },
  { id: 4, slug: 'megacities', parentSeriesId: null },
]

describe('catalogScope', () => {
  it('resolves series slug from artwork and timeline', () => {
    expect(
      resolveArtworkSeriesSlug({ seriesSlug: 'digital-city-series' }, []),
    ).toBe('digital-city-series')
    expect(
      resolveArtworkSeriesSlug(null, [
        {
          targetCollection: 'artworks',
          field: 'series',
          value: 'digital-city-series',
          timestamp: '2026-05-01T10:00:00.000Z',
        },
      ]),
    ).toBe('digital-city-series')
  })

  it('matches ACH root and descendant series', () => {
    const achCtx = buildArtworkCoverageContext({
      artwork: { seriesSlug: 'gates-of-perception' },
      seriesRecords,
    })
    expect(artworkMatchesAchSeries(achCtx)).toBe(true)
    expect(artworkMatchesDcsSeries(achCtx)).toBe(false)
  })

  it('matches DCS series only for digital-city-series slug', () => {
    const dcsCtx = buildArtworkCoverageContext({
      artwork: { seriesSlug: 'digital-city-series', medium: 'digital' },
      seriesRecords,
    })
    expect(artworkMatchesDcsSeries(dcsCtx)).toBe(true)
    expect(artworkMatchesAchSeries(dcsCtx)).toBe(false)
  })

  it('treats digital works as non-physical', () => {
    const digital = buildArtworkCoverageContext({
      artwork: { medium: 'digital', measurementType: ['digital'] },
    })
    expect(artworkIsPhysical(digital)).toBe(false)

    const physical = buildArtworkCoverageContext({
      artwork: { medium: 'acrylic-on-canvas', measurementType: ['physical'] },
    })
    expect(artworkIsPhysical(physical)).toBe(true)
  })

  it('dormants physical volume fields for DCS when medium is still a canvas default', () => {
    const dcsCtx = buildArtworkCoverageContext({
      artwork: {
        seriesSlug: 'digital-city-series',
        medium: 'mixed-media-on-canvas',
        measurementType: ['physical'],
      },
      seriesRecords,
    })

    const depthField: CatalogField = {
      field: 'depthWhole',
      category: 'middle-practical',
      layer: 'artist',
      tier: 'studio',
      mediumScope: 'physical',
    }

    expect(isFieldExpectedForArtwork(depthField, 'studio', dcsCtx)).toBe(false)
  })

  it('matches Megacities series only for megacities slug', () => {
    const megCtx = buildArtworkCoverageContext({
      artwork: { seriesSlug: 'megacities', medium: 'photo-collage' },
      seriesRecords,
    })
    expect(artworkMatchesMegacitiesSeries(megCtx)).toBe(true)
    expect(artworkMatchesDcsSeries(megCtx)).toBe(false)
    expect(artworkMatchesAchSeries(megCtx)).toBe(false)
  })

  it('dormants physical volume fields for Megacities photo-collage works', () => {
    const megCtx = buildArtworkCoverageContext({
      artwork: {
        seriesSlug: 'megacities',
        medium: 'photo-collage',
        measurementType: ['physical'],
      },
      seriesRecords,
    })

    const depthField: CatalogField = {
      field: 'depthWhole',
      category: 'middle-practical',
      layer: 'artist',
      tier: 'studio',
      mediumScope: 'physical',
    }

    expect(isFieldExpectedForArtwork(depthField, 'studio', megCtx)).toBe(false)
  })

  it('expects megacities fields only for megacities series', () => {
    const megCtx = buildArtworkCoverageContext({
      artwork: { seriesSlug: 'megacities', medium: 'photo-collage' },
      seriesRecords,
    })
    const dcsCtx = buildArtworkCoverageContext({
      artwork: { seriesSlug: 'digital-city-series', medium: 'digital' },
      seriesRecords,
    })

    const megField: CatalogField = {
      field: 'megacities.series.seriesType',
      category: 'series-specific',
      layer: 'artist',
      tier: 'studio',
      seriesScope: 'megacities',
    }
    const dcsField: CatalogField = {
      field: 'dcs.cityContext.cityWikidataUri',
      category: 'series-specific',
      layer: 'agent',
      tier: 'studio',
    }

    expect(isFieldExpectedForArtwork(megField, 'studio', megCtx)).toBe(true)
    expect(isFieldExpectedForArtwork(megField, 'studio', dcsCtx)).toBe(false)
    expect(isFieldExpectedForArtwork(dcsField, 'studio', megCtx)).toBe(false)
  })

  it('dormants ACH fields for DCS works and vice versa', () => {
    const dcsCtx = buildArtworkCoverageContext({
      artwork: { seriesSlug: 'digital-city-series', medium: 'digital' },
      seriesRecords,
    })

    const achField: CatalogField = {
      field: 'ach.overlay.overlayColors',
      category: 'series-specific',
      layer: 'agent',
      tier: 'studio',
    }
    const dcsField: CatalogField = {
      field: 'dcs.cityContext.cityWikidataUri',
      category: 'series-specific',
      layer: 'agent',
      tier: 'studio',
    }
    const depthField: CatalogField = {
      field: 'depthWhole',
      category: 'middle-practical',
      layer: 'artist',
      tier: 'studio',
      mediumScope: 'physical',
    }

    expect(isFieldExpectedForArtwork(achField, 'studio', dcsCtx)).toBe(false)
    expect(isFieldExpectedForArtwork(dcsField, 'studio', dcsCtx)).toBe(true)
    expect(isFieldExpectedForArtwork(depthField, 'studio', dcsCtx)).toBe(false)
  })
})
