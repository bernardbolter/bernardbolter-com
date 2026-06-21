/**
 * Add Events dialogue schema: classification fields, session phase tracking, artworksShown rels.
 *
 * Usage: npx tsx src/scripts/add-event-dialogue-schema.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

import { getPayload } from 'payload'
import config from '@/payload.config'

type PgPool = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>
}

const EVENTS_LOCALES = 'events_locales'
const EVENTS_CONCEPTUAL_KEYWORDS = 'events_conceptual_keywords'
const EVENTS_RELS = 'events_rels'
const EVENTS_INSTALL_RELS = 'events_installation_images_rels'
const SESSIONS = 'sessions'
const EVENT_DIALOGUE_ENUM = 'enum_sessions_event_dialogue_phase'

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

async function addEventsRelsColumn(
  pool: PgPool,
  columnName: string,
  fkTable: string,
  fkColumn = 'id',
): Promise<void> {
  if (!(await columnExists(pool, EVENTS_RELS, columnName))) {
    await pool.query(
      `ALTER TABLE "public"."${EVENTS_RELS}" ADD COLUMN "${columnName}" integer`,
    )
    console.log(`Added ${EVENTS_RELS}.${columnName}`)
  }

  const fkName = `${EVENTS_RELS}_${columnName}_${fkTable}_${fkColumn}_fk`
  if (!(await constraintExists(pool, fkName))) {
    await pool.query(`
      ALTER TABLE "public"."${EVENTS_RELS}"
      ADD CONSTRAINT "${fkName}"
      FOREIGN KEY ("${columnName}")
      REFERENCES "public"."${fkTable}"("${fkColumn}")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `)
    console.log(`Added FK ${fkName}`)
  }

  const idxName = `${EVENTS_RELS}_${columnName}_idx`
  await pool.query(
    `CREATE INDEX IF NOT EXISTS "${idxName}"
     ON "public"."${EVENTS_RELS}" USING btree ("${columnName}")`,
  )
}

async function main() {
  const payload = await getPayload({ config })
  const pool = getPgPool(payload)

  await addColumnIfMissing(pool, 'events', 'field_confidence_map', 'jsonb')

  for (const col of ['practice_arc_note', 'conscious_rejections', 'art_historical_context']) {
    await addColumnIfMissing(pool, EVENTS_LOCALES, col, 'character varying')
  }

  if (!(await tableExists(pool, EVENTS_CONCEPTUAL_KEYWORDS))) {
    await pool.query(`
      CREATE TABLE "public"."${EVENTS_CONCEPTUAL_KEYWORDS}" (
        "_order" integer NOT NULL,
        "_parent_id" integer NOT NULL,
        "id" character varying NOT NULL,
        "keyword" character varying NOT NULL,
        CONSTRAINT "${EVENTS_CONCEPTUAL_KEYWORDS}_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "${EVENTS_CONCEPTUAL_KEYWORDS}_parent_id_fk"
          FOREIGN KEY ("_parent_id")
          REFERENCES "public"."events"("id")
          ON DELETE CASCADE
          ON UPDATE NO ACTION
      )
    `)
    await pool.query(
      `CREATE INDEX "${EVENTS_CONCEPTUAL_KEYWORDS}_parent_id_idx"
       ON "public"."${EVENTS_CONCEPTUAL_KEYWORDS}" USING btree ("_parent_id")`,
    )
    console.log(`Created table ${EVENTS_CONCEPTUAL_KEYWORDS}`)
  } else {
    console.log(`Table ${EVENTS_CONCEPTUAL_KEYWORDS} already exists.`)
  }

  await addEventsRelsColumn(pool, 'tags_id', 'tags')
  await addEventsRelsColumn(pool, 'art_historical_references_id', 'art_historical_references')
  await addEventsRelsColumn(pool, 'events_id', 'events')

  if (!(await enumExists(pool, EVENT_DIALOGUE_ENUM))) {
    await pool.query(`
      CREATE TYPE "public"."${EVENT_DIALOGUE_ENUM}" AS ENUM (
        'phase-a-research',
        'phase-b-reasoning'
      )
    `)
    console.log(`Created enum ${EVENT_DIALOGUE_ENUM}`)
  }

  if (!(await columnExists(pool, SESSIONS, 'event_dialogue_phase'))) {
    await pool.query(`
      ALTER TABLE "public"."${SESSIONS}"
      ADD COLUMN "event_dialogue_phase" "public"."${EVENT_DIALOGUE_ENUM}" DEFAULT 'phase-a-research'
    `)
    console.log(`Added ${SESSIONS}.event_dialogue_phase`)
  }

  await addColumnIfMissing(pool, SESSIONS, 'event_authority_proposals', 'jsonb')

  if (!(await tableExists(pool, EVENTS_INSTALL_RELS))) {
    await pool.query(`
      CREATE TABLE "public"."${EVENTS_INSTALL_RELS}" (
        "id" serial PRIMARY KEY,
        "order" integer,
        "parent_id" character varying NOT NULL,
        "path" character varying NOT NULL,
        "artworks_id" integer,
        CONSTRAINT "${EVENTS_INSTALL_RELS}_parent_id_fk"
          FOREIGN KEY ("parent_id")
          REFERENCES "public"."events_installation_images"("id")
          ON DELETE CASCADE
          ON UPDATE NO ACTION,
        CONSTRAINT "${EVENTS_INSTALL_RELS}_artworks_id_fk"
          FOREIGN KEY ("artworks_id")
          REFERENCES "public"."artworks"("id")
          ON DELETE CASCADE
          ON UPDATE NO ACTION
      )
    `)
    await pool.query(
      `CREATE INDEX "${EVENTS_INSTALL_RELS}_parent_id_idx"
       ON "public"."${EVENTS_INSTALL_RELS}" USING btree ("parent_id")`,
    )
    await pool.query(
      `CREATE INDEX "${EVENTS_INSTALL_RELS}_artworks_id_idx"
       ON "public"."${EVENTS_INSTALL_RELS}" USING btree ("artworks_id")`,
    )
    console.log(`Created table ${EVENTS_INSTALL_RELS}`)
  } else {
    console.log(`Table ${EVENTS_INSTALL_RELS} already exists.`)
  }

  console.log('Event dialogue schema migration complete.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
