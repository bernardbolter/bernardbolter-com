/**
 * Apply approved bio shortTitles + short slugs.
 * Merges the Utrecht duplicate: keep fuller -2 text under `leaving-utrecht`,
 * retire the shorter original with an explicit redirect.
 *
 * Usage:
 *   npx tsx src/scripts/apply-bio-short-titles.ts --dry-run
 *   npx tsx src/scripts/apply-bio-short-titles.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env', override: true })
dotenv.config({ path: '.env.local', override: true })

import { getPayload } from 'payload'
import config from '@/payload.config'
import { bioEntryPublicPath } from '@/lib/redirects/paths'
import { recordSlugRedirect } from '@/lib/redirects/recordSlugRedirect'

const KEEP_SLUG_TITLES: Record<string, string> = {
  'sfmoma-guerrilla-1996-seed': 'Thirty ideas after SFMOMA',
  'venice-biennale-2007-doubled-operation': 'Inside and outside the Arsenale',
}

const RENAME: Record<string, { shortTitle: string; newSlug: string }> = {
  '19-having-only-ever-lived-san': {
    shortTitle: 'San Francisco felt small',
    newSlug: 'san-francisco-felt-small',
  },
  '1996-right-leaving-europe-recurring-refusal': {
    shortTitle: 'Refusal at the threshold',
    newSlug: 'refusal-at-the-threshold',
  },
  'around-same-time-space-time-1993': {
    shortTitle: 'Figures tested, landscape chosen',
    newSlug: 'figures-tested-landscape-chosen',
  },
  'around-1995-close-birthday-self-portrait': {
    shortTitle: 'Two premonitions at a fork',
    newSlug: 'premonitions-at-a-fork',
  },
}

const UTRECHT_SHORT = 'left-hoge-school-voor-de-kunsten'
const UTRECHT_FULL = 'left-hoge-school-voor-de-kunsten-2'
const UTRECHT_FINAL = 'leaving-utrecht'
const UTRECHT_TITLE = 'Leaving Utrecht, teaching himself'

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

  const rows = artist.bioTimelineEntries ?? []
  const shortRow = rows.find((r) => r?.slug?.trim() === UTRECHT_SHORT)
  const fullRow = rows.find((r) => r?.slug?.trim() === UTRECHT_FULL)
  if (!shortRow?.id || !fullRow?.id) {
    console.error('Utrecht pair not found', {
      short: Boolean(shortRow),
      full: Boolean(fullRow),
    })
    process.exit(1)
  }

  const changes: Array<Record<string, string>> = []
  const nextBio = rows
    .filter((row) => row?.slug?.trim() !== UTRECHT_SHORT)
    .map((row) => {
      if (!row?.id) return row
      const from = row.slug?.trim() || ''

      if (from === UTRECHT_FULL) {
        changes.push({
          id: row.id,
          action: 'merge-keep-fuller-text',
          from,
          to: UTRECHT_FINAL,
          shortTitle: UTRECHT_TITLE,
          textChars: String((row.text || '').length),
        })
        return {
          ...row,
          slug: UTRECHT_FINAL,
          shortTitle: UTRECHT_TITLE,
          // keep fuller claim text as-is
        }
      }

      const titleOnly = KEEP_SLUG_TITLES[from]
      if (titleOnly) {
        changes.push({
          id: row.id,
          action: 'title-only',
          from,
          to: from,
          shortTitle: titleOnly,
        })
        return { ...row, shortTitle: titleOnly }
      }

      const rename = RENAME[from]
      if (rename) {
        changes.push({
          id: row.id,
          action: 'rename',
          from,
          to: rename.newSlug,
          shortTitle: rename.shortTitle,
        })
        return {
          ...row,
          slug: rename.newSlug,
          shortTitle: rename.shortTitle,
        }
      }

      console.error('Unmapped bio slug:', from)
      process.exit(1)
    })

  changes.push({
    id: shortRow.id!,
    action: 'retire-shorter-duplicate',
    from: UTRECHT_SHORT,
    to: UTRECHT_FINAL,
    shortTitle: UTRECHT_TITLE,
    textChars: String((shortRow.text || '').length),
  })

  console.log(
    JSON.stringify(
      {
        dryRun,
        changeCount: changes.length,
        resultingCount: nextBio.length,
        changes,
      },
      null,
      2,
    ),
  )

  if (dryRun) {
    console.log('dry-run only; no writes')
    process.exit(0)
  }

  await payload.update({
    collection: 'artists',
    id: artist.id,
    data: { bioTimelineEntries: nextBio },
    overrideAccess: true,
    overrideLock: true,
  })

  // Deleting a row does not fire rename redirects — record the retired slug explicitly.
  await recordSlugRedirect(payload, {
    fromPath: bioEntryPublicPath(UTRECHT_SHORT),
    toPath: bioEntryPublicPath(UTRECHT_FINAL),
    source: 'bio-entry',
  })

  console.log(`done: ${changes.length} bio change(s); Utrecht merge complete`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
