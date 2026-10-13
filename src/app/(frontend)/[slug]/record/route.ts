import { NextResponse } from 'next/server'

import { isReservedFrontendSlug } from '@/lib/routes/reservedFrontendSlugs'

type Ctx = { params: Promise<{ slug: string }> }

/** Retired plain mirror → artwork page (308, one hop). */
export async function GET(request: Request, ctx: Ctx) {
  const { slug } = await ctx.params
  if (isReservedFrontendSlug(slug)) {
    return new NextResponse(null, { status: 404 })
  }
  const dest = new URL(`/${slug}`, request.url)
  return NextResponse.redirect(dest, 308)
}
