/**
 * Add seriesEditionTier relation and vendureVariantId to megacities.print.editions[].
 *
 * Usage: npx tsx src/scripts/add-megacities-edition-tier-v2-series-fields.ts
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
  const tableName = 'artworks_megacities_print_editions'

  if (!(await tableExists(pool, tableName))) {
    console.log(`Table ${tableName} does not exist — run schema push first.`)
    process.exit(1)
  }

  if (!(await columnExists(pool, tableName, 'series_edition_tier_id'))) {
    await pool.query(
      `ALTER TABLE "${tableName}"
       ADD COLUMN "series_edition_tier_id" integer`,
    )
    await pool.query(`
      ALTER TABLE "${tableName}"
      ADD CONSTRAINT "${tableName}_series_edition_tier_id_fk"
      FOREIGN KEY ("series_edition_tier_id")
      REFERENCES "public"."series_edition_tiers"("id")
      ON DELETE set null ON UPDATE no action
    `)
    await pool.query(
      `CREATE INDEX "${tableName}_series_edition_tier_idx"
       ON "${tableName}" USING btree ("series_edition_tier_id")`,
    )
    console.log(`Added ${tableName}.series_edition_tier_id`)
  } else {
    console.log(`Column ${tableName}.series_edition_tier_id already exists.`)
  }

  if (!(await columnExists(pool, tableName, 'vendure_variant_id'))) {
    await pool.query(
      `ALTER TABLE "${tableName}"
       ADD COLUMN "vendure_variant_id" varchar`,
    )
    console.log(`Added ${tableName}.vendure_variant_id`)
  } else {
    console.log(`Column ${tableName}.vendure_variant_id already exists.`)
  }

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
