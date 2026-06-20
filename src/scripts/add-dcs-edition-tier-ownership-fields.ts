/**
 * Add isOriginalTier columns and copies[] nested tables for dcs.editionTiers
 * and megacities.print.editions.
 *
 * Usage: npx tsx src/scripts/add-dcs-edition-tier-ownership-fields.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

import { getPayload } from 'payload'
import config from '@/payload.config'

type PgPool = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>
}

const CLAIM_STATUS_VALUES = [
  'unclaimed',
  'claimed-pending',
  'claimed-confirmed',
  'artist-held',
  'sold-secondary',
] as const

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

async function enumExists(pool: PgPool, enumName: string): Promise<boolean> {
  const { rows } = await pool.query(`SELECT 1 FROM pg_type WHERE typname = $1`, [enumName])
  return rows.length > 0
}

async function ensureClaimStatusEnum(pool: PgPool, enumName: string): Promise<void> {
  if (await enumExists(pool, enumName)) return

  const labels = CLAIM_STATUS_VALUES.map((v) => `'${v}'`).join(', ')
  await pool.query(`CREATE TYPE "public"."${enumName}" AS ENUM(${labels})`)
  console.log(`Created enum ${enumName}`)
}

async function ensureCopiesTable(
  pool: PgPool,
  tableName: string,
  parentTable: string,
  enumName: string,
): Promise<void> {
  if (await tableExists(pool, tableName)) {
    console.log(`Table ${tableName} already exists.`)
    return
  }

  await ensureClaimStatusEnum(pool, enumName)

  const fkName = `${tableName}_parent_id_fk`
  await pool.query(`
    CREATE TABLE "public"."${tableName}" (
      "_order" integer NOT NULL,
      "_parent_id" character varying NOT NULL,
      "id" character varying NOT NULL,
      "copy_number" character varying NOT NULL,
      "is_artist_proof" boolean DEFAULT false,
      "owner" character varying,
      "claim_status" "public"."${enumName}" DEFAULT 'unclaimed',
      "collector_visible" boolean DEFAULT false,
      "date_acquired" timestamp(3) with time zone,
      "claimed_copy_number_known" boolean DEFAULT false,
      "notes" character varying,
      CONSTRAINT "${tableName}_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "${fkName}" FOREIGN KEY ("_parent_id")
        REFERENCES "public"."${parentTable}"("id") ON DELETE CASCADE
    )
  `)
  console.log(`Created table ${tableName}`)
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

  await ensureCopiesTable(
    pool,
    'artworks_dcs_edition_tiers_copies',
    'artworks_dcs_edition_tiers',
    'enum_artworks_dcs_edition_tiers_copies_claim_status',
  )

  await ensureCopiesTable(
    pool,
    'artworks_megacities_print_editions_copies',
    'artworks_megacities_print_editions',
    'enum_artworks_megacities_print_editions_copies_claim_status',
  )

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
