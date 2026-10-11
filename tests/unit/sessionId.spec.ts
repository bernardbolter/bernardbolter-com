import { describe, expect, it } from 'vitest'

import {
  allocateSessionId,
  buildSessionIdBase,
  sessionIdDatePart,
} from '../../src/lib/sessions/sessionId'

describe('sessionIdDatePart', () => {
  it('formats ISO timestamps as YYYY-MM-DD UTC', () => {
    expect(sessionIdDatePart('2026-08-04T16:24:40.535Z')).toBe('2026-08-04')
  })
})

describe('buildSessionIdBase', () => {
  it('uses artwork slug + completedAt date', () => {
    expect(
      buildSessionIdBase({
        artworkSlug: 'color-theory',
        completedAt: '2026-08-04T12:00:00.000Z',
      }),
    ).toBe('color-theory-2026-08-04')
  })

  it('falls back to session-{date} without artwork', () => {
    expect(
      buildSessionIdBase({
        artworkSlug: null,
        completedAt: '2026-06-11T00:41:15.439Z',
      }),
    ).toBe('session-2026-06-11')
  })
})

describe('allocateSessionId', () => {
  it('appends -2, -3 on collisions', () => {
    const used = new Set(['session-2026-07-31'])
    expect(allocateSessionId('session-2026-07-31', used)).toBe('session-2026-07-31-2')
    used.add('session-2026-07-31-2')
    expect(allocateSessionId('session-2026-07-31', used)).toBe('session-2026-07-31-3')
  })
})
