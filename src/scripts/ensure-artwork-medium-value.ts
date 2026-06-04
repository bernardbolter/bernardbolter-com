/**
 * Ensure a medium slug exists in DB (enum ADD VALUE or no-op if varchar).
 * Usage: npx tsx src/scripts/ensure-artwork-medium-value.ts t-shirt-transfer-and-acrylic-on-canvas
 */
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { getPayload } from 'payload'
import config from '@/payload.config'

import { ensureArtworkMediumEnumValue } from '@/lib/artOfficial/artworkMediumDatabase'

async function main() {
  const value = process.argv[2]?.trim()
  if (!value) {
    console.error('Usage: npx tsx src/scripts/ensure-artwork-medium-value.ts <medium-slug>')
    process.exit(1)
  }

  const payload = await getPayload({ config })
  await ensureArtworkMediumEnumValue(payload, value)
  console.log(`Ensured medium value: ${value}`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
