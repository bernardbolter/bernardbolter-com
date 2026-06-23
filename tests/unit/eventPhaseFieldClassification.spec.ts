import { describe, expect, it } from 'vitest'

import {
  isEventPhaseAStagingField,
  isEventReflectiveStagingField,
} from '@/lib/artOfficial/eventPhaseAStaging'

describe('event phase field classification', () => {
  it('treats venue fields as Phase A', () => {
    expect(isEventPhaseAStagingField('venueAddress')).toBe(true)
    expect(isEventReflectiveStagingField('venueAddress')).toBe(false)
  })

  it('treats narrative fields as Phase B reflective', () => {
    expect(isEventPhaseAStagingField('artistNote')).toBe(false)
    expect(isEventReflectiveStagingField('artistNote')).toBe(true)
    expect(isEventReflectiveStagingField('descriptionLong')).toBe(true)
    expect(isEventReflectiveStagingField('practiceArcNote')).toBe(true)
  })
})
