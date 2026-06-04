/**
 * Mark existing artworks as fully catalogued (not in the Unreasoned Queue).
 * Quick Upload still sets reasoningStatus: stub on new records.
 *
 * Usage: npx tsx src/scripts/backfill-reasoning-status-complete.ts [--dry-run]
 */
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { getPayload } from 'payload'
import config from '@/payload.config'

const dryRun = process.argv.includes('--dry-run')

async function main() {
  const payload = await getPayload({ config })

  let page = 1
  let updated = 0
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
      if (doc.reasoningStatus === 'complete') {
        skipped += 1
        continue
      }

      if (!dryRun) {
        await payload.update({
          collection: 'artworks',
          id: doc.id,
          data: { reasoningStatus: 'complete' },
          overrideAccess: true,
        })
      }
      updated += 1
    }

    if (!hasNextPage) break
    page += 1
  }

  console.log(
    dryRun
      ? `[dry-run] Would set reasoningStatus=complete on ${updated} artworks (${skipped} already complete).`
      : `Set reasoningStatus=complete on ${updated} artworks (${skipped} already complete).`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
