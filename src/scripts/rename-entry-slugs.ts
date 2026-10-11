/**
 * Stage 3: regenerate bio/throughline slugs longer than 60 chars.
 * artistBeforeChange records redirects for every slug change.
 *
 * Usage:
 *   npx tsx src/scripts/rename-entry-slugs.ts --dry-run
 *   npx tsx src/scripts/rename-entry-slugs.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env', override: true })
dotenv.config({ path: '.env.local', override: true })

import { getPayload } from 'payload'
import config from '@/payload.config'
import {
  ENTRY_SLUG_MAX_LENGTH,
  slugifyEntryText,
  uniqueEntrySlug,
} from '@/lib/artist/entrySlug'

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const payload = await getPayload({ config })

  const artists = await payload.find({
    collection: 'artists',
    limit: 10,
    depth: 0,
    overrideAccess: true,
  })
  const artist = artists.docs[0]
  if (!artist) {
    console.error('No artist document')
    process.exit(1)
  }

  const used = new Set<string>()
  for (const row of artist.bioTimelineEntries ?? []) {
    const slug = row?.slug?.trim()
    if (slug && slug.length <= ENTRY_SLUG_MAX_LENGTH) used.add(slug)
  }
  for (const row of artist.statementThroughlines ?? []) {
    const slug = row?.slug?.trim()
    if (slug && slug.length <= ENTRY_SLUG_MAX_LENGTH) used.add(slug)
  }

  const bioChanges: Array<{ id: string; from: string; to: string; text: string }> = []
  const throughChanges: Array<{ id: string; from: string; to: string; text: string }> = []

  const nextBio = (artist.bioTimelineEntries ?? []).map((row) => {
    if (!row?.id) return row
    const from = row.slug?.trim() || ''
    if (from && from.length <= ENTRY_SLUG_MAX_LENGTH) return row
    const to = uniqueEntrySlug(slugifyEntryText(row.text?.trim() || row.id), used)
    bioChanges.push({ id: row.id, from: from || '(empty)', to, text: (row.text || '').slice(0, 80) })
    return { ...row, slug: to }
  })

  const nextThrough = (artist.statementThroughlines ?? []).map((row) => {
    if (!row?.id) return row
    const from = row.slug?.trim() || ''
    if (from && from.length <= ENTRY_SLUG_MAX_LENGTH) return row
    const to = uniqueEntrySlug(slugifyEntryText(row.text?.trim() || row.id), used)
    throughChanges.push({
      id: row.id,
      from: from || '(empty)',
      to,
      text: (row.text || '').slice(0, 80),
    })
    return { ...row, slug: to }
  })

  console.log(
    JSON.stringify(
      {
        dryRun,
        bioChanges,
        throughChanges,
        changeCount: bioChanges.length + throughChanges.length,
      },
      null,
      2,
    ),
  )

  if (dryRun) {
    console.log('dry-run only; no writes')
    process.exit(0)
  }

  if (bioChanges.length + throughChanges.length === 0) {
    console.log('nothing to rename')
    process.exit(0)
  }

  await payload.update({
    collection: 'artists',
    id: artist.id,
    data: {
      bioTimelineEntries: nextBio,
      statementThroughlines: nextThrough,
    },
    overrideAccess: true,
    overrideLock: true,
  })

  console.log(
    `done: ${bioChanges.length} bio + ${throughChanges.length} throughline slug(s) renamed`,
  )
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
