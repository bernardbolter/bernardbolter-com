/**
 * Generate 400w / 800w / 1200w R2 derivatives locally — no pg-boss worker required.
 *
 * Usage:
 *   npm run backfill:images:local                    # all published artworks
 *   npm run backfill:images:local -- --limit 3       # smoke test
 *   npm run backfill:images:local -- --slug gates-iii
 *   npm run backfill:images:local -- --dry-run       # list targets only
 *
 * Requires .env / .env.local with DATABASE_URL and R2_* credentials.
 * Safe to re-run: skips derivatives that already exist in R2.
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

import { backfillArtworkImageDerivatives } from '@/lib/media/backfillArtworkImageDerivatives'

function parseArgs(argv: string[]) {
  let limit: number | undefined
  let slug: string | undefined
  let dryRun = false

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--dry-run') {
      dryRun = true
      continue
    }
    if (arg === '--limit' && argv[i + 1]) {
      limit = Number.parseInt(argv[i + 1]!, 10)
      i += 1
      continue
    }
    if (arg === '--slug' && argv[i + 1]) {
      slug = argv[i + 1]
      i += 1
    }
  }

  return { limit, slug, dryRun }
}

async function main() {
  const { limit, slug, dryRun } = parseArgs(process.argv.slice(2))

  if (dryRun) {
    console.log('Dry run — listing targets only (no resize/upload).')
  }
  if (slug) {
    console.log(`Filtering to slug: ${slug}`)
  }
  if (limit) {
    console.log(`Limit: ${limit}`)
  }

  const summary = await backfillArtworkImageDerivatives({
    slug,
    limit,
    dryRun,
    onArtworkResult: ({ slug: artworkSlug, imageUrl, result, error }) => {
      if (error) {
        console.error(`[skip] ${artworkSlug}: ${error}`)
        return
      }
      if (!result) {
        console.log(`[dry-run] ${artworkSlug} ← ${imageUrl}`)
        return
      }
      const parts = [
        result.generated.length ? `generated ${result.generated.join(', ')}` : null,
        result.skipped.length ? `skipped ${result.skipped.join(', ')}` : null,
        result.errors.length ? `errors ${result.errors.map((e) => e.suffix).join(', ')}` : null,
      ].filter(Boolean)
      console.log(`[ok] ${artworkSlug}: ${parts.join(' · ') || 'no changes'}`)
    },
  })

  console.log('\nBackfill complete:', summary)
  process.exit(summary.errored > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
