import { describe, expect, it } from 'vitest'

import {
  normalizeEventPhaseAFieldName,
  normalizeEventPhaseAStagedValue,
} from '@/lib/artOfficial/eventPhaseAStaging'
import { buildEventPatchFromTimeline } from '@/lib/artOfficial/buildEventPatch'

describe('eventPhaseAStaging', () => {
  it('maps venueWebsite alias to venueUrl', () => {
    expect(normalizeEventPhaseAFieldName('venueWebsite')).toBe('venueUrl')
  })

  it('parses venueLatLng from lat, lng string', () => {
    expect(normalizeEventPhaseAStagedValue('venueLatLng', '52.5343456, 13.3795639')).toEqual({
      lat: 52.5343456,
      lng: 13.3795639,
    })
  })

  it('wraps sameAs as uri array', () => {
    expect(
      normalizeEventPhaseAStagedValue(
        'sameAs',
        'http://circylar.com/megacities-satellite-collages-by-bernard-john-bolter-iv/',
      ),
    ).toEqual([
      {
        uri: 'http://circylar.com/megacities-satellite-collages-by-bernard-john-bolter-iv/',
      },
    ])
  })

  it('normalizes endDate to ISO', () => {
    const iso = normalizeEventPhaseAStagedValue('endDate', '2020-12-13T00:00:00.000Z')
    expect(iso).toBe('2020-12-13T00:00:00.000Z')
  })

  it('commits venueLatLng object from timeline', () => {
    const patch = buildEventPatchFromTimeline([
      {
        targetCollection: 'events',
        field: 'venueLatLng',
        value: { lat: 52.5343456, lng: 13.3795639 },
      },
      {
        targetCollection: 'events',
        field: 'venueUrl',
        value: 'http://circylar.com/',
      },
    ])

    expect(patch.venueLatLng).toEqual({ lat: 52.5343456, lng: 13.3795639 })
    expect(patch.venueUrl).toBe('http://circylar.com/')
  })
})
