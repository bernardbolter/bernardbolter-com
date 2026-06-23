import { describe, expect, it } from 'vitest'

import { cvRowFromEvent, cvRowPlainText, educationYearColumn } from '@/lib/cv/cvRowModel'
import type { Event } from '@/payload-types'
import { buildCvJsonLd } from '@/utilities/buildCvJsonLd'

function baseEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 1,
    title: 'Test Event',
    slug: 'test-event',
    eventType: 'solo-exhibition',
    status: 'published',
    startDate: '2020-01-01T00:00:00.000Z',
    updatedAt: '2020-01-01T00:00:00.000Z',
    createdAt: '2020-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('cvRowFromEvent publication rows', () => {
  it('renders publication title once, not duplicated', () => {
    const event = baseEvent({
      eventType: 'publication',
      cvSection: 'publications',
      title: 'Digital City Series - the book',
      cvDisplayTitle: 'Digital City Series - the book',
      publicationTitle: 'Digital City Series - the book',
      yearStart: 2013,
    })

    const row = cvRowFromEvent('publications', event)
    expect(row.kind).toBe('publication')
    if (row.kind !== 'publication') return

    expect(row.articleTitle).toBe('Digital City Series - the book')
    expect(row.publicationName).toBe('Digital City Series - the book')
    expect(cvRowPlainText(row)).toBe('2013 ‘Digital City Series - the book’ in Digital City Series - the book')
    expect(cvRowPlainText(row)).not.toContain('Digital City Series - the book Digital City Series')
  })
})

describe('educationYearColumn', () => {
  it('formats YEAR–YEAR and YEAR–ongoing', () => {
    expect(
      educationYearColumn(
        baseEvent({
          eventType: 'education',
          yearStart: 1998,
          endDate: '2002-06-01T00:00:00.000Z',
        }),
      ),
    ).toBe('1998–2002')

    expect(
      educationYearColumn(
        baseEvent({
          eventType: 'education',
          yearStart: 2010,
          isOngoing: true,
        }),
      ),
    ).toBe('2010–ongoing')
  })
})

describe('buildCvJsonLd', () => {
  it('builds alumniOf from education events and performerIn references', () => {
    const events = [
      baseEvent({
        id: 10,
        eventType: 'education',
        cvSection: 'education',
        venueName: 'Gerrit Rietveld Akademie',
        venueCity: 'Amsterdam',
        venueCountry: 'Netherlands',
        venueWikidataUri: 'https://www.wikidata.org/entity/Q182210',
        yearStart: 1998,
        endDate: '2002-06-01T00:00:00.000Z',
      }),
      baseEvent({
        id: 11,
        eventType: 'solo-exhibition',
        cvSection: 'solo-exhibitions',
        title: 'Megacities',
        slug: 'megacities-2020',
        hasPage: true,
        yearStart: 2020,
        venueName: 'Circylar Gallery',
        venueCity: 'Berlin',
        venueCountry: 'Germany',
      }),
      baseEvent({
        id: 12,
        eventType: 'group-exhibition',
        cvSection: 'group-exhibitions',
        title: 'Herbstsalon, Komm ins Offene!',
        hasPage: false,
        yearStart: 2023,
        venueName: 'Pallaseum',
        venueCity: 'Berlin',
        venueCountry: 'Germany',
      }),
    ]

    const jsonLd = buildCvJsonLd(events, { name: 'Bernard John Bolter IV' } as never, {
      baseUrl: 'https://bernardbolter.com',
    })

    const about = jsonLd.about as Record<string, unknown>
    expect(about['@id']).toBe('https://bernardbolter.com/bio#person')

    const alumniOf = about.alumniOf as Record<string, unknown>[]
    expect(alumniOf).toHaveLength(1)
    expect(alumniOf[0].name).toBe('Gerrit Rietveld Akademie')
    expect(alumniOf[0].sameAs).toBe('https://www.wikidata.org/entity/Q182210')

    const performerIn = about.performerIn as Record<string, unknown>[]
    expect(performerIn).toHaveLength(2)
    expect(performerIn[0]).toEqual({ '@id': 'https://bernardbolter.com/events/megacities-2020' })
    expect(performerIn[1]['@type']).toBe('ExhibitionEvent')
    expect(performerIn[1].name).toBe('Herbstsalon, Komm ins Offene!')
    expect(performerIn[1].startDate).toBe('2023')
  })

  it('excludes education events from performerIn', () => {
    const events = [
      baseEvent({
        id: 20,
        eventType: 'education',
        cvSection: 'education',
        venueName: 'Hoge School voor de Kunsten',
        venueCity: 'Utrecht',
        venueCountry: 'Netherlands',
        yearStart: 1996,
        endDate: '1998-06-01T00:00:00.000Z',
      }),
    ]

    const jsonLd = buildCvJsonLd(events, { name: 'Bernard Bolter' } as never, {
      baseUrl: 'https://bernardbolter.com',
    })
    const about = jsonLd.about as Record<string, unknown>
    expect(about.alumniOf).toHaveLength(1)
    expect(about.performerIn).toHaveLength(0)
  })
})
