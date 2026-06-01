import { describe, expect, it } from 'vitest'

import { resolveMediaSlotStates } from '@/lib/artOfficial/stagedMedia'

describe('resolveMediaSlotStates series filters', () => {
  it('shows only Megacities slots when isMegacitiesWork', () => {
    const states = resolveMediaSlotStates({
      timeline: [],
      hasPrimary: true,
      isAchWork: false,
      isDcsWork: false,
      isMegacitiesWork: true,
    })

    const ids = states.map((s) => s.slot.id)
    expect(ids).toContain('megacities-reference')
    expect(ids).toContain('megacities-flag')
    expect(ids).not.toContain('dcs-street')
    expect(ids).not.toContain('ach-source')
  })

  it('hides series-specific slots when series is unknown', () => {
    const states = resolveMediaSlotStates({
      timeline: [],
      hasPrimary: true,
      isAchWork: false,
      isDcsWork: false,
      isMegacitiesWork: false,
    })

    const ids = states.map((s) => s.slot.id)
    expect(ids).toContain('primary')
    expect(ids).not.toContain('megacities-reference')
    expect(ids).not.toContain('dcs-street')
    expect(ids).not.toContain('ach-source')
  })
})
