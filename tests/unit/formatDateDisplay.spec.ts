import { describe, expect, it } from 'vitest'

import { formatDateDisplay } from '@/lib/artOfficial/formatDateDisplay'

describe('formatDateDisplay', () => {
  it('formats exact dates', () => {
    expect(
      formatDateDisplay({
        datePrecision: 'exact',
        yearCreated: 2019,
        dateKnown: '2019-03-15',
      }),
    ).toBe('15 March 2019')
  })

  it('formats circa', () => {
    expect(
      formatDateDisplay({
        datePrecision: 'circa',
        yearCreated: 2019,
      }),
    ).toBe('c. 2019')
  })

  it('formats decade', () => {
    expect(
      formatDateDisplay({
        datePrecision: 'decade',
        yearCreated: 2017,
      }),
    ).toBe('2010s')
  })

  it('formats year range', () => {
    expect(
      formatDateDisplay({
        datePrecision: 'year',
        yearCreated: 2010,
        yearCompleted: 2012,
      }),
    ).toBe('2010–2012')
  })

  it('uses bounds when unknown', () => {
    expect(
      formatDateDisplay({
        datePrecision: 'unknown',
        yearCreated: 2010,
        dateEarliest: '2008-01-01',
        dateLatest: '2012-12-31',
      }),
    ).toBe('2008–2012')
  })
})
