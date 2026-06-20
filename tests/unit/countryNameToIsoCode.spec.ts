import { describe, expect, it } from 'vitest'

import { countryNameToIsoCode } from '@/utilities/countryNameToIsoCode'

describe('countryNameToIsoCode', () => {
  it('maps common country names to ISO alpha-2', () => {
    expect(countryNameToIsoCode('Germany')).toBe('DE')
    expect(countryNameToIsoCode('USA')).toBe('US')
    expect(countryNameToIsoCode('United States')).toBe('US')
  })

  it('passes through existing alpha-2 codes', () => {
    expect(countryNameToIsoCode('de')).toBe('DE')
    expect(countryNameToIsoCode('US')).toBe('US')
  })

  it('returns undefined for unknown values', () => {
    expect(countryNameToIsoCode('Atlantis')).toBeUndefined()
    expect(countryNameToIsoCode('')).toBeUndefined()
  })
})
