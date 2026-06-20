import { describe, expect, it } from 'vitest'
import { APIError } from 'payload'

import {
  mergeLocationRows,
  validateContactLocations,
} from '@/lib/artist/validateContactLocations'

describe('mergeLocationRows', () => {
  it('keeps mapImage from the saved row when the admin save omits it', () => {
    const original = [
      {
        id: 'berlin',
        type: 'studio',
        mapImage: 42,
        showOnContactPage: false,
      },
    ]
    const incoming = [{ id: 'berlin', showOnContactPage: true }]

    expect(mergeLocationRows(incoming, original)).toEqual([
      {
        id: 'berlin',
        type: 'studio',
        mapImage: 42,
        showOnContactPage: true,
      },
    ])
  })
})

describe('validateContactLocations', () => {
  it('blocks residence locations from the contact page', () => {
    expect(() =>
      validateContactLocations([
        { id: 'home', type: 'residence', showOnContactPage: true, mapImage: 1 },
      ]),
    ).toThrow(APIError)
  })

  it('allows studio locations with a map image', () => {
    expect(() =>
      validateContactLocations([
        { id: 'studio', type: 'studio', showOnContactPage: true, mapImage: 1 },
      ]),
    ).not.toThrow()
  })

  it('allows live-work locations with a map image', () => {
    expect(() =>
      validateContactLocations([
        { id: 'live-work', type: 'live-work', showOnContactPage: true, mapImage: 1 },
      ]),
    ).not.toThrow()
  })
})
