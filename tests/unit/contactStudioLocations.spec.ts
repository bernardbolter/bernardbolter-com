import { describe, expect, it } from 'vitest'

import { getContactPagePublicLocations, getContactStudioLocations } from '@/lib/contact/contactStudioLocations'
import type { Artist, Media } from '@/payload-types'

const mapMedia: Media = {
  id: 1,
  alt: 'Berlin studio map',
  url: '/media/berlin-map.jpg',
  width: 800,
  height: 500,
  updatedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
}

function artistWithLocations(
  locations: NonNullable<Artist['locations']>,
): Pick<Artist, 'locations'> {
  return { locations }
}

describe('getContactStudioLocations', () => {
  it('returns nothing when no locations qualify', () => {
    expect(
      getContactStudioLocations(
        artistWithLocations([
          {
            id: '1',
            city: 'Berlin',
            country: 'Germany',
            type: 'studio',
            showOnContactPage: false,
            mapImage: mapMedia,
          },
        ]) as Artist,
      ),
    ).toEqual([])
  })

  it('returns a public studio card when flagged and mapped', () => {
    const result = getContactStudioLocations(
      artistWithLocations([
        {
          id: 'berlin',
          city: 'Berlin',
          country: 'Germany',
          type: 'studio',
          showOnContactPage: true,
          streetAddress: 'Charlottenburgerstr. 8a',
          buildingName: 'CANK, 3rd floor',
          mapLinkUrl: 'https://maps.google.com/example',
          mapImage: mapMedia,
        },
      ]) as Artist,
    )

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id: 'berlin',
      city: 'Berlin',
      country: 'Germany',
      streetAddress: 'Charlottenburgerstr. 8a',
      buildingName: 'CANK, 3rd floor',
      mapLinkUrl: 'https://maps.google.com/example',
      mapImageUrl: '/media/berlin-map.jpg',
      mapAlt: 'Map of CANK, 3rd floor',
    })
  })

  it('never returns residence locations even if flagged', () => {
    expect(getContactPagePublicLocations(
        artistWithLocations([
          {
            id: 'home',
            city: 'Berlin',
            country: 'Germany',
            type: 'residence',
            showOnContactPage: true,
            mapImage: mapMedia,
          },
        ]) as Artist,
      ).length,
    ).toBe(0)

    expect(
      getContactStudioLocations(
        artistWithLocations([
          {
            id: 'home',
            city: 'Berlin',
            country: 'Germany',
            type: 'residence',
            showOnContactPage: true,
            mapImage: mapMedia,
          },
        ]) as Artist,
      ),
    ).toEqual([])
  })

  it('skips flagged locations without a resolvable map image', () => {
    expect(
      getContactStudioLocations(
        artistWithLocations([
          {
            id: 'missing-map',
            city: 'San Francisco',
            country: 'USA',
            type: 'studio',
            showOnContactPage: true,
          },
        ]) as Artist,
      ),
    ).toEqual([])
  })
})
