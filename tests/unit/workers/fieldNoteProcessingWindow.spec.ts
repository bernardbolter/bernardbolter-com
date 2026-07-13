import { describe, expect, it } from 'vitest'

import {
  DEFAULT_PROCESSING_END_HOUR,
  DEFAULT_PROCESSING_START_HOUR,
  isWithinProcessingWindow,
  shouldProcessFieldNotesNow,
} from '@/lib/workers/fieldNoteProcessingWindow'

describe('fieldNoteProcessingWindow', () => {
  it('uses 02:00–08:00 defaults', () => {
    expect(DEFAULT_PROCESSING_START_HOUR).toBe(2)
    expect(DEFAULT_PROCESSING_END_HOUR).toBe(8)
  })

  it('is open at 03:00 Berlin time', () => {
    // 2026-07-14 01:00 UTC = 03:00 CEST
    const now = new Date('2026-07-14T01:00:00.000Z')
    expect(
      isWithinProcessingWindow(now, {
        startHour: 2,
        endHour: 8,
        timeZone: 'Europe/Berlin',
      }),
    ).toBe(true)
  })

  it('is closed at 09:00 Berlin time', () => {
    // 2026-07-14 07:00 UTC = 09:00 CEST
    const now = new Date('2026-07-14T07:00:00.000Z')
    expect(
      isWithinProcessingWindow(now, {
        startHour: 2,
        endHour: 8,
        timeZone: 'Europe/Berlin',
      }),
    ).toBe(false)
  })

  it('honours FIELDNOTE_PROCESSING_FORCE', () => {
    const previous = process.env.FIELDNOTE_PROCESSING_FORCE
    process.env.FIELDNOTE_PROCESSING_FORCE = 'true'
    // 09:00 Berlin — normally closed
    const now = new Date('2026-07-14T07:00:00.000Z')
    expect(shouldProcessFieldNotesNow(now)).toBe(true)
    if (previous) process.env.FIELDNOTE_PROCESSING_FORCE = previous
    else delete process.env.FIELDNOTE_PROCESSING_FORCE
  })
})
