import { getPayload } from 'payload'
import config from '@payload-config'

import { fetchCatalogueArtworksWithPayload } from '@/lib/payload/artworks'
import { fetchFilterSeriesWithPayload } from '@/lib/payload/series'
import { withDbRetry } from '@/lib/payload/withDbRetry'

export const dynamic = 'force-dynamic'

/** Slim published catalogue for the homepage client fetch (avoids blocking RSC). */
export async function GET() {
  try {
    const started = Date.now()
    const data = await withDbRetry(async () => {
      const payload = await getPayload({ config })
      const [artworks, filterSeries] = await Promise.all([
        fetchCatalogueArtworksWithPayload(payload),
        fetchFilterSeriesWithPayload(payload),
      ])
      return { artworks, filterSeries }
    })
    console.info(`[api/catalogue] ${data.artworks.length} rows in ${Date.now() - started}ms`)
    return Response.json(data)
  } catch (err) {
    console.error('[api/catalogue] failed', err)
    return Response.json({ artworks: [], filterSeries: [] }, { status: 503 })
  }
}
