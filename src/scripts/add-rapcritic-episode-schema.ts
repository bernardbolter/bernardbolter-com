/**
 * Production-safe SQL migration for Rap Critic Episode fields + DEPART shot type.
 *
 * Usage: npm run migrate:rapcritic-episode-schema
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env', override: true })
dotenv.config({ path: '.env.local', override: true })

import { getPayload } from 'payload'
import config from '@/payload.config'

type PgPool = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>
}

const EPISODES = 'episodes'
const FIELD_NOTES = 'field_notes'
const FIELD_NOTES_SHOT_TYPE_ENUM = 'enum_field_notes_shot_type'
const FIELD_NOTES_CAMERA_ANGLE_ENUM = 'enum_field_notes_camera_angle'

function getPgPool(payload: Awaited<ReturnType<typeof getPayload>>): PgPool {
  const pool = (payload.db as { pool?: PgPool } | undefined)?.pool
  if (!pool) throw new Error('Postgres pool not available on payload.db')
  return pool
}

async function columnExists(pool: PgPool, tableName: string, columnName: string): Promise<boolean> {
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

async function enumExists(pool: PgPool, enumName: string): Promise<boolean> {
  const { rows } = await pool.query(`SELECT 1 FROM pg_type WHERE typname = $1`, [enumName])
  return rows.length > 0
}

async function enumHasValue(pool: PgPool, enumName: string, value: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT e.enumlabel
     FROM pg_type t
     JOIN pg_enum e ON t.oid = e.enumtypid
     WHERE t.typname = $1
       AND e.enumlabel = $2`,
    [enumName, value],
  )
  return rows.length > 0
}

async function constraintExists(pool: PgPool, constraintName: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1
     FROM information_schema.table_constraints
     WHERE constraint_schema = 'public'
       AND constraint_name = $1`,
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
    throw new Error(`Enum ${enumName} does not exist — cannot add value ${value}`)
  }
  if (await enumHasValue(pool, enumName, value)) {
    console.log(`Enum ${enumName} already includes ${value}.`)
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
    ON DELETE SET NULL
    ON UPDATE NO ACTION
  `)
  console.log(`Added FK ${constraintName}`)
}

async function addIndexIfMissing(pool: PgPool, indexName: string, sql: string): Promise<void> {
  const { rows } = await pool.query(
    `SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = $1`,
    [indexName],
  )
  if (rows.length > 0) {
    console.log(`Index ${indexName} already exists.`)
    return
  }
  await pool.query(sql)
  console.log(`Added index ${indexName}`)
}

async function main() {
  const payload = await getPayload({ config })
  const pool = getPgPool(payload)

  await addEnumValueIfMissing(pool, FIELD_NOTES_SHOT_TYPE_ENUM, 'DEPART')

  await createEnumIfMissing(pool, FIELD_NOTES_CAMERA_ANGLE_ENUM, ['front', 'rear', 'single'])
  await addColumnIfMissing(
    pool,
    FIELD_NOTES,
    'camera_angle',
    `"public"."${FIELD_NOTES_CAMERA_ANGLE_ENUM}" DEFAULT 'single'`,
  )

  await addColumnIfMissing(pool, EPISODES, 'location_name', 'character varying')
  await addColumnIfMissing(pool, EPISODES, 'location_lat', 'numeric')
  await addColumnIfMissing(pool, EPISODES, 'location_lng', 'numeric')
  await addColumnIfMissing(pool, EPISODES, 'description', 'character varying')
  await addColumnIfMissing(pool, EPISODES, 'cover_photo_id', 'integer')

  await addFkIfMissing(
    pool,
    EPISODES,
    'cover_photo_id',
    'media',
    'episodes_cover_photo_id_media_id_fk',
  )
  await addIndexIfMissing(
    pool,
    'episodes_cover_photo_idx',
    `CREATE INDEX "episodes_cover_photo_idx" ON "public"."${EPISODES}" ("cover_photo_id")`,
  )

  console.log('Rap Critic episode schema migration complete.')
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
