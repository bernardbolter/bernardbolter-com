/**
 * Backfill slugs + discoveryExcerpt for Venice-era bio entries and throughline
 * (docs/corpus/bio-throughline-permalink-pages-spec.md Step 8).
 *
 * Writes directly via SQL so artist updates do not hydrate Sessions
 * (avoids failing when unrelated session schema tables are missing).
 *
 * Idempotent: skips rows that already have discoveryExcerpt; always ensures slugs.
 *
 * Usage: npx tsx src/scripts/backfill-bio-throughline-permalinks.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env', override: true })
dotenv.config({ path: '.env.local', override: true })

import { getPayload } from 'payload'
import config from '@/payload.config'

import { plainToLexical } from '@/lib/artOfficial/plainToLexical'
import { slugifyArtworkTitle } from '@/lib/artOfficial/quickUploadDerived'

type PgPool = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>
}

const BIO_TABLE = 'artists_bio_timeline_entries'
const THROUGHLINE_TABLE = 'artists_statement_throughlines'

const TARGETS = [
  {
    table: BIO_TABLE,
    match: 'after the sfmoma guerrilla installation, a three-part series attempting to bring photographs back into painting',
    slugHint: 'sfmoma-guerrilla-1996-seed',
    excerpt:
      'In the Venice Biennale 2007 session, Bolter traced the Breaking Down Art series back past Venice to its origin: after the SFMOMA guerrilla installation, a three-part series trying to bring photographs back into painting "didn\'t all work out" — then ~30 written ideas about art that became the seed of the series.',
    permalinkPrefix: '/bio/entries',
  },
  {
    table: BIO_TABLE,
    match: 'on a rietveld akademie school trip to the venice biennale',
    slugHint: 'venice-biennale-2007-doubled-operation',
    excerpt:
      'Cataloguing Venice Biennale 2007 surfaced a doubled operation unrecognized at the time: photographing Breaking Down Art material from inside the Arsenale while shooting the Venice DCS scene from just outside the same building — on a Rietveld Akademie school trip.',
    permalinkPrefix: '/bio/entries',
  },
  {
    table: THROUGHLINE_TABLE,
    match: 'a recurring inside/outside position',
    slugHint: 'inside-outside-position',
    excerpt:
      "Named in the same Venice/Münster linchpin session: a recurring inside/outside position — in 2007–08 working from inside the art-school system, half in awe of a world he wasn't sure he belonged to; now fully outside it, on his own path — and that outside position may be exactly what's needed to return to Breaking Down Art's unfinished questions.",
    permalinkPrefix: '/statement/throughlines',
  },
] as const

function getPgPool(payload: Awaited<ReturnType<typeof getPayload>>): PgPool {
  const pool = (payload.db as { pool?: PgPool } | undefined)?.pool
  if (!pool) throw new Error('Postgres pool not available on payload.db')
  return pool
}

function textKey(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ')
}

function hasDiscoveryExcerpt(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const root = (value as { root?: { children?: unknown[] } }).root
  return Boolean(root?.children?.length)
}

async function main() {
  const payload = await getPayload({ config })
  const pool = getPgPool(payload)
  const usedSlugs = new Set<string>()

  // Collect existing slugs so collision suffix stays unique across both tables
  for (const table of [BIO_TABLE, THROUGHLINE_TABLE]) {
    const { rows } = await pool.query(
      `SELECT slug FROM "public"."${table}" WHERE slug IS NOT NULL AND trim(slug) <> ''`,
    )
    for (const row of rows) {
      if (typeof row.slug === 'string' && row.slug.trim()) usedSlugs.add(row.slug.trim())
    }
  }

  console.log('Backfilling bio/throughline slugs + discoveryExcerpt via SQL…')

  for (const target of TARGETS) {
    const { rows } = await pool.query(
      `SELECT id, text, slug, discovery_excerpt
       FROM "public"."${target.table}"`,
    )
    const row = rows.find((r) => textKey(String(r.text ?? '')).includes(target.match))
    if (!row) {
      console.warn(`No row matched in ${target.table} for: ${target.match.slice(0, 48)}…`)
      continue
    }

    let slug = typeof row.slug === 'string' && row.slug.trim() ? row.slug.trim() : ''
    if (!slug) {
      slug = target.slugHint
      while (usedSlugs.has(slug)) slug = `${slug}-x`
      usedSlugs.add(slug)
      await pool.query(`UPDATE "public"."${target.table}" SET slug = $1 WHERE id = $2`, [
        slug,
        row.id,
      ])
      console.log(`Set slug ${slug} on ${target.table} ${row.id}`)
    } else {
      usedSlugs.add(slug)
      console.log(`Slug already set (${slug}) — skip`)
    }

    if (hasDiscoveryExcerpt(row.discovery_excerpt)) {
      console.log(`discoveryExcerpt already present on ${slug} — skip excerpt`)
    } else {
      const excerpt = plainToLexical(target.excerpt)
      await pool.query(
        `UPDATE "public"."${target.table}" SET discovery_excerpt = $1::jsonb WHERE id = $2`,
        [JSON.stringify(excerpt), row.id],
      )
      console.log(`Backfilled discoveryExcerpt for ${slug}`)
    }

    console.log(`  ${target.permalinkPrefix}/${slug}`)
  }

  // Any other bio/throughline rows missing slug
  for (const table of [BIO_TABLE, THROUGHLINE_TABLE]) {
    const { rows } = await pool.query(
      `SELECT id, text, slug FROM "public"."${table}"
       WHERE slug IS NULL OR trim(slug) = ''`,
    )
    for (const row of rows) {
      let slug = slugifyArtworkTitle(String(row.text ?? row.id ?? 'entry'))
      while (usedSlugs.has(slug)) slug = `${slug}-x`
      usedSlugs.add(slug)
      await pool.query(`UPDATE "public"."${table}" SET slug = $1 WHERE id = $2`, [slug, row.id])
      console.log(`Set fallback slug ${slug} on ${table} ${row.id}`)
    }
  }

  console.log('Done.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
