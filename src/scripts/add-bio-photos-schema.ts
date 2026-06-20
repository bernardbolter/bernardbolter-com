/**
 * Add bioPhotos schema: related_event_id + localized caption table.
 *
 * Usage: npx tsx src/scripts/add-bio-photos-schema.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

import { getPayload } from 'payload'
import config from '@/payload.config'

type PgPool = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>
}

const PHOTOS_TABLE = 'artists_bio_photos'
const LOCALES_TABLE = 'artists_bio_photos_locales'
const DEFAULT_LOCALE = 'en'

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

async function getLocaleEnumName(pool: PgPool): Promise<string> {
  const { rows } = await pool.query(
    `SELECT udt_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'artworks_additional_images_locales'
       AND column_name = '_locale'`,
  )
  const enumName = rows[0]?.udt_name
  if (typeof enumName !== 'string' || !enumName) {
    throw new Error('Could not resolve Payload locale enum from artworks_additional_images_locales')
  }
  return enumName
}

async function main() {
  const payload = await getPayload({ config })
  const pool = getPgPool(payload)

  if (!(await tableExists(pool, PHOTOS_TABLE))) {
    throw new Error(`Expected table ${PHOTOS_TABLE} to exist before running this migration`)
  }

  if (!(await columnExists(pool, PHOTOS_TABLE, 'related_event_id'))) {
    await pool.query(`ALTER TABLE "public"."${PHOTOS_TABLE}" ADD COLUMN "related_event_id" integer`)
    await pool.query(`
      ALTER TABLE "public"."${PHOTOS_TABLE}"
      ADD CONSTRAINT "${PHOTOS_TABLE}_related_event_id_events_id_fk"
      FOREIGN KEY ("related_event_id")
      REFERENCES "public"."events"("id")
      ON DELETE SET NULL
      ON UPDATE NO ACTION
    `)
    await pool.query(
      `CREATE INDEX IF NOT EXISTS "${PHOTOS_TABLE}_related_event_idx"
       ON "public"."${PHOTOS_TABLE}" USING btree ("related_event_id")`,
    )
    console.log(`Added ${PHOTOS_TABLE}.related_event_id`)
  } else {
    console.log(`${PHOTOS_TABLE}.related_event_id already exists.`)
  }

  if (!(await tableExists(pool, LOCALES_TABLE))) {
    const localeEnum = await getLocaleEnumName(pool)

    await pool.query(`
      CREATE TABLE "public"."${LOCALES_TABLE}" (
        "caption" character varying,
        "id" serial PRIMARY KEY,
        "_locale" "public"."${localeEnum}" NOT NULL,
        "_parent_id" character varying NOT NULL,
        CONSTRAINT "${LOCALES_TABLE}_parent_id_fk"
          FOREIGN KEY ("_parent_id")
          REFERENCES "public"."${PHOTOS_TABLE}"("id")
          ON DELETE CASCADE
          ON UPDATE NO ACTION
      )
    `)

    await pool.query(
      `CREATE INDEX "${LOCALES_TABLE}_locale_parent_idx"
       ON "public"."${LOCALES_TABLE}" USING btree ("_locale", "_parent_id")`,
    )

    console.log(`Created table ${LOCALES_TABLE}`)
  } else {
    console.log(`Table ${LOCALES_TABLE} already exists.`)
  }

  if (await columnExists(pool, PHOTOS_TABLE, 'caption')) {
    const localeEnum = await getLocaleEnumName(pool)

    await pool.query(
      `
      INSERT INTO "public"."${LOCALES_TABLE}" ("caption", "_locale", "_parent_id")
      SELECT p."caption", $1::"public"."${localeEnum}", p."id"
      FROM "public"."${PHOTOS_TABLE}" p
      WHERE p."caption" IS NOT NULL
        AND trim(p."caption") <> ''
        AND NOT EXISTS (
          SELECT 1
          FROM "public"."${LOCALES_TABLE}" l
          WHERE l."_parent_id" = p."id"
            AND l."_locale" = $1::"public"."${localeEnum}"
        )
    `,
      [DEFAULT_LOCALE],
    )

    await pool.query(`ALTER TABLE "public"."${PHOTOS_TABLE}" DROP COLUMN "caption"`)
    console.log(`Migrated ${PHOTOS_TABLE}.caption → ${LOCALES_TABLE} and dropped legacy column`)
  } else {
    console.log(`${PHOTOS_TABLE}.caption already migrated.`)
  }

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
