/**
 * Additive SQL for Artist.plannedWorks array
 * (docs/corpus/planned-works-schema-addendum.md).
 *
 * Do NOT use interactive Drizzle push on Netcup.
 *
 * Usage:
 *   npx tsx src/scripts/add-planned-works-schema.ts
 *   npx tsx src/scripts/seed-planned-work-deutsche-skate-stadt.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env', override: true })
dotenv.config({ path: '.env.local', override: true })

import { getPayload } from 'payload'
import config from '@/payload.config'

type PgPool = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>
}

const STATUS_ENUM = 'enum_artists_planned_works_status'
const TABLE = 'artists_planned_works'
const RELS = 'artists_planned_works_rels'

function getPgPool(payload: Awaited<ReturnType<typeof getPayload>>): PgPool {
  const pool = (payload.db as { pool?: PgPool } | undefined)?.pool
  if (!pool) throw new Error('Postgres pool not available on payload.db')
  return pool
}

async function tableExists(pool: PgPool, tableName: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName],
  )
  return rows.length > 0
}

async function columnExists(pool: PgPool, tableName: string, columnName: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [tableName, columnName],
  )
  return rows.length > 0
}

async function enumExists(pool: PgPool, enumName: string): Promise<boolean> {
  const { rows } = await pool.query(`SELECT 1 FROM pg_type WHERE typname = $1`, [enumName])
  return rows.length > 0
}

async function constraintExists(pool: PgPool, constraintName: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1 FROM information_schema.table_constraints
     WHERE constraint_schema = 'public' AND constraint_name = $1`,
    [constraintName],
  )
  return rows.length > 0
}

async function addColumnIfMissing(
  pool: PgPool,
  tableName: string,
  columnName: string,
  definition: string,
): Promise<void> {
  if (await columnExists(pool, tableName, columnName)) {
    console.log(`Column ${tableName}.${columnName} already exists.`)
    return
  }
  await pool.query(`ALTER TABLE "public"."${tableName}" ADD COLUMN "${columnName}" ${definition}`)
  console.log(`Added ${tableName}.${columnName}`)
}

async function addFkIfMissing(
  pool: PgPool,
  tableName: string,
  columnName: string,
  refTable: string,
  constraintName: string,
  onDelete: 'SET NULL' | 'CASCADE' = 'SET NULL',
): Promise<void> {
  if (await constraintExists(pool, constraintName)) {
    console.log(`FK ${constraintName} already exists.`)
    return
  }
  await pool.query(`
    ALTER TABLE "public"."${tableName}"
    ADD CONSTRAINT "${constraintName}"
    FOREIGN KEY ("${columnName}")
    REFERENCES "public"."${refTable}"("id")
    ON DELETE ${onDelete}
    ON UPDATE NO ACTION
  `)
  console.log(`Added FK ${constraintName}`)
}

async function main() {
  const payload = await getPayload({ config })
  const pool = getPgPool(payload)

  console.log('Adding plannedWorks schema (additive only)…')

  if (!(await enumExists(pool, STATUS_ENUM))) {
    await pool.query(
      `CREATE TYPE "public"."${STATUS_ENUM}" AS ENUM('idea', 'blocked', 'active', 'complete-migrated')`,
    )
    console.log(`Created enum ${STATUS_ENUM}`)
  } else {
    console.log(`Enum ${STATUS_ENUM} already exists.`)
  }

  if (!(await tableExists(pool, TABLE))) {
    await pool.query(`
      CREATE TABLE "public"."${TABLE}" (
        "_order" integer NOT NULL,
        "_parent_id" integer NOT NULL,
        "id" character varying NOT NULL,
        "title" character varying NOT NULL,
        "motivating_note" character varying,
        "blocker" character varying,
        "related_series_id" integer,
        "status" "public"."${STATUS_ENUM}" DEFAULT 'idea',
        "date_named" timestamp(3) with time zone,
        "migrated_artwork_id" integer,
        CONSTRAINT "${TABLE}_pkey" PRIMARY KEY ("id")
      )
    `)
    await pool.query(
      `CREATE INDEX IF NOT EXISTS "${TABLE}_order_idx" ON "public"."${TABLE}" USING btree ("_order")`,
    )
    await pool.query(
      `CREATE INDEX IF NOT EXISTS "${TABLE}_parent_id_idx" ON "public"."${TABLE}" USING btree ("_parent_id")`,
    )
    await addFkIfMissing(pool, TABLE, '_parent_id', 'artists', `${TABLE}_parent_id_fk`, 'CASCADE')
    await addFkIfMissing(
      pool,
      TABLE,
      'related_series_id',
      'series',
      `${TABLE}_related_series_id_fk`,
      'SET NULL',
    )
    await addFkIfMissing(
      pool,
      TABLE,
      'migrated_artwork_id',
      'artworks',
      `${TABLE}_migrated_artwork_id_fk`,
      'SET NULL',
    )
    await pool.query(
      `CREATE INDEX IF NOT EXISTS "${TABLE}_related_series_idx"
       ON "public"."${TABLE}" USING btree ("related_series_id")`,
    )
    await pool.query(
      `CREATE INDEX IF NOT EXISTS "${TABLE}_migrated_artwork_idx"
       ON "public"."${TABLE}" USING btree ("migrated_artwork_id")`,
    )
    console.log(`Created table ${TABLE}`)
  } else {
    console.log(`Table ${TABLE} already exists.`)
  }

  if (!(await tableExists(pool, RELS))) {
    await pool.query(`
      CREATE TABLE "public"."${RELS}" (
        "id" serial PRIMARY KEY,
        "order" integer,
        "parent_id" character varying NOT NULL,
        "path" character varying NOT NULL,
        "artworks_id" integer
      )
    `)
    await pool.query(
      `CREATE INDEX IF NOT EXISTS "${RELS}_order_idx" ON "public"."${RELS}" USING btree ("order")`,
    )
    await pool.query(
      `CREATE INDEX IF NOT EXISTS "${RELS}_parent_idx" ON "public"."${RELS}" USING btree ("parent_id")`,
    )
    await pool.query(
      `CREATE INDEX IF NOT EXISTS "${RELS}_path_idx" ON "public"."${RELS}" USING btree ("path")`,
    )
    await addFkIfMissing(pool, RELS, 'parent_id', TABLE, `${RELS}_parent_fk`, 'CASCADE')
    await addFkIfMissing(pool, RELS, 'artworks_id', 'artworks', `${RELS}_artworks_fk`, 'CASCADE')
    console.log(`Created table ${RELS}`)
  } else {
    console.log(`Table ${RELS} already exists.`)
  }

  // Nested hasMany may also land on artists_rels — ensure series_id column exists
  if (await tableExists(pool, 'artists_rels')) {
    await addColumnIfMissing(pool, 'artists_rels', 'series_id', 'integer')
    await addFkIfMissing(
      pool,
      'artists_rels',
      'series_id',
      'series',
      'artists_rels_series_fk',
      'CASCADE',
    )
  }

  console.log('Done.')
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
