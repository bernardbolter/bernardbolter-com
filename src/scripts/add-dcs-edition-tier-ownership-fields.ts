/**
 * Add isOriginalTier and copies[] nested tables for dcs.editionTiers and megacities print editions.
 *
 * Usage: npx tsx src/scripts/add-dcs-edition-tier-ownership-fields.ts
 *
 * Prefer PAYLOAD_DATABASE_PUSH=true once if nested array tables are missing entirely.
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

import { getPayload } from 'payload'
import config from '@/payload.config'

type PgPool = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>
}

function getPgPool(payload: Awaited<ReturnType<typeof getPayload>>): PgPool {
  const pool = (payload.db as { pool?: PgPool } | undefined)?.pool
  if (!pool) throw new Error('Postgres pool not available on payload.db')
  return pool
}

async function columnExists(
  pool: PgPool,
  tableName: string,
  columnName: string,
): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = $1
       AND column_name = $2`,
    [tableName, columnName],
  )
  return rows.length > 0
}

async function tableExists(pool: PgPool, tableName: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name = $1`,
    [tableName],
  )
  return rows.length > 0
}

async function main() {
  const payload = await getPayload({ config })
  const pool = getPgPool(payload)

  if (
    (await tableExists(pool, 'artworks_dcs_edition_tiers')) &&
    !(await columnExists(pool, 'artworks_dcs_edition_tiers', 'is_original_tier'))
  ) {
    await pool.query(
      `ALTER TABLE "artworks_dcs_edition_tiers"
       ADD COLUMN "is_original_tier" boolean DEFAULT false`,
    )
    console.log('Added artworks_dcs_edition_tiers.is_original_tier')
  }

  if (
    (await tableExists(pool, 'artworks_megacities_print_editions')) &&
    !(await columnExists(pool, 'artworks_megacities_print_editions', 'is_original_tier'))
  ) {
    await pool.query(
      `ALTER TABLE "artworks_megacities_print_editions"
       ADD COLUMN "is_original_tier" boolean DEFAULT false`,
    )
    console.log('Added artworks_megacities_print_editions.is_original_tier')
  }

  console.log(
    'If copies[] nested tables are missing, run once with PAYLOAD_DATABASE_PUSH=true pnpm dev',
  )
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
