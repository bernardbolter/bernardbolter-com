/**
 * Ensure series_edition_tiers table exists and has vendure_product_id (v2 architecture).
 *
 * Usage: npx tsx src/scripts/add-series-edition-tiers-schema.ts
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

  if (!(await tableExists(pool, 'series_edition_tiers'))) {
    await pool.query(`
      CREATE TABLE "series_edition_tiers" (
        "id" serial PRIMARY KEY NOT NULL,
        "series_id" integer NOT NULL,
        "tier_name" varchar NOT NULL,
        "tier_order" numeric NOT NULL,
        "is_original_tier" boolean DEFAULT false,
        "edition_size" numeric NOT NULL,
        "ap_count" numeric DEFAULT 0,
        "width_cm" numeric,
        "height_cm" numeric,
        "substrate" varchar,
        "print_technique" varchar,
        "vendure_product_id" varchar,
        "notes" varchar,
        "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
        "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
      )
    `)
    await pool.query(`
      ALTER TABLE "series_edition_tiers"
      ADD CONSTRAINT "series_edition_tiers_series_id_series_id_fk"
      FOREIGN KEY ("series_id") REFERENCES "public"."series"("id")
      ON DELETE set null ON UPDATE no action
    `)
    await pool.query(
      `CREATE INDEX "series_edition_tiers_series_idx" ON "series_edition_tiers" USING btree ("series_id")`,
    )
    console.log('Created table series_edition_tiers')
  } else {
    console.log('Table series_edition_tiers already exists.')
  }

  if (
    (await tableExists(pool, 'series_edition_tiers')) &&
    !(await columnExists(pool, 'series_edition_tiers', 'vendure_product_id'))
  ) {
    await pool.query(
      `ALTER TABLE "series_edition_tiers" ADD COLUMN "vendure_product_id" varchar`,
    )
    console.log('Added series_edition_tiers.vendure_product_id')
  } else {
    console.log('Column series_edition_tiers.vendure_product_id already exists.')
  }

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
