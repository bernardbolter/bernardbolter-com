/**
 * Add Stage 1 schema: series_edition_tiers collection, hasEditions,
 * seriesEditionTier on ownershipRegistry, seriesUntrackedEditionsNote on Series.
 *
 * Usage: npx tsx src/scripts/add-series-edition-tiers-schema.ts
 *
 * Alternative: PAYLOAD_DATABASE_PUSH=true pnpm dev (once), then unset the env var.
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

  if (!(await columnExists(pool, 'artworks', 'has_editions'))) {
    await pool.query(
      `ALTER TABLE "artworks" ADD COLUMN "has_editions" varchar DEFAULT 'none'`,
    )
    console.log('Added artworks.has_editions')
  } else {
    console.log('Column artworks.has_editions already exists.')
  }

  if (!(await columnExists(pool, 'artworks_ownership_registry', 'series_edition_tier_id'))) {
    await pool.query(
      `ALTER TABLE "artworks_ownership_registry"
       ADD COLUMN "series_edition_tier_id" integer`,
    )
    await pool.query(`
      ALTER TABLE "artworks_ownership_registry"
      ADD CONSTRAINT "artworks_ownership_registry_series_edition_tier_id_series_edition_tiers_id_fk"
      FOREIGN KEY ("series_edition_tier_id") REFERENCES "public"."series_edition_tiers"("id")
      ON DELETE set null ON UPDATE no action
    `)
    console.log('Added artworks_ownership_registry.series_edition_tier_id')
  } else {
    console.log('Column artworks_ownership_registry.series_edition_tier_id already exists.')
  }

  if (!(await columnExists(pool, 'series_locales', 'series_untracked_editions_note'))) {
    if (await tableExists(pool, 'series_locales')) {
      await pool.query(
        `ALTER TABLE "series_locales" ADD COLUMN "series_untracked_editions_note" varchar`,
      )
      console.log('Added series_locales.series_untracked_editions_note')
    } else if (!(await columnExists(pool, 'series', 'series_untracked_editions_note'))) {
      await pool.query(
        `ALTER TABLE "series" ADD COLUMN "series_untracked_editions_note" varchar`,
      )
      console.log('Added series.series_untracked_editions_note')
    }
  } else {
    console.log('Column series_locales.series_untracked_editions_note already exists.')
  }

  // Inline ownership registry fields are now optional fallbacks.
  await pool.query(
    `ALTER TABLE "artworks_ownership_registry" ALTER COLUMN "tier_label" DROP NOT NULL`,
  ).catch(() => undefined)
  await pool.query(
    `ALTER TABLE "artworks_ownership_registry" ALTER COLUMN "tier_order" DROP NOT NULL`,
  ).catch(() => undefined)
  await pool.query(
    `ALTER TABLE "artworks_ownership_registry" ALTER COLUMN "edition_size" DROP NOT NULL`,
  ).catch(() => undefined)

  if (
    (await tableExists(pool, 'payload_locked_documents_rels')) &&
    !(await columnExists(pool, 'payload_locked_documents_rels', 'series_edition_tiers_id'))
  ) {
    await pool.query(
      `ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "series_edition_tiers_id" integer`,
    )
    await pool.query(`
      ALTER TABLE "payload_locked_documents_rels"
      ADD CONSTRAINT "payload_locked_documents_rels_series_edition_tiers_fk"
      FOREIGN KEY ("series_edition_tiers_id") REFERENCES "public"."series_edition_tiers"("id")
      ON DELETE cascade ON UPDATE no action
    `).catch(() => undefined)
    console.log('Added payload_locked_documents_rels.series_edition_tiers_id')
  }

  console.log('Stage 1 schema migration complete.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
