import { describe, expect, it } from 'vitest'

import {
  artworkAchBeforeChange,
  artworkAchValidateAr,
  buildSourceCredit,
  parseApproximateDateYear,
} from '@/hooks/artworkAch'

describe('parseApproximateDateYear', () => {
  it('extracts the earliest year from a free-form string', () => {
    expect(parseApproximateDateYear('c. 1861')).toBe(1861)
    expect(parseApproximateDateYear('1895–1900')).toBe(1895)
    expect(parseApproximateDateYear('1861-08-22')).toBe(1861)
    expect(parseApproximateDateYear('between 1900 and 1885')).toBe(1885)
  })

  it('returns null when no year is parseable', () => {
    expect(parseApproximateDateYear('undated')).toBe(null)
    expect(parseApproximateDateYear(null)).toBe(null)
    expect(parseApproximateDateYear(undefined)).toBe(null)
    expect(parseApproximateDateYear(123)).toBe(null)
  })
})

describe('buildSourceCredit', () => {
  it('assembles the standard "Creator, Title, Date. Institution. License." format', () => {
    expect(
      buildSourceCredit({
        sourceCreator: 'Robert Capa',
        sourceTitle: 'D-Day landings',
        approximateDate: '1944',
        sourceInstitution: 'Magnum Photos',
        sourceLicense: 'cc-by',
      }),
    ).toBe('Robert Capa, D-Day landings, 1944. Magnum Photos. cc-by.')
  })

  it('drops missing pieces silently', () => {
    expect(
      buildSourceCredit({
        sourceCreator: 'Anonymous',
        approximateDate: 'c. 1900',
      }),
    ).toBe('Anonymous, c. 1900.')
  })

  it('returns null when nothing is present', () => {
    expect(buildSourceCredit(null)).toBe(null)
    expect(buildSourceCredit({})).toBe(null)
  })
})

describe('artworkAchBeforeChange', () => {
  it('computes Berlin placeholder color from base city', async () => {
    const data: Record<string, unknown> = { city: 'Berlin', ach: {} }
    artworkAchBeforeChange({
      data,
      operation: 'create' as const,
      collection: {} as any,
      context: {} as any,
      req: {} as any,
    } as any)
    expect((data.ach as any).mapAndTour.cityPlaceholderColor).toBe('#A8D6E8')
  })

  it('falls back to neutral hex when city is unknown', () => {
    const data: Record<string, unknown> = { city: 'Tokyo', ach: {} }
    artworkAchBeforeChange({
      data,
      operation: 'create',
      collection: {} as any,
      context: {} as any,
      req: {} as any,
    } as any)
    expect((data.ach as any).mapAndTour.cityPlaceholderColor).toBe('#F4F2EE')
  })

  it('computes approximateDateYear and sourceCredit from structured source fields', () => {
    const data: Record<string, unknown> = {
      city: 'San Francisco',
      ach: {
        sourcePhotograph: {
          sourceCreator: 'Eadweard Muybridge',
          sourceTitle: 'Panorama of San Francisco from Mark Hopkins Mansion',
          approximateDate: 'c. 1878',
          sourceInstitution: 'San Francisco Public Library',
          sourceLicense: 'public-domain',
        },
      },
    }
    artworkAchBeforeChange({
      data,
      operation: 'create',
      collection: {} as any,
      context: {} as any,
      req: {} as any,
    } as any)
    const source = (data.ach as any).sourcePhotograph
    expect(source.approximateDateYear).toBe(1878)
    expect(source.sourceCredit).toBe(
      'Eadweard Muybridge, Panorama of San Francisco from Mark Hopkins Mansion, c. 1878. San Francisco Public Library. public-domain.',
    )
  })

  it('pre-fills arButtonColors from overlayColors when arButtonColors is empty', () => {
    const data: Record<string, unknown> = {
      city: 'Berlin',
      ach: {
        overlay: {
          overlayColors: [{ hex: '#111' }, { hex: '#222' }, { hex: '#333' }],
        },
        ar: {},
      },
    }
    artworkAchBeforeChange({
      data,
      operation: 'create',
      collection: {} as any,
      context: {} as any,
      req: {} as any,
    } as any)
    expect((data.ach as any).ar.arButtonColors).toEqual([
      { hex: '#111' },
      { hex: '#222' },
      { hex: '#333' },
    ])
  })
})

describe('artworkAchValidateAr', () => {
  it('throws when arEnabled is true and no marker file is uploaded', () => {
    expect(() =>
      artworkAchValidateAr({
        data: { ach: { ar: { arEnabled: true } } },
        operation: 'create',
        collection: {} as any,
        context: {} as any,
        req: {} as any,
      } as any),
    ).toThrow(/arMarkerFile/)
  })

  it('allows arEnabled true when arMarkerFile is present', () => {
    expect(() =>
      artworkAchValidateAr({
        data: { ach: { ar: { arEnabled: true, arMarkerFile: 42 } } },
        operation: 'create',
        collection: {} as any,
        context: {} as any,
        req: {} as any,
      } as any),
    ).not.toThrow()
  })

  it('allows arEnabled false regardless of marker file', () => {
    expect(() =>
      artworkAchValidateAr({
        data: { ach: { ar: { arEnabled: false } } },
        operation: 'create',
        collection: {} as any,
        context: {} as any,
        req: {} as any,
      } as any),
    ).not.toThrow()
  })
})
