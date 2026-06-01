import { describe, expect, it } from 'vitest'

import { ARTWORK_FIELD_CATALOG } from '@/lib/artOfficial/fieldCatalog'
import { computeSessionCoverage } from '@/lib/artOfficial/sessionCoverage'

describe('computeSessionCoverage', () => {
  const baseSession = {
    sessionId: 'sess-test-1',
    sessionType: 'artwork-cataloguing',
    artworkId: '42',
    careerStage: 'studio' as const,
    fieldUpdateTimeline: [
      {
        targetCollection: 'artworks',
        field: 'title',
        value: 'Berlin Wall',
        confidence: 'confirmed',
        source: 'conversation',
        timestamp: '2026-05-01T10:00:00.000Z',
      },
      {
        targetCollection: 'artworks',
        field: 'yearCreated',
        value: 2024,
        confidence: 'inferred',
        source: 'conversation',
        timestamp: '2026-05-01T10:05:00.000Z',
      },
      {
        targetCollection: 'artworks',
        field: 'intent',
        value: 'Memory and division',
        confidence: 'confirmed',
        source: 'conversation',
        timestamp: '2026-05-01T10:30:00.000Z',
      },
      {
        targetCollection: 'artworks',
        field: 'framing',
        value: 'Unframed',
        confidence: 'confirmed',
        source: 'conversation',
        timestamp: '2026-05-01T11:00:00.000Z',
      },
      {
        targetCollection: 'artworks',
        field: 'ach.overlay.overlayColors',
        value: [{ hex: '#000' }],
        confidence: 'inferred',
        source: 'image-analysis',
        timestamp: '2026-05-01T11:05:00.000Z',
      },
    ],
    weakPhases: ['intent'],
    dialogueRefinementFlag: true,
    refinementNotes: 'Intent landed flat.',
  }

  it('assigns all six non-dormant buckets for a studio-tier session', () => {
    const artwork = {
      title: 'Berlin Wall',
      yearCreated: 2024,
      intent: 'Memory and division',
      city: 'Berlin',
      medium: 'acrylic-on-canvas',
      seriesSlug: 'a-colorful-history',
    }

    const report = computeSessionCoverage({
      session: baseSession,
      artwork,
      careerStage: 'studio',
      catalog: ARTWORK_FIELD_CATALOG,
      seriesRecords: [
        { id: 1, slug: 'a-colorful-history', parentSeriesId: null },
      ],
    })

    expect(report.summary.confirmed).toBeGreaterThanOrEqual(1)
    expect(report.summary.inferred).toBeGreaterThanOrEqual(1)
    expect(report.summary.filedDirect).toBeGreaterThanOrEqual(2)
    expect(report.summary.stagedDropped).toBeGreaterThanOrEqual(1)
    expect(report.summary.unaddressed).toBeGreaterThan(0)
    expect(report.summary.dormant).toBeGreaterThan(0)

    const title = report.fields.find((f) => f.field === 'title')
    expect(title?.bucket).toBe('confirmed')

    const year = report.fields.find((f) => f.field === 'yearCreated')
    expect(year?.bucket).toBe('inferred')

    const city = report.fields.find((f) => f.field === 'city')
    expect(city?.bucket).toBe('filed_direct')

    const framing = report.fields.find((f) => f.field === 'framing')
    expect(framing?.bucket).toBe('staged_dropped')

    const clip = report.fields.find((f) => f.field === 'clipEmbedding')
    expect(clip?.bucket).toBe('unaddressed')
    expect(clip?.remediation?.file).toContain('persistArtworkClipEmbedding')

    const sales = report.fields.find((f) => f.field === 'salesRecord')
    expect(sales?.bucket).toBe('dormant')

    // ach.overlay.overlayColors is now in the catalog — it should appear as
    // staged_dropped (in timeline but not in artwork), not as a drift warning.
    expect(report.driftWarnings.some((w) => w.includes('ach.overlay.overlayColors'))).toBe(false)
    const achOverlay = report.fields.find((f) => f.field === 'ach.overlay.overlayColors')
    expect(achOverlay?.bucket).toBe('staged_dropped')
  })

  it('excludes dormant fields from expected and gap lists', () => {
    const report = computeSessionCoverage({
      session: baseSession,
      artwork: null,
      careerStage: 'studio',
      catalog: ARTWORK_FIELD_CATALOG,
    })

    const dormantInAttention = [
      ...report.attention.unaddressed,
      ...report.attention.stagedDropped,
    ].filter((f) => f.bucket === 'dormant')
    expect(dormantInAttention).toEqual([])

    const loan = report.fields.find((f) => f.field === 'loanHistory')
    expect(loan?.bucket).toBe('dormant')
    expect(report.summary.expected).toBe(
      report.fields.filter((f) => f.bucket !== 'dormant').length,
    )
  })

  it('dormants cross-series and non-physical fields for a DCS digital work', () => {
    const report = computeSessionCoverage({
      session: {
        ...baseSession,
        fieldUpdateTimeline: [
          {
            targetCollection: 'artworks',
            field: 'series',
            value: 'digital-city-series',
            confidence: 'confirmed',
            source: 'conversation',
            timestamp: '2026-05-01T09:00:00.000Z',
          },
          {
            targetCollection: 'artworks',
            field: 'dcs.cityContext.cityWikidataUri',
            value: 'https://www.wikidata.org/entity/Q64',
            confidence: 'inferred',
            source: 'knowledge-base',
            timestamp: '2026-05-01T10:00:00.000Z',
          },
        ],
      },
      artwork: {
        seriesSlug: 'digital-city-series',
        medium: 'digital',
        measurementType: ['digital'],
        dcs: { cityContext: { cityWikidataUri: 'https://www.wikidata.org/entity/Q64' } },
      },
      careerStage: 'studio',
      catalog: ARTWORK_FIELD_CATALOG,
      seriesRecords: [
        { id: 1, slug: 'a-colorful-history', parentSeriesId: null },
        { id: 2, slug: 'digital-city-series', parentSeriesId: null },
      ],
    })

    expect(report.fields.find((f) => f.field === 'ach.overlay.overlayColors')?.bucket).toBe(
      'dormant',
    )
    expect(report.fields.find((f) => f.field === 'depthWhole')?.bucket).toBe('dormant')
    expect(report.fields.find((f) => f.field === 'dcs.cityContext.cityWikidataUri')?.bucket).toBe(
      'inferred',
    )
    expect(report.attention.unaddressed.some((f) => f.field.startsWith('ach.'))).toBe(false)
  })

  it('renders timeline-only when artwork is null', () => {
    const report = computeSessionCoverage({
      session: baseSession,
      artwork: null,
      careerStage: 'studio',
      catalog: ARTWORK_FIELD_CATALOG,
    })

    expect(report.artworkId).toBe('42')
    expect(report.fields.length).toBe(ARTWORK_FIELD_CATALOG.length)
    expect(report.summary.stagedDropped).toBeGreaterThan(0)
  })
})
