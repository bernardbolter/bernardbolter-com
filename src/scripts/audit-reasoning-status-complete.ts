/**
 * reasoningStatus audit — both directions.
 * Report only; does not auto-correct.
 *
 * Usage: npx tsx src/scripts/audit-reasoning-status-complete.ts
 */
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

import { getPayload } from 'payload'
import config from '@/payload.config'

type Row = { slug: string; catalogueNumber: string | null; reasoningStatus: string | null }

async function main() {
  const payload = await getPayload({ config })

  const completeWithoutIntent: Row[] = []
  const intentNotComplete: Row[] = []
  let page = 1
  let scanned = 0

  while (true) {
    const { docs, hasNextPage } = await payload.find({
      collection: 'artworks',
      locale: 'en',
      where: { status: { equals: 'published' } },
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
      const hasIntent = Boolean(doc.intent?.trim())
      const status = doc.reasoningStatus ?? null
      const row: Row = {
        slug: doc.slug,
        catalogueNumber: doc.catalogueNumber ?? null,
        reasoningStatus: status,
      }

      if (status === 'complete' && !hasIntent) {
        completeWithoutIntent.push(row)
      }
      if (hasIntent && status !== 'complete') {
        intentNotComplete.push(row)
      }
    }

    if (!hasNextPage) break
    page += 1
  }

  console.log('=== reasoningStatus audit (both directions) ===')
  console.log(`Scanned published artworks: ${scanned}`)
  console.log('')

  console.log(`1) complete + empty intent: ${completeWithoutIntent.length}`)
  for (const row of completeWithoutIntent) {
    console.log(`${row.slug}\t${row.catalogueNumber ?? '—'}`)
  }
  console.log('')

  console.log(`2) intent present + reasoningStatus !== complete: ${intentNotComplete.length}`)
  for (const row of intentNotComplete) {
    console.log(
      `${row.slug}\t${row.catalogueNumber ?? '—'}\t${row.reasoningStatus ?? 'null'}`,
    )
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
    'Decoupling in either direction is why availableTiers uses field presence, not reasoningStatus.',
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
