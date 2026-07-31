/**
 * Add Events.jurors + Events.otherParticipants array tables
 * (docs/events/events-mediamatic-artspan-spec.md Part 4.1).
 *
 * Usage: npx tsx src/scripts/add-event-jurors-participants-schema.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

import { getPayload } from 'payload'
import config from '@/payload.config'

type PgPool = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>
}

const PEOPLE = 'people'
const EVENTS = 'events'
const JURORS = 'events_jurors'
const OTHER_PARTICIPANTS = 'events_other_participants'

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

async function createPersonArrayTable(pool: PgPool, tableName: string): Promise<void> {
  if (await tableExists(pool, tableName)) {
    console.log(`Table ${tableName} already exists.`)
    return
  }

  await pool.query(`
    CREATE TABLE "public"."${tableName}" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" character varying NOT NULL,
      "person_id" integer,
      "role" character varying,
      CONSTRAINT "${tableName}_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "${tableName}_parent_id_fk"
        FOREIGN KEY ("_parent_id")
        REFERENCES "public"."${EVENTS}"("id")
        ON DELETE CASCADE
        ON UPDATE NO ACTION,
      CONSTRAINT "${tableName}_person_id_people_id_fk"
        FOREIGN KEY ("person_id")
        REFERENCES "public"."${PEOPLE}"("id")
        ON DELETE SET NULL
        ON UPDATE NO ACTION
    )
  `)
  await pool.query(
    `CREATE INDEX "${tableName}_order_idx" ON "public"."${tableName}" USING btree ("_order")`,
  )
  await pool.query(
    `CREATE INDEX "${tableName}_parent_id_idx" ON "public"."${tableName}" USING btree ("_parent_id")`,
  )
  await pool.query(
    `CREATE INDEX "${tableName}_person_id_idx" ON "public"."${tableName}" USING btree ("person_id")`,
  )
  console.log(`Created table ${tableName}`)
}

async function ensurePersonFk(pool: PgPool, tableName: string): Promise<void> {
  if (!(await tableExists(pool, tableName))) return
  const fk = `${tableName}_person_id_people_id_fk`
  if (await constraintExists(pool, fk)) {
    console.log(`FK ${fk} already exists.`)
    return
  }
  await pool.query(`
    ALTER TABLE "public"."${tableName}"
    ADD CONSTRAINT "${fk}"
    FOREIGN KEY ("person_id")
    REFERENCES "public"."${PEOPLE}"("id")
    ON DELETE SET NULL
    ON UPDATE NO ACTION
  `)
  console.log(`Added FK ${fk}`)
}

async function main() {
  const payload = await getPayload({ config })
  const pool = getPgPool(payload)

  if (!(await tableExists(pool, PEOPLE))) {
    throw new Error(`People table missing — run add-people-schema.ts first.`)
  }

  await createPersonArrayTable(pool, JURORS)
  await createPersonArrayTable(pool, OTHER_PARTICIPANTS)
  await ensurePersonFk(pool, JURORS)
  await ensurePersonFk(pool, OTHER_PARTICIPANTS)

  console.log('Event jurors/otherParticipants schema migration complete.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
