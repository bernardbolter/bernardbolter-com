/**
 * Part 10 audit — list artworks marked complete with empty intent.
 * Report only; does not auto-correct.
 *
 * Usage: npx tsx src/scripts/audit-reasoning-status-complete.ts
 */
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

import { getPayload } from 'payload'
import config from '@/payload.config'

async function main() {
  const payload = await getPayload({ config })

  const mismatches: Array<{ slug: string; catalogueNumber: string | null }> = []
  let page = 1
  let scanned = 0

  while (true) {
    const { docs, hasNextPage } = await payload.find({
      collection: 'artworks',
      locale: 'en',
      where: {
        and: [
          { status: { equals: 'published' } },
          { reasoningStatus: { equals: 'complete' } },
        ],
      },
      limit: 100,
      page,
      depth: 0,
      select: {
        slug: true,
        catalogueNumber: true,
        intent: true,
        reasoningStatus: true,
      },
      overrideAccess: true,
    })

    for (const doc of docs) {
      scanned += 1
      if (!doc.intent?.trim()) {
        mismatches.push({
          slug: doc.slug,
          catalogueNumber: doc.catalogueNumber ?? null,
        })
      }
    }

    if (!hasNextPage) break
    page += 1
  }

  console.log('=== reasoningStatus audit (Part 10) ===')
  console.log(`Scanned published artworks with reasoningStatus=complete: ${scanned}`)
  console.log(`complete + empty intent: ${mismatches.length}`)
  console.log('')
  for (const row of mismatches) {
    console.log(`${row.slug}\t${row.catalogueNumber ?? '—'}`)
  }
  console.log('')
  console.log('=== partial reachability ===')
  console.log(
    'Artworks.reasoningStatus options include stub / partial / complete (schema OK).',
  )
  console.log(
    'Field is admin readOnly: true — UI cannot set partial manually.',
  )
  console.log(
    'Studio envelope import (applyEnvelopeImport) can write reasoningStatus including partial.',
  )
  console.log(
    'Art/Official quick-upload sets stub; commit paths typically set complete.',
  )
  console.log(
    'If partial appears unused in data, that is an operational gap — not a missing enum value.',
  )
  console.log('')
  console.log('No auto-correction performed.')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
