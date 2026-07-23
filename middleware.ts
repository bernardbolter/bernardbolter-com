import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { corsHeadersForOrigin, isCorsOriginAllowed } from '@/lib/cors'

const STUDIO_ROOT = '/studio'
const STUDIO_LOGIN = '/studio/login'
const PAYLOAD_TOKEN = 'payload-token'

function withPublicApiCors(request: NextRequest, response: NextResponse): NextResponse {
  if (!request.nextUrl.pathname.startsWith('/api/')) return response

  const origin = request.headers.get('origin')
  if (!isCorsOriginAllowed(origin)) return response

  const headers = corsHeadersForOrigin(origin)
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value)
  }
  return response
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-studio-path', pathname)
  requestHeaders.set('x-pathname', pathname)

  // Browser preflight for public API consumers (ACH, etc.)
  if (request.method === 'OPTIONS' && pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin')
    if (isCorsOriginAllowed(origin)) {
      return new NextResponse(null, {
        status: 204,
        headers: corsHeadersForOrigin(origin),
      })
    }
  }

  if (!pathname.startsWith(STUDIO_ROOT) || pathname.startsWith(STUDIO_LOGIN)) {
    return withPublicApiCors(
      request,
      NextResponse.next({
        request: { headers: requestHeaders },
      }),
    )
  }

  const token = request.cookies.get(PAYLOAD_TOKEN)?.value
  if (token) {
    return withPublicApiCors(
      request,
      NextResponse.next({
        request: { headers: requestHeaders },
      }),
    )
  }

  const redirectURL = new URL(STUDIO_LOGIN, request.url)
  const from = `${pathname}${search}`
  redirectURL.searchParams.set('from', from)
  return NextResponse.redirect(redirectURL)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
