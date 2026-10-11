import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

import { isRedirectablePublicPath, normalizeRedirectPath } from '@/lib/redirects/paths'
import { resolveRedirectTarget } from '@/lib/redirects/recordSlugRedirect'

export const dynamic = 'force-dynamic'

/**
 * Lightweight lookup for middleware. Returns final toPath after multi-hop resolution.
 * GET /api/redirects/resolve?from=/sessions/old-id
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const fromRaw = url.searchParams.get('from') ?? ''
  const fromPath = normalizeRedirectPath(fromRaw)

  if (!fromPath || !isRedirectablePublicPath(fromPath)) {
    return NextResponse.json({ toPath: null }, { status: 200 })
  }

  try {
    const payload = await getPayload({ config })
    const toPath = await resolveRedirectTarget(payload, fromPath)
    return NextResponse.json(
      { fromPath, toPath },
      {
        status: 200,
        headers: {
          // Short edge cache; renames purge via short TTL + low volume.
          'Cache-Control': 'public, max-age=0, s-maxage=60, must-revalidate',
        },
      },
    )
  } catch (err) {
    console.error('[redirects/resolve]', err)
    return NextResponse.json({ toPath: null }, { status: 200 })
  }
}
