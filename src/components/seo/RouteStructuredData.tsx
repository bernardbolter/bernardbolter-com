import { headers } from 'next/headers'

import { JsonLdScript } from '@/components/seo/JsonLdScript'

/** Injects route JSON-LD into `<head>` from the request pathname. */
export async function RouteStructuredData() {
  if (process.env.NODE_ENV === 'development') return null

  try {
    const pathname = (await headers()).get('x-pathname')
    if (!pathname) return null

    const { resolveRouteJsonLd } = await import('@/lib/seo/routeJsonLd')
    const jsonLd = await resolveRouteJsonLd(pathname)
    if (!jsonLd) return null

    return <JsonLdScript data={jsonLd} />
  } catch (err) {
    console.error('[route-json-ld] skipped', err)
    return null
  }
}
