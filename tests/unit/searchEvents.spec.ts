import { describe, expect, it } from 'vitest'

import type { Event } from '@/payload-types'
import { rankEventSearchCandidates } from '@/lib/artOfficial/searchEvents'
import {
  parseToolArgs,
  TOOL_CREATE_EVENT_STUB,
  TOOL_LINK_ARTWORK_TO_EVENT,
  TOOL_SEARCH_EVENTS,
} from '@/lib/artOfficial/agentTools'

type EventSearchRow = Pick<
  Event,
  | 'id'
  | 'slug'
  | 'title'
  | 'venueName'
  | 'venueCity'
  | 'yearStart'
  | 'eventType'
  | 'enrichmentStatus'
>

describe('rankEventSearchCandidates', () => {
  const herbstsalon: EventSearchRow = {
    id: 1,
    slug: 'herbstsalon-im-fruehling-2023-berlin',
    title: 'Herbstsalon im Frühling',
    venueName: 'ZWITSCHERMASCHINE / Pallasseum',
    venueCity: 'Berlin',
    yearStart: 2023,
    eventType: 'group-exhibition',
    enrichmentStatus: 'stub',
  }

  const otherShow: EventSearchRow = {
    id: 2,
    slug: 'vesuvios-2020',
    title: 'Show at Vesuvios',
    venueName: 'Vesuvios',
    venueCity: 'Berlin',
    yearStart: 2020,
    eventType: 'group-exhibition',
    enrichmentStatus: 'stub',
  }

  it('finds Herbstsalon from misspelled / partial "herbst salon pallaseum"', () => {
    const result = rankEventSearchCandidates([herbstsalon, otherShow], {
      titleKeywords: 'herbst salon pallaseum',
      yearApprox: 2022,
    })
    expect(result.candidates.length).toBeGreaterThanOrEqual(1)
    expect(result.candidates[0]?.slug).toBe(herbstsalon.slug)
    expect(result.candidates[0]?.score).toBeGreaterThan(0)
  })

  it('tolerates ±1 year', () => {
    const result = rankEventSearchCandidates([herbstsalon], {
      titleKeywords: 'Herbstsalon',
      yearApprox: 2022,
    })
    expect(result.candidates).toHaveLength(1)
  })

  it('excludes years outside ±1', () => {
    const result = rankEventSearchCandidates([herbstsalon], {
      titleKeywords: 'Herbstsalon',
      yearApprox: 2019,
    })
    expect(result.candidates).toHaveLength(0)
  })

  it('flags possibleDuplicates when two close matches exist', () => {
    const dup = {
      ...herbstsalon,
      id: 3,
      slug: 'herbst-salon-2022',
      title: 'Herbst Salon',
      venueName: 'Zwitschermachine',
      yearStart: 2022,
    }
    const result = rankEventSearchCandidates([herbstsalon, dup], {
      titleKeywords: 'herbst salon',
      venueKeywords: 'zwitscher',
    })
    expect(result.candidates.length).toBeGreaterThanOrEqual(2)
    expect(result.possibleDuplicates).toBe(true)
    expect(result.note).toMatch(/duplicate/i)
  })

  it('never returns a silent single auto-pick note when multiple candidates', () => {
    const near = {
      ...otherShow,
      id: 4,
      slug: 'herbst-ish',
      title: 'Autumn Salon Nearby',
      venueName: 'Palladium Studios',
      yearStart: 2023,
    }
    const result = rankEventSearchCandidates([herbstsalon, near], {
      titleKeywords: 'salon',
      yearApprox: 2023,
    })
    if (result.candidates.length > 1) {
      expect(result.note).toBeTruthy()
    }
  })
})

describe('event linking tool schemas', () => {
  it('accepts search_events with partial args', () => {
    const result = parseToolArgs(TOOL_SEARCH_EVENTS, {
      venueKeywords: 'pallaseum',
      yearApprox: 2023,
    })
    expect(result.ok).toBe(true)
  })

  it('rejects empty search_events', () => {
    const result = parseToolArgs(TOOL_SEARCH_EVENTS, {})
    expect(result.ok).toBe(false)
  })

  it('accepts create_event_stub required fields', () => {
    const result = parseToolArgs(TOOL_CREATE_EVENT_STUB, {
      eventType: 'group-exhibition',
      title: 'Herbstsalon im Frühling',
      yearStart: 2023,
      venueName: 'ZWITSCHERMASCHINE',
      venueCity: 'Berlin',
    })
    expect(result.ok).toBe(true)
  })

  it('accepts link_artwork_to_event', () => {
    const result = parseToolArgs(TOOL_LINK_ARTWORK_TO_EVENT, {
      eventSlug: 'herbstsalon-im-fruehling-2023-berlin',
    })
    expect(result.ok).toBe(true)
  })
})
