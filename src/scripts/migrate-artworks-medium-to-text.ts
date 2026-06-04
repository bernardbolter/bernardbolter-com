/**
 * Convert artworks.medium from Postgres enum to varchar so custom Quick Upload
 * media slugs (e.g. t-shirt-transfer-and-acrylic-on-canvas) can be stored.
 *
 * Usage: npx tsx src/scripts/migrate-artworks-medium-to-text.ts
 */
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { getPayload } from 'payload'
import config from '@/payload.config'

import { migrateArtworksMediumColumnToText } from '@/lib/artOfficial/artworkMediumDatabase'

async function main() {
  const payload = await getPayload({ config })
  const result = await migrateArtworksMediumColumnToText(payload)

  if (result.changed) {
    console.log(
      `Converted artworks.medium from enum "${result.previousUdt}" to varchar.`,
    )
    console.log(
      'Restart dev server and set PAYLOAD_DATABASE_PUSH=true once if Payload still expects enum in Drizzle.',
    )
  } else {
    console.log(
      `No migration needed (medium column is already ${result.previousUdt ?? 'text/varchar'}).`,
    )
  }

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
