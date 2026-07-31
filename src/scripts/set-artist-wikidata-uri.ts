/**
 * Set Artist.wikidataUri (entity/ form) and print JSON-LD propagation checks.
 *
 * Usage: npx tsx src/scripts/set-artist-wikidata-uri.ts
 */
import { getPayload } from 'payload'
import config from '@payload-config'
import { artistAsSchemaPerson } from '@/lib/jsonld/artistPerson'
import { generateBioJsonLd } from '@/utilities/generateBioJsonLd'
import { buildArtworkJsonLd } from '@/utilities/buildArtworkJsonLd'
import { getSiteBaseUrl } from '@/lib/jsonld/site'

const WIKIDATA_URI = 'https://www.wikidata.org/entity/Q140782973'

async function main() {
  const payload = await getPayload({ config })
  const baseUrl = getSiteBaseUrl()

  const { docs } = await payload.find({
    collection: 'artists',
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const artist = docs[0]
  if (!artist) {
    console.error('No artist record found')
    process.exit(1)
  }

  const current = artist.wikidataUri?.trim() ?? null
  if (current === WIKIDATA_URI) {
    console.log(`Artist.wikidataUri already set: ${WIKIDATA_URI}`)
  } else {
    console.log(`Updating Artist.wikidataUri: ${JSON.stringify(current)} → ${WIKIDATA_URI}`)
    await payload.update({
      collection: 'artists',
      id: artist.id,
      data: { wikidataUri: WIKIDATA_URI },
      overrideAccess: true,
    })
  }

  const refreshed = await payload.findByID({
    collection: 'artists',
    id: artist.id,
    depth: 0,
    overrideAccess: true,
  })

  const bioLd = generateBioJsonLd(refreshed, { baseUrl })
  const mainEntity = bioLd.mainEntity as Record<string, unknown>
  const sameAs = mainEntity.sameAs
  const identifiers = mainEntity.identifier as Array<Record<string, unknown>> | undefined
  const wikidataIdentifier = identifiers?.find((row) => row.propertyID === 'Wikidata')

  console.log('BIO sameAs includes Wikidata:', Array.isArray(sameAs) ? sameAs.includes(WIKIDATA_URI) : sameAs === WIKIDATA_URI)
  console.log('BIO sameAs:', sameAs)
  console.log('BIO identifier Wikidata PropertyValue:', wikidataIdentifier)

  const person = artistAsSchemaPerson(refreshed)
  console.log('artistAsSchemaPerson.identifier:', person.identifier)

  const artworkResult = await payload.find({
    collection: 'artworks',
    where: { _status: { equals: 'published' } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const artwork = artworkResult.docs[0]
  if (artwork) {
    const artworkLd = buildArtworkJsonLd(artwork, refreshed, { baseUrl })
    console.log('ARTWORK slug:', artwork.slug)
    console.log('ARTWORK creator:', artworkLd.creator)
    console.log(
      'NOTE: live artwork JSON-LD uses creator.@id → /bio#person (not inline creator.identifier PropertyValue). Wikidata lives on the bio Person entity artworks reference.',
    )
  }

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
