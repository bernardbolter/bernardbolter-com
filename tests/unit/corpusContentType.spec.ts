import { describe, expect, it } from 'vitest'

import { corpusContentType, corpusResponseHeaders } from '@/lib/corpus/ldJsonHeaders'

describe('corpusContentType', () => {
  it('defaults to application/json with charset', () => {
    const req = new Request('https://bernardbolter.com/api/corpus/index')
    expect(corpusContentType(req)).toBe('application/json; charset=utf-8')
  })

  it('returns ld+json with charset when Accept asks for it', () => {
    const req = new Request('https://bernardbolter.com/api/corpus/index', {
      headers: { Accept: 'application/ld+json' },
    })
    expect(corpusContentType(req)).toBe('application/ld+json; charset=utf-8')
  })

  it('never omits charset on either branch', () => {
    const json = corpusContentType(new Request('https://example.com'))
    const ld = corpusContentType(
      new Request('https://example.com', { headers: { Accept: 'application/ld+json' } }),
    )
    expect(json).toContain('charset=utf-8')
    expect(ld).toContain('charset=utf-8')
    expect(json).not.toBe('application/ld+json')
    expect(ld).not.toBe('application/ld+json')
  })

  it('includes cache headers alongside negotiated type', () => {
    const headers = corpusResponseHeaders(new Request('https://example.com'))
    expect(headers['Content-Type']).toBe('application/json; charset=utf-8')
    expect(headers['Cache-Control']).toContain('s-maxage=60')
  })
})
