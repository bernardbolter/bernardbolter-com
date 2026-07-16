/**
 * Production-safe SQL migration for sessions foundation / bio-statement capture fields.
 *
 * Payload Drizzle push is interactive (enum create-vs-rename prompts) and unreliable on
 * Netcup — use this instead.
 *
 * Usage (on Netcup, after git pull, before deploy):
 *   npx tsx src/scripts/add-sessions-foundation-schema.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env', override: true })
dotenv.config({ path: '.env.local', override: true })

import { getPayload } from 'payload'
import config from '@/payload.config'

type PgPool = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>
}

const VISIBILITY_ENUM = 'enum_artists_bio_timeline_entries_visibility'
const THROUGHLINE_VISIBILITY_ENUM = 'enum_artists_statement_throughlines_visibility'
const ABSTRACT_TARGET_ENUM = 'enum_sessions_proposed_abstracts_target_collection'
const ABSTRACT_STATUS_ENUM = 'enum_sessions_proposed_abstracts_status'
const SESSION_TYPE_ENUM = 'enum_sessions_session_type'

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

async function createArrayTable(
  pool: PgPool,
  tableName: string,
  columnsSql: string,
): Promise<void> {
  if (await tableExists(pool, tableName)) {
    console.log(`Table ${tableName} already exists.`)
    return
  }
  await pool.query(`
    CREATE TABLE "public"."${tableName}" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" character varying NOT NULL,
      ${columnsSql},
      CONSTRAINT "${tableName}_pkey" PRIMARY KEY ("id")
    )
  `)
  await pool.query(
    `CREATE INDEX IF NOT EXISTS "${tableName}_order_idx" ON "public"."${tableName}" USING btree ("_order")`,
  )
  await pool.query(
    `CREATE INDEX IF NOT EXISTS "${tableName}_parent_id_idx" ON "public"."${tableName}" USING btree ("_parent_id")`,
  )
  await addFkIfMissing(
    pool,
    tableName,
    '_parent_id',
    tableName.startsWith('sessions_') ? 'sessions' : 'artists',
    `${tableName}_parent_id_fk`,
    'CASCADE',
  )
  console.log(`Created table ${tableName}`)
}

async function createRelsTable(
  pool: PgPool,
  tableName: string,
  parentTable: string,
  parentIdType: 'integer' | 'character varying',
  relationColumns: Array<{ column: string; refTable: string }>,
): Promise<void> {
  if (!(await tableExists(pool, tableName))) {
    await pool.query(`
      CREATE TABLE "public"."${tableName}" (
        "id" serial PRIMARY KEY,
        "order" integer,
        "parent_id" ${parentIdType} NOT NULL,
        "path" character varying NOT NULL
      )
    `)
    await pool.query(
      `CREATE INDEX IF NOT EXISTS "${tableName}_order_idx" ON "public"."${tableName}" USING btree ("order")`,
    )
    await pool.query(
      `CREATE INDEX IF NOT EXISTS "${tableName}_parent_idx" ON "public"."${tableName}" USING btree ("parent_id")`,
    )
    await pool.query(
      `CREATE INDEX IF NOT EXISTS "${tableName}_path_idx" ON "public"."${tableName}" USING btree ("path")`,
    )
    await addFkIfMissing(
      pool,
      tableName,
      'parent_id',
      parentTable,
      `${tableName}_parent_fk`,
      'CASCADE',
    )
    console.log(`Created table ${tableName}`)
  } else {
    console.log(`Table ${tableName} already exists.`)
  }

  for (const rel of relationColumns) {
    await addColumnIfMissing(pool, tableName, rel.column, 'integer')
    await addFkIfMissing(
      pool,
      tableName,
      rel.column,
      rel.refTable,
      `${tableName}_${rel.column}_fk`,
      'CASCADE',
    )
    await pool.query(
      `CREATE INDEX IF NOT EXISTS "${tableName}_${rel.column}_idx"
       ON "public"."${tableName}" USING btree ("${rel.column}")`,
    )
  }
}

async function main() {
  const payload = await getPayload({ config })
  const pool = getPgPool(payload)

  console.log('Adding sessions foundation schema…')

  // --- Enums ---
  await createEnumIfMissing(pool, VISIBILITY_ENUM, ['public', 'private'])
  await createEnumIfMissing(pool, THROUGHLINE_VISIBILITY_ENUM, ['public', 'private'])
  await createEnumIfMissing(pool, ABSTRACT_TARGET_ENUM, [
    'bio-timeline',
    'statement-throughline',
  ])
  await createEnumIfMissing(pool, ABSTRACT_STATUS_ENUM, [
    'proposed',
    'accepted',
    'edited',
    'rejected',
  ])
  await addEnumValueIfMissing(pool, SESSION_TYPE_ENUM, 'connected-reading')
  await addEnumValueIfMissing(pool, SESSION_TYPE_ENUM, 'annual-snapshot')

  // --- Artist array tables ---
  await createArrayTable(
    pool,
    'artists_bio_timeline_entries',
    `"event_date" character varying,
     "text" character varying NOT NULL,
     "source_session_ref_id" integer,
     "visibility" "public"."${VISIBILITY_ENUM}" DEFAULT 'public'`,
  )
  await addFkIfMissing(
    pool,
    'artists_bio_timeline_entries',
    'source_session_ref_id',
    'sessions',
    'artists_bio_timeline_entries_source_session_ref_id_sessions_id_fk',
  )
  await pool.query(
    `CREATE INDEX IF NOT EXISTS "artists_bio_timeline_entries_source_session_ref_idx"
     ON "public"."artists_bio_timeline_entries" USING btree ("source_session_ref_id")`,
  )
  await createRelsTable(
    pool,
    'artists_bio_timeline_entries_rels',
    'artists_bio_timeline_entries',
    'character varying',
    [{ column: 'artworks_id', refTable: 'artworks' }],
  )

  await createArrayTable(
    pool,
    'artists_historical_bios',
    `"date" timestamp(3) with time zone NOT NULL,
     "full_text" jsonb NOT NULL,
     "context" character varying`,
  )

  await createArrayTable(
    pool,
    'artists_statement_throughlines',
    `"date_recognized" timestamp(3) with time zone,
     "text" character varying NOT NULL,
     "source_session_ref_id" integer,
     "visibility" "public"."${THROUGHLINE_VISIBILITY_ENUM}" DEFAULT 'public'`,
  )
  await addFkIfMissing(
    pool,
    'artists_statement_throughlines',
    'source_session_ref_id',
    'sessions',
    'artists_statement_throughlines_source_session_ref_id_sessions_id_fk',
  )
  await pool.query(
    `CREATE INDEX IF NOT EXISTS "artists_statement_throughlines_source_session_ref_idx"
     ON "public"."artists_statement_throughlines" USING btree ("source_session_ref_id")`,
  )
  await createRelsTable(
    pool,
    'artists_statement_throughlines_rels',
    'artists_statement_throughlines',
    'character varying',
    [
      { column: 'artworks_id', refTable: 'artworks' },
      { column: 'sessions_id', refTable: 'sessions' },
    ],
  )

  await createArrayTable(
    pool,
    'artists_historical_statements',
    `"date" timestamp(3) with time zone NOT NULL,
     "full_text" jsonb NOT NULL,
     "context" character varying`,
  )

  // --- Sessions fields ---
  await addColumnIfMissing(pool, 'sessions', 'primary_artwork_id', 'integer')
  await addFkIfMissing(
    pool,
    'sessions',
    'primary_artwork_id',
    'artworks',
    'sessions_primary_artwork_id_artworks_id_fk',
  )
  await pool.query(
    `CREATE INDEX IF NOT EXISTS "sessions_primary_artwork_idx"
     ON "public"."sessions" USING btree ("primary_artwork_id")`,
  )

  await createRelsTable(pool, 'sessions_rels', 'sessions', 'integer', [
    { column: 'artworks_id', refTable: 'artworks' },
  ])

  // Payload stores hasMany relationships nested in Artist arrays on artists_rels
  // (paths like bioTimelineEntries.linkedArtworkSlugs). Missing this table breaks
  // every depth>0 artists query — including homepage catalogue loads.
  await createRelsTable(pool, 'artists_rels', 'artists', 'integer', [
    { column: 'artworks_id', refTable: 'artworks' },
    { column: 'sessions_id', refTable: 'sessions' },
  ])

  await createArrayTable(
    pool,
    'sessions_proposed_abstracts',
    `"target_collection" "public"."${ABSTRACT_TARGET_ENUM}" NOT NULL,
     "text" character varying NOT NULL,
     "status" "public"."${ABSTRACT_STATUS_ENUM}" DEFAULT 'proposed',
     "event_date" character varying,
     "date_recognized" timestamp(3) with time zone`,
  )
  await createRelsTable(
    pool,
    'sessions_proposed_abstracts_rels',
    'sessions_proposed_abstracts',
    'character varying',
    [{ column: 'artworks_id', refTable: 'artworks' }],
  )

  console.log('Sessions foundation schema migration complete.')
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
