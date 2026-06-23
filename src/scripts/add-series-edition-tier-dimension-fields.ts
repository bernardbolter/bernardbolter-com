/**
 * Add dimension unit / whole+fraction fields to embedded series edition tiers
 * and ownership registry rows. Migrates legacy width_cm/height_cm and free-text substrate.
 *
 * Usage: npx tsx src/scripts/add-series-edition-tier-dimension-fields.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

import { getPayload } from 'payload'
import config from '@/payload.config'

type PgPool = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>
}

const SUBSTRATE_MAP: Record<string, string> = {
  paper: 'paper',
  'aluminum mount': 'aluminum-mount',
  'aluminum-mount': 'aluminum-mount',
  'aluminum dibond': 'aluminum-mount',
  canvas: 'canvas',
  'oil on canvas': 'oil-on-canvas',
  'oil-on-canvas': 'oil-on-canvas',
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

function normalizeSubstrate(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const mapped = SUBSTRATE_MAP[trimmed.toLowerCase()]
  if (mapped) return mapped
  if (trimmed.toLowerCase().includes('paper') || trimmed.toLowerCase().includes('hahnem')) {
    return 'paper'
  }
  return trimmed
}

async function addDimensionColumns(pool: PgPool, table: string) {
  const columns: Array<{ name: string; type: string }> = [
    { name: 'dimension_unit', type: 'character varying DEFAULT \'cm\'' },
    { name: 'width_whole', type: 'numeric' },
    { name: 'width_fraction', type: 'character varying' },
    { name: 'height_whole', type: 'numeric' },
    { name: 'height_fraction', type: 'character varying' },
  ]

  for (const column of columns) {
    if (await columnExists(pool, table, column.name)) {
      console.log(`Column ${table}.${column.name} already exists.`)
      continue
    }
    await pool.query(`ALTER TABLE "${table}" ADD COLUMN "${column.name}" ${column.type}`)
    console.log(`Added ${table}.${column.name}`)
  }
}

async function migrateLegacyDimensions(pool: PgPool, table: string) {
  if (!(await columnExists(pool, table, 'width_cm'))) return

  const { rowCount } = await pool.query(
    `UPDATE "${table}"
     SET dimension_unit = COALESCE(dimension_unit, 'cm'),
         width_whole = COALESCE(width_whole, width_cm),
         height_whole = COALESCE(height_whole, height_cm)
     WHERE width_cm IS NOT NULL OR height_cm IS NOT NULL`,
  )
  console.log(`Migrated width_cm/height_cm on ${table}: ${rowCount ?? 0} row(s).`)
}

async function normalizeSubstrateColumn(pool: PgPool, table: string) {
  if (!(await columnExists(pool, table, 'substrate'))) return

  const { rows } = await pool.query(`SELECT id, substrate FROM "${table}" WHERE substrate IS NOT NULL`)
  let updated = 0
  for (const row of rows) {
    const normalized = normalizeSubstrate(row.substrate)
    if (!normalized || normalized === row.substrate) continue
    await pool.query(`UPDATE "${table}" SET substrate = $1 WHERE id = $2`, [normalized, row.id])
    updated += 1
  }
  if (updated > 0) console.log(`Normalized substrate values on ${table}: ${updated} row(s).`)
}

async function addOwnershipRegistrySpecColumns(pool: PgPool) {
  const table = 'artworks_ownership_registry'
  if (!(await tableExists(pool, table))) {
    console.log(`Table ${table} not found — skipping.`)
    return
  }

  await addDimensionColumns(pool, table)

  for (const column of ['substrate', 'print_technique'] as const) {
    if (await columnExists(pool, table, column)) {
      console.log(`Column ${table}.${column} already exists.`)
      continue
    }
    await pool.query(`ALTER TABLE "${table}" ADD COLUMN "${column}" character varying`)
    console.log(`Added ${table}.${column}`)
  }

  await normalizeSubstrateColumn(pool, table)
}

async function main() {
  const payload = await getPayload({ config })
  const pool = getPgPool(payload)

  if (await tableExists(pool, 'series_edition_tiers')) {
    await addDimensionColumns(pool, 'series_edition_tiers')
    await migrateLegacyDimensions(pool, 'series_edition_tiers')
    await normalizeSubstrateColumn(pool, 'series_edition_tiers')
  } else {
    console.log('Table series_edition_tiers not found — skipping.')
  }

  await addOwnershipRegistrySpecColumns(pool)

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
