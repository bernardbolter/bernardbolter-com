/**
 * Add seriesEditionTier relation and vendureVariantId to dcs.editionTiers[].
 *
 * Usage: npx tsx src/scripts/add-dcs-edition-tier-v2-series-fields.ts
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

  if (!(await tableExists(pool, 'artworks_dcs_edition_tiers'))) {
    console.log('Table artworks_dcs_edition_tiers does not exist — run schema push first.')
    process.exit(1)
  }

  if (!(await columnExists(pool, 'artworks_dcs_edition_tiers', 'series_edition_tier_id'))) {
    await pool.query(
      `ALTER TABLE "artworks_dcs_edition_tiers"
       ADD COLUMN "series_edition_tier_id" integer`,
    )
    await pool.query(`
      ALTER TABLE "artworks_dcs_edition_tiers"
      ADD CONSTRAINT "artworks_dcs_edition_tiers_series_edition_tier_id_fk"
      FOREIGN KEY ("series_edition_tier_id")
      REFERENCES "public"."series_edition_tiers"("id")
      ON DELETE set null ON UPDATE no action
    `)
    await pool.query(
      `CREATE INDEX "artworks_dcs_edition_tiers_series_edition_tier_idx"
       ON "artworks_dcs_edition_tiers" USING btree ("series_edition_tier_id")`,
    )
    console.log('Added artworks_dcs_edition_tiers.series_edition_tier_id')
  } else {
    console.log('Column artworks_dcs_edition_tiers.series_edition_tier_id already exists.')
  }

  if (!(await columnExists(pool, 'artworks_dcs_edition_tiers', 'vendure_variant_id'))) {
    await pool.query(
      `ALTER TABLE "artworks_dcs_edition_tiers"
       ADD COLUMN "vendure_variant_id" varchar`,
    )
    console.log('Added artworks_dcs_edition_tiers.vendure_variant_id')
  } else {
    console.log('Column artworks_dcs_edition_tiers.vendure_variant_id already exists.')
  }

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
