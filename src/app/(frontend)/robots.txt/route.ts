import { NextResponse } from 'next/server'

import { getRobotsConfig, robotsConfigToText } from '@/lib/seo/robotsConfig'

export const dynamic = 'force-static'

export function GET() {
  const body = robotsConfigToText(getRobotsConfig())

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}
