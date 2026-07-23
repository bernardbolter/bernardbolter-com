/**
 * Production-safe SQL migration for corpus relation + linchpin session fields.
 *
 * Do NOT use Payload Drizzle push on Netcup for this — it prompts to delete
 * unrelated legacy columns (events.organiser text, series width_cm, etc.).
 *
 * Usage (on Netcup, after git pull):
 *   npx tsx src/scripts/add-corpus-relation-fields-schema.ts
 *   npx tsx src/scripts/seed-venice-biennale-2007-corpus-relations.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env', override: true })
dotenv.config({ path: '.env.local', override: true })

import { getPayload } from 'payload'
import config from '@/payload.config'

type PgPool = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>
}

const RELATION_TYPE_ENUM = 'enum_artworks_related_works_at_making_relation_type'
const HINGE_TYPE_ENUM = 'enum_artworks_series_hinge_marker_hinge_type'
const SESSION_TYPE_ENUM = 'enum_sessions_session_type'
const RELATED_TABLE = 'artworks_related_works_at_making'

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

async function enumHasValue(pool: PgPool, enumName: string, value: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1 FROM pg_type t
     JOIN pg_enum e ON t.oid = e.enumtypid
     WHERE t.typname = $1 AND e.enumlabel = $2`,
    [enumName, value],
  )
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

async function createEnumIfMissing(
  pool: PgPool,
  enumName: string,
  values: readonly string[],
): Promise<void> {
  if (await enumExists(pool, enumName)) {
    console.log(`Enum ${enumName} already exists.`)
    return
  }
  const labels = values.map((value) => `'${value}'`).join(', ')
  await pool.query(`CREATE TYPE "public"."${enumName}" AS ENUM(${labels})`)
  console.log(`Created enum ${enumName}`)
}

async function addEnumValueIfMissing(
  pool: PgPool,
  enumName: string,
  value: string,
): Promise<void> {
  if (!(await enumExists(pool, enumName))) {
    console.warn(`Enum ${enumName} missing — skip adding value ${value}`)
    return
  }
  if (await enumHasValue(pool, enumName, value)) {
    console.log(`Enum value ${enumName}.${value} already exists.`)
    return
  }
  await pool.query(`ALTER TYPE "public"."${enumName}" ADD VALUE '${value}'`)
  console.log(`Added enum value ${enumName}.${value}`)
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

  console.log('Adding corpus relation + linchpin session schema (additive only)…')

  await createEnumIfMissing(pool, RELATION_TYPE_ENUM, [
    'paired',
    'concurrent',
    'predecessor',
    'successor',
  ])
  await createEnumIfMissing(pool, HINGE_TYPE_ENUM, ['series-end', 'series-start', 'both'])
  await addEnumValueIfMissing(pool, SESSION_TYPE_ENUM, 'corpus-revisit')

  // Artwork group: seriesHingeMarker
  await addColumnIfMissing(pool, 'artworks', 'series_hinge_marker_is_hinge', 'boolean DEFAULT false')
  await addColumnIfMissing(
    pool,
    'artworks',
    'series_hinge_marker_hinge_type',
    `"public"."${HINGE_TYPE_ENUM}"`,
  )
  await addColumnIfMissing(pool, 'artworks', 'series_hinge_marker_note', 'varchar')

  // Session: revisitOf + linchpinFlag
  await addColumnIfMissing(pool, 'sessions', 'revisit_of_id', 'integer')
  await addFkIfMissing(
    pool,
    'sessions',
    'revisit_of_id',
    'sessions',
    'sessions_revisit_of_id_fk',
    'SET NULL',
  )
  await pool.query(
    `CREATE INDEX IF NOT EXISTS "sessions_revisit_of_id_idx"
     ON "public"."sessions" USING btree ("revisit_of_id")`,
  )
  await addColumnIfMissing(pool, 'sessions', 'linchpin_flag_is_linchpin', 'boolean DEFAULT false')
  await addColumnIfMissing(pool, 'sessions', 'linchpin_flag_note', 'varchar')

  // Artwork array: relatedWorksAtMaking
  if (!(await tableExists(pool, RELATED_TABLE))) {
    await pool.query(`
      CREATE TABLE "public"."${RELATED_TABLE}" (
        "_order" integer NOT NULL,
        "_parent_id" integer NOT NULL,
        "id" character varying NOT NULL,
        "related_artwork_id" integer,
        "relation_type" "public"."${RELATION_TYPE_ENUM}",
        "note" character varying,
        "source_session_ref_id" integer,
        CONSTRAINT "${RELATED_TABLE}_pkey" PRIMARY KEY ("id")
      )
    `)
    await pool.query(
      `CREATE INDEX IF NOT EXISTS "${RELATED_TABLE}_order_idx"
       ON "public"."${RELATED_TABLE}" USING btree ("_order")`,
    )
    await pool.query(
      `CREATE INDEX IF NOT EXISTS "${RELATED_TABLE}_parent_id_idx"
       ON "public"."${RELATED_TABLE}" USING btree ("_parent_id")`,
    )
    await pool.query(
      `CREATE INDEX IF NOT EXISTS "${RELATED_TABLE}_related_artwork_id_idx"
       ON "public"."${RELATED_TABLE}" USING btree ("related_artwork_id")`,
    )
    await pool.query(
      `CREATE INDEX IF NOT EXISTS "${RELATED_TABLE}_source_session_ref_id_idx"
       ON "public"."${RELATED_TABLE}" USING btree ("source_session_ref_id")`,
    )
    console.log(`Created table ${RELATED_TABLE}`)
  } else {
    console.log(`Table ${RELATED_TABLE} already exists.`)
  }

  await addFkIfMissing(
    pool,
    RELATED_TABLE,
    '_parent_id',
    'artworks',
    `${RELATED_TABLE}_parent_id_fk`,
    'CASCADE',
  )
  await addFkIfMissing(
    pool,
    RELATED_TABLE,
    'related_artwork_id',
    'artworks',
    `${RELATED_TABLE}_related_artwork_id_fk`,
    'SET NULL',
  )
  await addFkIfMissing(
    pool,
    RELATED_TABLE,
    'source_session_ref_id',
    'sessions',
    `${RELATED_TABLE}_source_session_ref_id_fk`,
    'SET NULL',
  )

  console.log('Done. Safe to run the Venice seed script next.')
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
