import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const STUDIO_ROOT = '/studio'
const STUDIO_LOGIN = '/studio/login'
const PAYLOAD_TOKEN = 'payload-token'

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-studio-path', pathname)

  if (!pathname.startsWith(STUDIO_ROOT) || pathname.startsWith(STUDIO_LOGIN)) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    })
  }

  const token = request.cookies.get(PAYLOAD_TOKEN)?.value
  if (token) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    })
  }

  const redirectURL = new URL(STUDIO_LOGIN, request.url)
  const from = `${pathname}${search}`
  redirectURL.searchParams.set('from', from)
  return NextResponse.redirect(redirectURL)
}

export const config = {
  matcher: ['/studio', '/studio/:path*'],
}
