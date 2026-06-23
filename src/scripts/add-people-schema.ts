/**
 * People collection + Events organiser/curator/coExhibitors relationship columns.
 *
 * Usage: npx tsx src/scripts/add-people-schema.ts
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
const PEOPLE_ROLE = 'people_role'
const PEOPLE_EXTERNAL_IDS = 'people_external_identifiers'
const PEOPLE_ROLE_ENUM = 'enum_people_role'
const PEOPLE_EXT_TYPE_ENUM = 'enum_people_external_identifiers_type'
const EVENTS = 'events'
const CO_EXHIBITORS = 'events_co_exhibitors'
const LOCKED_DOCS_RELS = 'payload_locked_documents_rels'

const PEOPLE_ROLES = [
  'curator',
  'gallerist',
  'organiser',
  'artist',
  'collector',
  'critic',
  'collaborator',
  'publisher',
  'educator',
  'institution',
  'other',
] as const

const EXTERNAL_ID_TYPES = ['isni', 'orcid', 'viaf', 'loc', 'other'] as const

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

async function createPeopleTable(pool: PgPool): Promise<void> {
  if (!(await enumExists(pool, PEOPLE_ROLE_ENUM))) {
    const labels = PEOPLE_ROLES.map((value) => `'${value}'`).join(', ')
    await pool.query(`CREATE TYPE "public"."${PEOPLE_ROLE_ENUM}" AS ENUM(${labels})`)
    console.log(`Created enum ${PEOPLE_ROLE_ENUM}`)
  }

  if (await tableExists(pool, PEOPLE)) {
    console.log(`Table ${PEOPLE} already exists.`)
    return
  }

  await pool.query(`
    CREATE TABLE "public"."${PEOPLE}" (
      "id" serial PRIMARY KEY,
      "name" character varying NOT NULL,
      "name_legal" character varying,
      "role_note" character varying,
      "website" character varying,
      "instagram" character varying,
      "wikidata_uri" character varying,
      "ulan_uri" character varying,
      "note" character varying,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    )
  `)
  console.log(`Created table ${PEOPLE}`)
}

/** Payload stores hasMany select values in a junction table, not on the parent row. */
async function createPeopleRoleTable(pool: PgPool): Promise<void> {
  if (!(await enumExists(pool, PEOPLE_ROLE_ENUM))) {
    const labels = PEOPLE_ROLES.map((value) => `'${value}'`).join(', ')
    await pool.query(`CREATE TYPE "public"."${PEOPLE_ROLE_ENUM}" AS ENUM(${labels})`)
    console.log(`Created enum ${PEOPLE_ROLE_ENUM}`)
  }

  if (await tableExists(pool, PEOPLE_ROLE)) {
    console.log(`Table ${PEOPLE_ROLE} already exists.`)
    return
  }

  await pool.query(`
    CREATE TABLE "public"."${PEOPLE_ROLE}" (
      "order" integer NOT NULL,
      "parent_id" integer NOT NULL,
      "value" "public"."${PEOPLE_ROLE_ENUM}",
      "id" serial PRIMARY KEY,
      CONSTRAINT "${PEOPLE_ROLE}_parent_id_fk"
        FOREIGN KEY ("parent_id")
        REFERENCES "public"."${PEOPLE}"("id")
        ON DELETE CASCADE
        ON UPDATE NO ACTION
    )
  `)
  await pool.query(
    `CREATE INDEX "${PEOPLE_ROLE}_parent_id_idx"
     ON "public"."${PEOPLE_ROLE}" USING btree ("parent_id")`,
  )
  await pool.query(
    `CREATE INDEX "${PEOPLE_ROLE}_order_idx"
     ON "public"."${PEOPLE_ROLE}" USING btree ("order")`,
  )
  console.log(`Created table ${PEOPLE_ROLE}`)
}

async function fixLegacyPeopleRoleColumn(pool: PgPool): Promise<void> {
  if (!(await columnExists(pool, PEOPLE, 'role'))) {
    return
  }

  if (await tableExists(pool, PEOPLE_ROLE)) {
    const { rows } = await pool.query(
      `SELECT id, role FROM "public"."${PEOPLE}" WHERE role IS NOT NULL`,
    )
    for (const row of rows) {
      const roles = row.role
      if (!Array.isArray(roles)) continue
      let order = 0
      for (const value of roles) {
        if (typeof value !== 'string') continue
        await pool.query(
          `INSERT INTO "public"."${PEOPLE_ROLE}" ("order", "parent_id", "value")
           VALUES ($1, $2, $3)`,
          [order, row.id, value],
        )
        order += 1
      }
    }
    if (rows.length > 0) {
      console.log(`Migrated role[] from ${rows.length} people row(s) into ${PEOPLE_ROLE}.`)
    }
  }

  await pool.query(`ALTER TABLE "public"."${PEOPLE}" DROP COLUMN IF EXISTS "role"`)
  console.log(`Dropped legacy ${PEOPLE}.role column.`)
}

async function createExternalIdentifiersTable(pool: PgPool): Promise<void> {
  if (!(await enumExists(pool, PEOPLE_EXT_TYPE_ENUM))) {
    const labels = EXTERNAL_ID_TYPES.map((value) => `'${value}'`).join(', ')
    await pool.query(`CREATE TYPE "public"."${PEOPLE_EXT_TYPE_ENUM}" AS ENUM(${labels})`)
    console.log(`Created enum ${PEOPLE_EXT_TYPE_ENUM}`)
  }

  if (await tableExists(pool, PEOPLE_EXTERNAL_IDS)) {
    console.log(`Table ${PEOPLE_EXTERNAL_IDS} already exists.`)
    return
  }

  await pool.query(`
    CREATE TABLE "public"."${PEOPLE_EXTERNAL_IDS}" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" character varying NOT NULL,
      "type" "public"."${PEOPLE_EXT_TYPE_ENUM}",
      "value" character varying,
      "uri" character varying,
      CONSTRAINT "${PEOPLE_EXTERNAL_IDS}_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "${PEOPLE_EXTERNAL_IDS}_parent_id_fk"
        FOREIGN KEY ("_parent_id")
        REFERENCES "public"."${PEOPLE}"("id")
        ON DELETE CASCADE
        ON UPDATE NO ACTION
    )
  `)
  await pool.query(
    `CREATE INDEX "${PEOPLE_EXTERNAL_IDS}_parent_id_idx"
     ON "public"."${PEOPLE_EXTERNAL_IDS}" USING btree ("_parent_id")`,
  )
  console.log(`Created table ${PEOPLE_EXTERNAL_IDS}`)
}

async function migrateEventsPeopleRelations(pool: PgPool): Promise<void> {
  await addColumnIfMissing(pool, EVENTS, 'organiser_id', 'integer')
  await addColumnIfMissing(pool, EVENTS, 'curator_id', 'integer')

  await addFkIfMissing(
    pool,
    EVENTS,
    'organiser_id',
    PEOPLE,
    `${EVENTS}_organiser_id_people_id_fk`,
  )
  await addFkIfMissing(pool, EVENTS, 'curator_id', PEOPLE, `${EVENTS}_curator_id_people_id_fk`)

  await pool.query(
    `CREATE INDEX IF NOT EXISTS "${EVENTS}_organiser_id_idx"
     ON "public"."${EVENTS}" USING btree ("organiser_id")`,
  )
  await pool.query(
    `CREATE INDEX IF NOT EXISTS "${EVENTS}_curator_id_idx"
     ON "public"."${EVENTS}" USING btree ("curator_id")`,
  )

  if (await columnExists(pool, EVENTS, 'organiser')) {
    console.log(
      `Legacy ${EVENTS}.organiser text column still present — re-link organisers in admin, then drop manually if desired.`,
    )
  }
  if (await columnExists(pool, EVENTS, 'curator')) {
    console.log(
      `Legacy ${EVENTS}.curator text column still present — re-link curators in admin, then drop manually if desired.`,
    )
  }
}

async function migrateCoExhibitorsPersonRelation(pool: PgPool): Promise<void> {
  if (!(await tableExists(pool, CO_EXHIBITORS))) {
    console.log(`Table ${CO_EXHIBITORS} not found — skipping co-exhibitor migration.`)
    return
  }

  await addColumnIfMissing(pool, CO_EXHIBITORS, 'person_id', 'integer')
  await addFkIfMissing(
    pool,
    CO_EXHIBITORS,
    'person_id',
    PEOPLE,
    `${CO_EXHIBITORS}_person_id_people_id_fk`,
  )
  await pool.query(
    `CREATE INDEX IF NOT EXISTS "${CO_EXHIBITORS}_person_id_idx"
     ON "public"."${CO_EXHIBITORS}" USING btree ("person_id")`,
  )

  if (await columnExists(pool, CO_EXHIBITORS, 'name')) {
    console.log(
      `Legacy ${CO_EXHIBITORS}.name still present — create People records and re-link in admin.`,
    )
  }
}

async function migratePayloadLockedDocumentsRels(pool: PgPool): Promise<void> {
  if (!(await tableExists(pool, LOCKED_DOCS_RELS))) {
    console.log(`Table ${LOCKED_DOCS_RELS} not found — skipping.`)
    return
  }

  await addColumnIfMissing(pool, LOCKED_DOCS_RELS, 'people_id', 'integer')

  const fkName = `${LOCKED_DOCS_RELS}_people_fk`
  if (!(await constraintExists(pool, fkName))) {
    await pool.query(`
      ALTER TABLE "public"."${LOCKED_DOCS_RELS}"
      ADD CONSTRAINT "${fkName}"
      FOREIGN KEY ("people_id")
      REFERENCES "public"."${PEOPLE}"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `)
    console.log(`Added FK ${fkName}`)
  }

  await pool.query(
    `CREATE INDEX IF NOT EXISTS "${LOCKED_DOCS_RELS}_people_id_idx"
     ON "public"."${LOCKED_DOCS_RELS}" USING btree ("people_id")`,
  )
}

async function main() {
  const payload = await getPayload({ config })
  const pool = getPgPool(payload)

  await createPeopleTable(pool)
  await createPeopleRoleTable(pool)
  await fixLegacyPeopleRoleColumn(pool)
  await createExternalIdentifiersTable(pool)
  await migrateEventsPeopleRelations(pool)
  await migrateCoExhibitorsPersonRelation(pool)
  await migratePayloadLockedDocumentsRels(pool)

  console.log('People schema migration complete.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
