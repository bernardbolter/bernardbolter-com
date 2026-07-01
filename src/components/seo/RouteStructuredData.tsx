import { headers } from 'next/headers'

import { JsonLdScript } from '@/components/seo/JsonLdScript'
import { resolveRouteJsonLd } from '@/lib/seo/routeJsonLd'

/** Injects route JSON-LD into `<head>` from the request pathname. */
export async function RouteStructuredData() {
  const pathname = (await headers()).get('x-pathname')
  if (!pathname) return null

  const jsonLd = await resolveRouteJsonLd(pathname)
  if (!jsonLd) return null

  return <JsonLdScript data={jsonLd} />
}
