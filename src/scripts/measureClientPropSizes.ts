/**
 * One-off: compare JSON sizes of artwork page / catalogue client props.
 * Run: npx tsx src/scripts/measureClientPropSizes.ts
 */
import { gzipSync } from 'zlib'

import { getPayload } from 'payload'
import config from '@payload-config'

import { buildLayer0ImageHeroProps } from '@/lib/artwork/layer0HeroProps'
import { getArtworks } from '@/lib/payload/artworks'
import { getArtworkForPage, ARTWORK_PAGE_DEPTH } from '@/lib/payload/artworkPage'
import type { Artwork } from '@/payload-types'

function sizes(label: string, obj: unknown) {
  const json = JSON.stringify(obj)
  const gz = gzipSync(Buffer.from(json))
  console.log(
    label,
    'json',
    json.length,
    'gzip',
    gz.length,
    'sessionNotes',
    json.includes('sessionNotes'),
    'firstImpression',
    json.includes('firstImpression'),
    'messages',
    json.includes('"messages"'),
    'agentDraft',
    json.includes('agentDraft'),
  )
}

async function main() {
  const payload = await getPayload({ config })
  const raw = await payload.find({
    collection: 'artworks',
    where: {
      and: [{ slug: { equals: 'venice-in-the-middle' } }, { status: { equals: 'published' } }],
    },
    limit: 1,
    depth: ARTWORK_PAGE_DEPTH,
    overrideAccess: true,
  })
  const rawDoc = raw.docs[0] as Artwork | undefined
  if (!rawDoc) {
    console.error('no artwork')
    process.exit(1)
  }

  sizes('BEFORE: raw depth-2 artwork (old Layer0 prop)', rawDoc)

  const art = await getArtworkForPage('venice-in-the-middle')
  if (!art) {
    console.error('no prepared artwork')
    process.exit(1)
  }
  sizes('AFTER: prepared artwork (server-only)', art)
  sizes('AFTER: Layer0 slim props (client)', buildLayer0ImageHeroProps(art))
  sizes('AFTER: dimensions pick (client)', {
    widthMm: art.widthMm,
    heightMm: art.heightMm,
    widthPx: art.widthPx,
    heightPx: art.heightPx,
    measurementType: art.measurementType,
  })

  const rows = await getArtworks()
  sizes('AFTER: CatalogueClientRow[]', rows)
  console.log('row count', rows.length, 'sample keys', Object.keys(rows[0] ?? {}))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
