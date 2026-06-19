/**
 * Allow relation-only DCS edition tiers — tier_name and total_edition_size
 * may be null when series_edition_tier_id is populated (v2 architecture).
 *
 * Usage: npx tsx src/scripts/relax-dcs-edition-tier-fallback-nullability.ts
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

async function columnIsNullable(
  pool: PgPool,
  tableName: string,
  columnName: string,
): Promise<boolean | null> {
  const { rows } = await pool.query(
    `SELECT is_nullable
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = $1
       AND column_name = $2`,
    [tableName, columnName],
  )
  if (rows.length === 0) return null
  return rows[0].is_nullable === 'YES'
}

async function relaxNotNull(pool: PgPool, columnName: string): Promise<void> {
  const nullable = await columnIsNullable(pool, 'artworks_dcs_edition_tiers', columnName)
  if (nullable == null) {
    console.log(`Column ${columnName} not found — skipping.`)
    return
  }
  if (nullable) {
    console.log(`Column ${columnName} already nullable.`)
    return
  }

  await pool.query(
    `ALTER TABLE "public"."artworks_dcs_edition_tiers"
     ALTER COLUMN "${columnName}" DROP NOT NULL`,
  )
  console.log(`Relaxed NOT NULL on artworks_dcs_edition_tiers.${columnName}`)
}

async function main() {
  const payload = await getPayload({ config })
  const pool = getPgPool(payload)

  await relaxNotNull(pool, 'tier_name')
  await relaxNotNull(pool, 'total_edition_size')

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
