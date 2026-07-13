/**
 * Production-safe SQL migration for capture-presets + field-notes pipeline fields.
 *
 * Payload only runs Drizzle push when NODE_ENV !== 'production', so one-off push
 * scripts are unreliable on Netcup. This mirrors add-people-schema.ts / add-vision-schema.ts.
 *
 * Usage: npm run migrate:fieldnotes-pipeline
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env', override: true })
dotenv.config({ path: '.env.local', override: true })

import { getPayload } from 'payload'
import config from '@/payload.config'

type PgPool = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>
}

const CAPTURE_PRESETS = 'capture_presets'
const CAPTURE_PRESETS_PIPELINE_STEPS = 'capture_presets_pipeline_steps'
const FIELD_NOTES = 'field_notes'
const LOCKED_DOCS_RELS = 'payload_locked_documents_rels'

const CAPTURE_PRESETS_MEDIA_TYPE_ENUM = 'enum_capture_presets_media_type'
const CAPTURE_PRESETS_PIPELINE_STEPS_ENUM = 'enum_capture_presets_pipeline_steps'
const CAPTURE_PRESETS_TRANSCRIPT_LABEL_ENUM = 'enum_capture_presets_transcript_label'
const FIELD_NOTES_SHOT_TYPE_ENUM = 'enum_field_notes_shot_type'
const FIELD_NOTES_VERDICT_ENUM = 'enum_field_notes_verdict'
const FIELD_NOTES_SLATE_PARSE_STATUS_ENUM = 'enum_field_notes_slate_parse_status'
const FIELD_NOTES_PROCESSING_STATUS_ENUM = 'enum_field_notes_processing_status'

const MEDIA_TYPES = [
  'text',
  'photo',
  'video-broll',
  'video-observation',
  'video-performance',
  'video-process',
  'voice-memo',
] as const

const PIPELINE_STEPS = ['keyframes', 'moondream', 'whisper', 'slateParse'] as const

const TRANSCRIPT_LABELS = ['shooter-description', 'speech', 'none'] as const

const SHOT_TYPES = [
  'HOOK',
  'VERSE',
  'ARRIVE',
  'DETAIL',
  'WIDE',
  'WALK',
  'CROWD',
  'TALK',
  'AMBIENT',
  'BTS',
] as const

const VERDICTS = ['keeper', 'scrap', 'maybe'] as const

const SLATE_PARSE_STATUSES = ['parsed', 'not-found', 'partial'] as const

function getPgPool(payload: Awaited<ReturnType<typeof getPayload>>): PgPool {
  const pool = (payload.db as { pool?: PgPool } | undefined)?.pool
  if (!pool) throw new Error('Postgres pool not available on payload.db')
  return pool
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

async function createCapturePresetsTable(pool: PgPool): Promise<void> {
  await createEnumIfMissing(pool, CAPTURE_PRESETS_MEDIA_TYPE_ENUM, MEDIA_TYPES)
  await createEnumIfMissing(pool, CAPTURE_PRESETS_TRANSCRIPT_LABEL_ENUM, TRANSCRIPT_LABELS)

  if (await tableExists(pool, CAPTURE_PRESETS)) {
    console.log(`Table ${CAPTURE_PRESETS} already exists.`)
    return
  }

  await pool.query(`
    CREATE TABLE "public"."${CAPTURE_PRESETS}" (
      "id" serial PRIMARY KEY,
      "name" character varying NOT NULL,
      "media_type" "public"."${CAPTURE_PRESETS_MEDIA_TYPE_ENUM}" NOT NULL,
      "default_episode" character varying,
      "default_location_name" character varying,
      "transcript_label" "public"."${CAPTURE_PRESETS_TRANSCRIPT_LABEL_ENUM}" DEFAULT 'speech' NOT NULL,
      "keyframe_interval_sec" numeric DEFAULT 10 NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    )
  `)
  console.log(`Created table ${CAPTURE_PRESETS}`)
}

async function createCapturePresetsPipelineStepsTable(pool: PgPool): Promise<void> {
  await createEnumIfMissing(pool, CAPTURE_PRESETS_PIPELINE_STEPS_ENUM, PIPELINE_STEPS)

  if (await tableExists(pool, CAPTURE_PRESETS_PIPELINE_STEPS)) {
    console.log(`Table ${CAPTURE_PRESETS_PIPELINE_STEPS} already exists.`)
    return
  }

  await pool.query(`
    CREATE TABLE "public"."${CAPTURE_PRESETS_PIPELINE_STEPS}" (
      "order" integer NOT NULL,
      "parent_id" integer NOT NULL,
      "value" "public"."${CAPTURE_PRESETS_PIPELINE_STEPS_ENUM}",
      "id" serial PRIMARY KEY,
      CONSTRAINT "${CAPTURE_PRESETS_PIPELINE_STEPS}_parent_id_fk"
        FOREIGN KEY ("parent_id")
        REFERENCES "public"."${CAPTURE_PRESETS}"("id")
        ON DELETE CASCADE
        ON UPDATE NO ACTION
    )
  `)

  await pool.query(
    `CREATE INDEX "${CAPTURE_PRESETS_PIPELINE_STEPS}_parent_id_idx"
     ON "public"."${CAPTURE_PRESETS_PIPELINE_STEPS}" USING btree ("parent_id")`,
  )
  await pool.query(
    `CREATE INDEX "${CAPTURE_PRESETS_PIPELINE_STEPS}_order_idx"
     ON "public"."${CAPTURE_PRESETS_PIPELINE_STEPS}" USING btree ("order")`,
  )
  console.log(`Created table ${CAPTURE_PRESETS_PIPELINE_STEPS}`)
}

async function migrateFieldNotesColumns(pool: PgPool): Promise<void> {
  await createEnumIfMissing(pool, FIELD_NOTES_SHOT_TYPE_ENUM, SHOT_TYPES)
  await createEnumIfMissing(pool, FIELD_NOTES_VERDICT_ENUM, VERDICTS)
  await createEnumIfMissing(pool, FIELD_NOTES_SLATE_PARSE_STATUS_ENUM, SLATE_PARSE_STATUSES)

  await addEnumValueIfMissing(pool, FIELD_NOTES_PROCESSING_STATUS_ENUM, 'queued')

  await addColumnIfMissing(pool, FIELD_NOTES, 'episode', 'character varying')
  await addColumnIfMissing(
    pool,
    FIELD_NOTES,
    'shot_type',
    `"public"."${FIELD_NOTES_SHOT_TYPE_ENUM}"`,
  )
  await addColumnIfMissing(pool, FIELD_NOTES, 'take', 'numeric')
  await addColumnIfMissing(
    pool,
    FIELD_NOTES,
    'verdict',
    `"public"."${FIELD_NOTES_VERDICT_ENUM}"`,
  )
  await addColumnIfMissing(
    pool,
    FIELD_NOTES,
    'slate_parse_status',
    `"public"."${FIELD_NOTES_SLATE_PARSE_STATUS_ENUM}"`,
  )
  await addColumnIfMissing(pool, FIELD_NOTES, 'capture_preset_id', 'integer')

  await addFkIfMissing(
    pool,
    FIELD_NOTES,
    'capture_preset_id',
    CAPTURE_PRESETS,
    `${FIELD_NOTES}_capture_preset_id_${CAPTURE_PRESETS}_id_fk`,
  )

  await pool.query(
    `CREATE INDEX IF NOT EXISTS "${FIELD_NOTES}_capture_preset_id_idx"
     ON "public"."${FIELD_NOTES}" USING btree ("capture_preset_id")`,
  )
}

async function migratePayloadLockedDocumentsRels(pool: PgPool): Promise<void> {
  if (!(await tableExists(pool, LOCKED_DOCS_RELS))) {
    console.log(`Table ${LOCKED_DOCS_RELS} not found — skipping.`)
    return
  }

  await addColumnIfMissing(pool, LOCKED_DOCS_RELS, 'capture_presets_id', 'integer')

  const fkName = `${LOCKED_DOCS_RELS}_capture_presets_fk`
  if (!(await constraintExists(pool, fkName))) {
    await pool.query(`
      ALTER TABLE "public"."${LOCKED_DOCS_RELS}"
      ADD CONSTRAINT "${fkName}"
      FOREIGN KEY ("capture_presets_id")
      REFERENCES "public"."${CAPTURE_PRESETS}"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `)
    console.log(`Added FK ${fkName}`)
  }

  await pool.query(
    `CREATE INDEX IF NOT EXISTS "${LOCKED_DOCS_RELS}_capture_presets_id_idx"
     ON "public"."${LOCKED_DOCS_RELS}" USING btree ("capture_presets_id")`,
  )
}

async function main() {
  const payload = await getPayload({ config })
  const pool = getPgPool(payload)

  await createCapturePresetsTable(pool)
  await createCapturePresetsPipelineStepsTable(pool)
  await migrateFieldNotesColumns(pool)
  await migratePayloadLockedDocumentsRels(pool)

  console.log('FieldNotes pipeline schema migration complete.')
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
