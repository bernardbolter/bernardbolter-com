import { describe, expect, it } from 'vitest'

import { formatEventDateRange } from '@/lib/events/formatEventDateRange'

describe('formatEventDateRange', () => {
  it('formats same-year range as Jan – Dec 2020', () => {
    expect(
      formatEventDateRange({
        startDate: '2020-01-01T00:00:00.000Z',
        endDate: '2020-12-13T00:00:00.000Z',
        isOngoing: false,
        yearStart: 2020,
      }),
    ).toBe('Jan – Dec 2020')
  })

  it('formats single-day events', () => {
    expect(
      formatEventDateRange({
        startDate: '2020-11-16T00:00:00.000Z',
        endDate: '2020-11-16T00:00:00.000Z',
        isOngoing: false,
        yearStart: 2020,
      }),
    ).toBe('16 Nov 2020')
  })

  it('renders ongoing end date', () => {
    expect(
      formatEventDateRange({
        startDate: '2020-01-01T00:00:00.000Z',
        endDate: null,
        isOngoing: true,
        yearStart: 2020,
      }),
    ).toBe('Jan 2020 – ongoing')
  })
})
