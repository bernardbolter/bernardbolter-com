/**
 * Migrate series_edition_tiers from standalone collection table → embedded array on series.
 * Also adds series_tier_key on artwork edition rows and drops series_edition_tier_id FKs.
 *
 * Run before: npx tsx src/scripts/migrate-series-edition-tiers-to-series.ts
 *
 * Usage: npx tsx src/scripts/migrate-series-edition-tiers-embedded-schema.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

import { randomUUID } from 'crypto'

import { getPayload } from 'payload'
import config from '@/payload.config'

import { slugifySeriesTierKey } from '@/lib/artwork/seriesEditionTiers'

type PgPool = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>
}

const SERIES_TIER_NAME_TO_KEY: Record<string, string> = {
  'Monumental Edition': 'monumental',
  'Collectors print': 'collectors-print',
  'Small print': 'small-print',
  'Full size': 'full-size',
  A0: 'a0',
  A1: 'a1',
}

const DCS_TIER_NAME_TO_KEY: Record<string, string> = {
  monumental: 'monumental',
  'collectors-print': 'collectors-print',
  'small-print': 'small-print',
  'oil-painting': 'oil-painting',
}

const MEGACITIES_TIER_TO_KEY: Record<string, string> = {
  full_size: 'full-size',
  a0: 'a0',
  a1: 'a1',
}

function getPgPool(payload: Awaited<ReturnType<typeof getPayload>>): PgPool {
  const pool = (payload.db as { pool?: PgPool } | undefined)?.pool
  if (!pool) throw new Error('Postgres pool not available on payload.db')
  return pool
}

async function columnExists(pool: PgPool, table: string, column: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [table, column],
  )
  return rows.length > 0
}

async function tableExists(pool: PgPool, table: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [table],
  )
  return rows.length > 0
}

async function dropForeignKeysToTable(pool: PgPool, referencedTable: string) {
  const { rows } = await pool.query(
    `SELECT tc.table_name, tc.constraint_name
     FROM information_schema.table_constraints tc
     JOIN information_schema.constraint_column_usage ccu
       ON ccu.constraint_name = tc.constraint_name
     WHERE tc.constraint_type = 'FOREIGN KEY'
       AND ccu.table_name = $1`,
    [referencedTable],
  )

  for (const row of rows) {
    const tableName = row.table_name as string
    const constraintName = row.constraint_name as string
    await pool.query(`ALTER TABLE "public"."${tableName}" DROP CONSTRAINT "${constraintName}"`)
    console.log(`Dropped FK ${constraintName} on ${tableName}`)
  }
}

function tierKeyForName(tierName: string): string {
  return SERIES_TIER_NAME_TO_KEY[tierName] ?? slugifySeriesTierKey(tierName)
}

async function migrateLegacyCollectionTable(pool: PgPool): Promise<Map<number, string>> {
  const idToKey = new Map<number, string>()

  if (!(await tableExists(pool, 'series_edition_tiers'))) {
    console.log('No series_edition_tiers table — will create embedded array table.')
    return idToKey
  }

  if (await columnExists(pool, 'series_edition_tiers', '_parent_id')) {
    console.log('series_edition_tiers already uses embedded array shape (_parent_id).')
    const { rows } = await pool.query(
      `SELECT id, tier_key FROM series_edition_tiers WHERE tier_key IS NOT NULL`,
    )
    for (const row of rows) {
      // embedded rows use varchar id, not useful for legacy int map
    }
    return idToKey
  }

  if (!(await columnExists(pool, 'series_edition_tiers', 'series_id'))) {
    console.log('series_edition_tiers exists but is not legacy collection — skipping reshape.')
    return idToKey
  }

  const { rows: legacyRows } = await pool.query(
    `SELECT id, series_id, tier_name, tier_order, is_original_tier, edition_size, ap_count,
            width_cm, height_cm, substrate, print_technique, vendure_product_id, notes
     FROM series_edition_tiers
     ORDER BY series_id, tier_order`,
  )

  for (const row of legacyRows) {
    idToKey.set(Number(row.id), tierKeyForName(String(row.tier_name)))
  }

  await dropForeignKeysToTable(pool, 'series_edition_tiers')
  await pool.query(`DROP TABLE "series_edition_tiers"`)
  console.log('Dropped legacy series_edition_tiers collection table.')

  await pool.query(`
    CREATE TABLE "series_edition_tiers" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" character varying NOT NULL,
      "tier_key" character varying NOT NULL,
      "tier_name" character varying NOT NULL,
      "tier_order" numeric NOT NULL,
      "is_original_tier" boolean DEFAULT false,
      "edition_size" numeric NOT NULL,
      "ap_count" numeric DEFAULT 0,
      "width_cm" numeric,
      "height_cm" numeric,
      "substrate" character varying,
      "print_technique" character varying,
      "vendure_product_id" character varying,
      "notes" character varying,
      CONSTRAINT "series_edition_tiers_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "series_edition_tiers_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."series"("id") ON DELETE CASCADE
    )
  `)
  await pool.query(
    `CREATE INDEX "series_edition_tiers_parent_id_idx"
     ON "series_edition_tiers" USING btree ("_parent_id")`,
  )
  console.log('Created embedded series_edition_tiers array table.')

  const orderBySeries = new Map<number, number>()
  for (const row of legacyRows) {
    const seriesId = Number(row.series_id)
    const order = orderBySeries.get(seriesId) ?? 0
    orderBySeries.set(seriesId, order + 1)

    const tierKey = tierKeyForName(String(row.tier_name))
    await pool.query(
      `INSERT INTO series_edition_tiers
       (_order, _parent_id, id, tier_key, tier_name, tier_order, is_original_tier,
        edition_size, ap_count, width_cm, height_cm, substrate, print_technique,
        vendure_product_id, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        order,
        seriesId,
        randomUUID(),
        tierKey,
        row.tier_name,
        row.tier_order,
        row.is_original_tier ?? false,
        row.edition_size,
        row.ap_count ?? 0,
        row.width_cm,
        row.height_cm,
        row.substrate,
        row.print_technique,
        row.vendure_product_id,
        row.notes,
      ],
    )
  }

  console.log(`Migrated ${legacyRows.length} tier row(s) into series.editionTiers[].`)
  return idToKey
}

async function ensureEmbeddedTable(pool: PgPool) {
  if (await tableExists(pool, 'series_edition_tiers')) return

  await pool.query(`
    CREATE TABLE "series_edition_tiers" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" character varying NOT NULL,
      "tier_key" character varying NOT NULL,
      "tier_name" character varying NOT NULL,
      "tier_order" numeric NOT NULL,
      "is_original_tier" boolean DEFAULT false,
      "edition_size" numeric NOT NULL,
      "ap_count" numeric DEFAULT 0,
      "width_cm" numeric,
      "height_cm" numeric,
      "substrate" character varying,
      "print_technique" character varying,
      "vendure_product_id" character varying,
      "notes" character varying,
      CONSTRAINT "series_edition_tiers_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "series_edition_tiers_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."series"("id") ON DELETE CASCADE
    )
  `)
  await pool.query(
    `CREATE INDEX "series_edition_tiers_parent_id_idx"
     ON "series_edition_tiers" USING btree ("_parent_id")`,
  )
  console.log('Created empty embedded series_edition_tiers table.')
}

async function migrateArtworkTierKeys(
  pool: PgPool,
  tableName: string,
  idToKey: Map<number, string>,
  tierNameColumn: string,
  megacitiesTierColumn?: string,
) {
  if (!(await tableExists(pool, tableName))) return

  if (!(await columnExists(pool, tableName, 'series_tier_key'))) {
    await pool.query(`ALTER TABLE "${tableName}" ADD COLUMN "series_tier_key" varchar`)
    console.log(`Added ${tableName}.series_tier_key`)
  }

  if (await columnExists(pool, tableName, 'series_edition_tier_id')) {
    const { rows } = await pool.query(
      `SELECT id, series_edition_tier_id, ${tierNameColumn}${megacitiesTierColumn ? `, ${megacitiesTierColumn}` : ''}
       FROM "${tableName}"
       WHERE series_tier_key IS NULL`,
    )

    for (const row of rows) {
      const legacyId =
        row.series_edition_tier_id != null ? Number(row.series_edition_tier_id) : null
      const tierName = row[tierNameColumn] != null ? String(row[tierNameColumn]) : ''
      const megTier = megacitiesTierColumn && row[megacitiesTierColumn] != null
        ? String(row[megacitiesTierColumn])
        : ''

      const tierKey =
        (legacyId != null ? idToKey.get(legacyId) : undefined) ||
        (tierName ? DCS_TIER_NAME_TO_KEY[tierName] : undefined) ||
        (megTier ? MEGACITIES_TIER_TO_KEY[megTier] : undefined)

      if (!tierKey) continue

      await pool.query(`UPDATE "${tableName}" SET series_tier_key = $1 WHERE id = $2`, [
        tierKey,
        row.id,
      ])
    }

    await dropForeignKeysToTable(pool, 'series_edition_tiers')
    await pool.query(`ALTER TABLE "${tableName}" DROP COLUMN IF EXISTS "series_edition_tier_id"`)
    console.log(`Dropped ${tableName}.series_edition_tier_id`)
  }
}

async function main() {
  const payload = await getPayload({ config })
  const pool = getPgPool(payload)

  const idToKey = await migrateLegacyCollectionTable(pool)
  await ensureEmbeddedTable(pool)

  await migrateArtworkTierKeys(pool, 'artworks_dcs_edition_tiers', idToKey, 'tier_name')
  await migrateArtworkTierKeys(
    pool,
    'artworks_megacities_print_editions',
    idToKey,
    'tier',
    'tier',
  )

  console.log('\nSchema migration complete. Run: npx tsx src/scripts/migrate-series-edition-tiers-to-series.ts')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
