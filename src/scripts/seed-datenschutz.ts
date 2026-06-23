/**
 * Seed or refresh the Datenschutz (privacy policy) on the primary Artist record (en + de).
 *
 * Usage:
 *   npx tsx src/scripts/seed-datenschutz.ts
 *   npx tsx src/scripts/seed-datenschutz.ts --dry-run
 *   npx tsx src/scripts/seed-datenschutz.ts --force   # overwrite existing content
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

import {
  buildDatenschutzLexicalDe,
  buildDatenschutzLexicalEn,
  DATENSCHUTZ_LAST_REVISED_DE,
  DATENSCHUTZ_LAST_REVISED_EN,
} from '@/content/datenschutzPolicy'
import config from '@/payload.config'
import { getPayload } from 'payload'

const dryRun = process.argv.includes('--dry-run')
const force = process.argv.includes('--force')

async function main() {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'artists',
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const artist = result.docs[0]
  if (!artist) {
    console.error('No artist record found.')
    process.exit(1)
  }

  if (artist.datenschutzFull && !force) {
    console.log(
      'Artist already has datenschutzFull content. Re-run with --force to replace both locales, or edit in Payload admin.',
    )
    process.exit(0)
  }

  if (dryRun) {
    console.log(
      `[dry-run] Would update artist ${artist.id} with Datenschutz DE (${DATENSCHUTZ_LAST_REVISED_DE}) and EN (${DATENSCHUTZ_LAST_REVISED_EN}).`,
    )
    process.exit(0)
  }

  await payload.update({
    collection: 'artists',
    id: artist.id,
    locale: 'en',
    data: { datenschutzFull: buildDatenschutzLexicalEn() },
    overrideAccess: true,
    context: { skipRevalidate: true },
  })

  await payload.update({
    collection: 'artists',
    id: artist.id,
    locale: 'de',
    data: { datenschutzFull: buildDatenschutzLexicalDe() },
    overrideAccess: true,
    context: { skipRevalidate: true },
  })

  console.log(
    `Updated datenschutzFull on artist ${artist.id} — EN (${DATENSCHUTZ_LAST_REVISED_EN}), DE (${DATENSCHUTZ_LAST_REVISED_DE}).`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
