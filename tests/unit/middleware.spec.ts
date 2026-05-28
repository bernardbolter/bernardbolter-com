import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'

import { middleware } from '@/../middleware'

describe('studio auth middleware', () => {
  it('allows /studio/login without token', () => {
    const request = new NextRequest('http://localhost:3000/studio/login')
    const response = middleware(request)
    expect(response.status).toBe(200)
  })

  it('redirects /studio to login without token', () => {
    const request = new NextRequest('http://localhost:3000/studio?tab=upload')
    const response = middleware(request)
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/studio/login?from=%2Fstudio%3Ftab%3Dupload',
    )
  })

  it('allows /studio with payload-token', () => {
    const request = new NextRequest('http://localhost:3000/studio')
    request.cookies.set('payload-token', 'fake-token')
    const response = middleware(request)
    expect(response.status).toBe(200)
  })
})
