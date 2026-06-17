import { getSiteBaseUrl } from '@/lib/jsonld/site'
import { getArtistGlobal } from '@/lib/payload/siteDocuments'

export const revalidate = 3600
export const dynamic = 'force-dynamic'

export async function GET() {
  const artist = await getArtistGlobal()
  const baseUrl = artist?.canonicalDomain?.trim() || getSiteBaseUrl()

  const identifier: Array<Record<string, unknown>> = []
  if (artist?.ulanUri) {
    identifier.push({
      '@type': 'PropertyValue',
      propertyID: 'ULAN',
      value: artist.ulanUri,
    })
  }
  if (artist?.wikidataUri) {
    identifier.push({
      '@type': 'PropertyValue',
      propertyID: 'Wikidata',
      value: artist.wikidataUri,
    })
  }

  const body = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: artist?.name ?? 'Artist',
    url: baseUrl,
    ...(identifier.length ? { identifier } : {}),
    archiveVersion: '1.0',
    publicKey: artist?.archivePublicKey?.trim() || null,
  }

  return Response.json(body, {
    headers: {
      'Content-Type': 'application/json',
    },
  })
}
