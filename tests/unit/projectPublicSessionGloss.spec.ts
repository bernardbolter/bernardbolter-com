import { describe, expect, it } from 'vitest'

import { projectPublicSessionGloss } from '@/lib/corpus/projectPublicSessionGloss'
import type { Session } from '@/payload-types'

describe('projectPublicSessionGloss', () => {
  it('keeps timeline field names and drops values', () => {
    const projected = projectPublicSessionGloss({
      id: 1,
      sessionId: 'test-session',
      status: 'completed',
      sessionType: 'artwork-cataloguing',
      fieldUpdateTimeline: [
        {
          field: 'currentLocation.locationDetail',
          value: '27th Ave studio, San Francisco',
        },
      ],
      priorFieldConflicts: [
        {
          field: 'currentLocation',
          priorValue: { locationDetail: '27th Ave' },
          newValue: { locationDetail: 'Berlin' },
        },
      ],
    } as Session)

    expect(projected.fieldUpdateTimeline).toEqual([
      { field: 'currentLocation.locationDetail' },
    ])
    expect(JSON.stringify(projected)).not.toContain('27th Ave')
    expect(projected.priorFieldConflicts).toEqual([{ field: 'currentLocation' }])
  })
})
