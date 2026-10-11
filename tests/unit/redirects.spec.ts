import { describe, expect, it } from 'vitest'

import {
  bioEntryPublicPath,
  isRedirectablePublicPath,
  normalizeRedirectPath,
  sessionPublicPath,
  throughlinePublicPath,
} from '../../src/lib/redirects/paths'
import { resolveRedirectTarget } from '../../src/lib/redirects/recordSlugRedirect'

describe('normalizeRedirectPath', () => {
  it('strips trailing slash and lowercases nothing', () => {
    expect(normalizeRedirectPath('/sessions/foo/')).toBe('/sessions/foo')
    expect(normalizeRedirectPath('sessions/foo')).toBe('/sessions/foo')
  })

  it('accepts absolute URLs and keeps pathname', () => {
    expect(normalizeRedirectPath('https://bernardbolter.com/sessions/x/')).toBe(
      '/sessions/x',
    )
  })
})

describe('isRedirectablePublicPath', () => {
  it('matches the three public namespaces', () => {
    expect(isRedirectablePublicPath('/sessions/a')).toBe(true)
    expect(isRedirectablePublicPath('/statement/throughlines/a')).toBe(true)
    expect(isRedirectablePublicPath('/bio/entries/a')).toBe(true)
    expect(isRedirectablePublicPath('/venice-in-the-middle')).toBe(false)
  })
})

describe('path helpers', () => {
  it('builds canonical paths', () => {
    expect(sessionPublicPath('color-theory-2026-08-04')).toBe(
      '/sessions/color-theory-2026-08-04',
    )
    expect(throughlinePublicPath('seeing-as-a-verb')).toBe(
      '/statement/throughlines/seeing-as-a-verb',
    )
    expect(bioEntryPublicPath('moved-to-berlin')).toBe('/bio/entries/moved-to-berlin')
  })
})

describe('resolveRedirectTarget multi-hop', () => {
  it('follows A→B→C to C in one resolve', async () => {
    const map = new Map<string, string>([
      ['/sessions/a', '/sessions/b'],
      ['/sessions/b', '/sessions/c'],
    ])
    const payload = {
      find: async ({ where }: { where: { fromPath: { equals: string } } }) => {
        const from = where.fromPath.equals
        const to = map.get(from)
        return { docs: to ? [{ toPath: to }] : [] }
      },
    }
    const landed = await resolveRedirectTarget(payload as never, '/sessions/a')
    expect(landed).toBe('/sessions/c')
  })

  it('returns null when no row exists', async () => {
    const payload = {
      find: async () => ({ docs: [] }),
    }
    expect(await resolveRedirectTarget(payload as never, '/sessions/missing')).toBe(
      null,
    )
  })

  it('stops on cycles without throwing', async () => {
    const map = new Map<string, string>([
      ['/sessions/a', '/sessions/b'],
      ['/sessions/b', '/sessions/a'],
    ])
    const payload = {
      find: async ({ where }: { where: { fromPath: { equals: string } } }) => {
        const to = map.get(where.fromPath.equals)
        return { docs: to ? [{ toPath: to }] : [] }
      },
    }
    const landed = await resolveRedirectTarget(payload as never, '/sessions/a')
    expect(landed === '/sessions/a' || landed === '/sessions/b').toBe(true)
  })
})
