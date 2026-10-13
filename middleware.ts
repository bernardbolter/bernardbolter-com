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
  const match = pathname.match(/^\/([^/]+)(?:\/(vision))?$/)
  if (!match) return false
  const slug = match[1]
  if (!slug || NON_ARTWORK_ROOT_SEGMENTS.has(slug.toLowerCase())) return false
  if (isReservedFrontendSlug(slug)) return false
  return true
}

/**
 * Retire redundant per-work HTML surfaces in one hop:
 *   /{slug}/record → /{slug}
 *   /{slug}/sessions | /{slug}/session → /{slug}#sessions
 * Hash must live here — next.config redirects strip fragments.
 */
function retireArtworkSubrouteRedirect(request: NextRequest): NextResponse | null {
  const pathname =
    request.nextUrl.pathname.length > 1 && request.nextUrl.pathname.endsWith('/')
      ? request.nextUrl.pathname.slice(0, -1)
      : request.nextUrl.pathname
  const match = pathname.match(/^\/([^/]+)\/(record|sessions|session)$/)
  if (!match) return null
  const slug = match[1]
  const kind = match[2]
  if (!slug || NON_ARTWORK_ROOT_SEGMENTS.has(slug.toLowerCase())) return null
  if (isReservedFrontendSlug(slug)) return null

  const dest = new URL(`/${slug}`, request.nextUrl.origin)
  dest.search = request.nextUrl.search
  if (kind === 'sessions' || kind === 'session') {
    dest.hash = 'sessions'
  }
  return NextResponse.redirect(dest, 308)
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

/**
 * Look up redirects via loopback so middleware never hairpins through
 * Caddy/Cloudflare (public origin fetch deadlocks or soft-fails to 200).
 */
function redirectResolveOrigin(): string {
  const configured = process.env.REDIRECT_RESOLVE_ORIGIN?.trim()
  if (configured) return configured.replace(/\/$/, '')
  const port = process.env.PORT?.trim() || '3000'
  return `http://127.0.0.1:${port}`
}

async function resolvePublicRedirect(
  request: NextRequest,
  pathname: string,
): Promise<NextResponse | null> {
  const path =
    pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
  if (
    !path.startsWith('/sessions/') &&
    !path.startsWith('/statement/throughlines/') &&
    !path.startsWith('/bio/entries/')
  ) {
    return null
  }
  // Avoid recursion when the resolve API itself is hit.
  if (path.startsWith('/api/')) return null

  try {
    const resolveUrl = new URL('/api/redirects/resolve', redirectResolveOrigin())
    resolveUrl.searchParams.set('from', path)
    const res = await fetch(resolveUrl, {
      headers: { 'x-middleware-redirect-lookup': '1' },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const body = (await res.json()) as { toPath?: string | null }
    const toPath = typeof body.toPath === 'string' ? body.toPath.trim() : ''
    if (!toPath || toPath === path) return null
    const dest = new URL(toPath, request.nextUrl.origin)
    dest.search = request.nextUrl.search
    return NextResponse.redirect(dest, 308)
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
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

  const retiredSubroute = retireArtworkSubrouteRedirect(request)
  if (retiredSubroute) return retiredSubroute

  const publicRedirect = await resolvePublicRedirect(request, pathname)
  if (publicRedirect) return publicRedirect

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
