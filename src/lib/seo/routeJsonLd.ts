import { isArtworkDetailPath } from '@/lib/routes/isArtworkDetailPath'
import { buildArtworkJsonLd } from '@/lib/jsonld/artwork'
import { getSiteBaseUrl } from '@/lib/jsonld/site'
import { getBioPageArtist } from '@/lib/payload/bioPage'
import { getArtworkForPage } from '@/lib/payload/artworkPage'
import { getPerson } from '@/lib/payload/person'
import { getArtistRecord } from '@/lib/payload/siteDocuments'
import { buildHomeJsonLd } from '@/utilities/buildHomeJsonLd'
import { generateBioJsonLd } from '@/utilities/generateBioJsonLd'

export type RouteJsonLd = Record<string, unknown>

function normalizePathname(pathname: string): string {
  const trimmed = pathname.trim()
  if (!trimmed || trimmed === '/') return '/'
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed
}

/** Route-specific JSON-LD for injection in root layout `<head>`. */
export async function resolveRouteJsonLd(pathname: string): Promise<RouteJsonLd | null> {
  const normalized = normalizePathname(pathname)
  const baseUrl = getSiteBaseUrl()

  if (normalized === '/') {
    const artist = await getPerson()
    return buildHomeJsonLd(artist, { baseUrl })
  }

  if (normalized === '/bio') {
    const artist = await getBioPageArtist()
    return artist ? generateBioJsonLd(artist, { baseUrl }) : null
  }

  if (isArtworkDetailPath(normalized)) {
    const slug = normalized.split('/').filter(Boolean).at(-1)
    if (!slug) return null

    const [artwork, artist] = await Promise.all([
      getArtworkForPage(slug),
      getArtistRecord(),
    ])
    return artwork ? buildArtworkJsonLd(artwork, artist) : null
  }

  return null
}
