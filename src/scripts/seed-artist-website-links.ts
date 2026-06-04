/**
 * Idempotent seed for Artist `otherLinks` (info panel website links).
 *
 * Usage: pnpm tsx src/scripts/seed-artist-website-links.ts
 */
import { getPayload } from 'payload'

import config from '@payload-config'

const DEFAULT_LINKS = [
  { label: 'acolorfulhistory.com', url: 'https://acolorfulhistory.com' },
  { label: 'digitalcityseries.com', url: 'https://digitalcityseries.com' },
  { label: 'smoothism.com', url: 'https://smoothism.com' },
]

async function main() {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'artists',
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const artist = docs[0]
  if (!artist) {
    console.error('No artist record found. Create one in Payload admin first.')
    process.exit(1)
  }

  const existing = artist.otherLinks ?? []
  if (existing.length > 0) {
    console.log(`Artist "${artist.name}" already has ${existing.length} website link(s). Skipping.`)
    process.exit(0)
  }

  await payload.update({
    collection: 'artists',
    id: artist.id,
    data: { otherLinks: DEFAULT_LINKS },
    overrideAccess: true,
  })

  console.log(`Added ${DEFAULT_LINKS.length} website links to artist "${artist.name}" (id ${artist.id}).`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
