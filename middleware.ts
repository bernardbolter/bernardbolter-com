import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { corsHeadersForOrigin, isCorsOriginAllowed } from '@/lib/cors'
import { isReservedFrontendSlug } from '@/lib/routes/reservedFrontendSlugs'

const STUDIO_ROOT = '/studio'
const STUDIO_LOGIN = '/studio/login'
const PAYLOAD_TOKEN = 'payload-token'

/** Artwork HTML surfaces that are static between edits (purged by revalidateArchive). */
const ARTWORK_HTML_CACHE =
  'public, s-maxage=3600, stale-while-revalidate=3600'

/** Site sections that share /{segment} shape but are not artwork pages. */
const NON_ARTWORK_ROOT_SEGMENTS = new Set([
  ...Array.from(
    // Keep middleware import light: mirror reservedFrontendSlugs + common roots.
    [
      'admin',
      'api',
      'artworks',
      'bio',
      'contact',
      'corpus',
      'cv',
      'datenschutz',
      'events',
      'preview',
      'series',
      'sessions',
      'sitemap.xml',
      'statement',
      'studio',
      'robots.txt',
    ],
  ),
])

function isCacheableArtworkHtmlPath(pathname: string): boolean {
  if (pathname.startsWith('/api/')) return false
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/studio') ||
    pathname.startsWith('/preview')
  ) {
    return false
  }
  const match = pathname.match(/^\/([^/]+)(?:\/(record|vision))?$/)
  if (!match) return false
  const slug = match[1]
  if (!slug || NON_ARTWORK_ROOT_SEGMENTS.has(slug.toLowerCase())) return false
  if (isReservedFrontendSlug(slug)) return false
  return true
}

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

function withArtworkHtmlCache(pathname: string, response: NextResponse): NextResponse {
  if (isCacheableArtworkHtmlPath(pathname)) {
    response.headers.set('Cache-Control', ARTWORK_HTML_CACHE)
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
    return withArtworkHtmlCache(
      pathname,
      withPublicApiCors(
        request,
        NextResponse.next({
          request: { headers: requestHeaders },
        }),
      ),
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
