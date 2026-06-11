/**
 * Set status=published on all artworks except fixture slugs (__*) and archived records.
 *
 * Usage: npx tsx src/scripts/publish-all-artworks.ts [--dry-run]
 */
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { getPayload } from 'payload'
import config from '@/payload.config'

const dryRun = process.argv.includes('--dry-run')

async function main() {
  const payload = await getPayload({ config })

  let page = 1
  let published = 0
  let skipped = 0

  while (true) {
    const { docs, hasNextPage } = await payload.find({
      collection: 'artworks',
      limit: 100,
      page,
      depth: 0,
      overrideAccess: true,
    })

    for (const doc of docs) {
      const slug = doc.slug?.trim() ?? ''

      if (slug.startsWith('__')) {
        skipped += 1
        continue
      }

      if (doc.status === 'archived') {
        skipped += 1
        continue
      }

      if (doc.status === 'published') {
        skipped += 1
        continue
      }

      if (!dryRun) {
        await payload.update({
          collection: 'artworks',
          id: doc.id,
          data: { status: 'published' },
          overrideAccess: true,
        })
      }
      published += 1
      console.log(`${dryRun ? '[dry-run] ' : ''}published: ${slug || doc.id}`)
    }

    if (!hasNextPage) break
    page += 1
  }

  console.log(
    dryRun
      ? `[dry-run] Would publish ${published} artworks (${skipped} skipped).`
      : `Published ${published} artworks (${skipped} skipped).`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
