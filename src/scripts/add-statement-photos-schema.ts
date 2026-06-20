/**
 * Statement page split layout:
 * - statementSceneImagesFirst[] + locales
 * - statementSceneImagesSecond[] + locales
 * - statementMiddleBody (artists_locales)
 *
 * Migrates rows from legacy artists_statement_scene_images when present
 * (first 2 → first row, remainder → second row).
 *
 * Usage: npx tsx src/scripts/add-statement-photos-schema.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

import { getPayload } from 'payload'
import config from '@/payload.config'

type PgPool = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>
}

const LEGACY_PHOTOS_TABLE = 'artists_statement_scene_images'
const LEGACY_LOCALES_TABLE = 'artists_statement_scene_images_locales'

const PHOTO_ROWS = [
  {
    table: 'artists_statement_scene_images_first',
    locales: 'artists_statement_scene_images_first_locales',
    enum: 'enum_artists_statement_scene_images_first_image_type',
  },
  {
    table: 'artists_statement_scene_images_second',
    locales: 'artists_statement_scene_images_second_locales',
    enum: 'enum_artists_statement_scene_images_second_image_type',
  },
] as const

function getPgPool(payload: Awaited<ReturnType<typeof getPayload>>): PgPool {
  const pool = (payload.db as { pool?: PgPool } | undefined)?.pool
  if (!pool) throw new Error('Postgres pool not available on payload.db')
  return pool
}

async function tableExists(pool: PgPool, tableName: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
    [tableName],
  )
  return rows.length > 0
}

async function columnExists(pool: PgPool, tableName: string, columnName: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [tableName, columnName],
  )
  return rows.length > 0
}

async function enumExists(pool: PgPool, enumName: string): Promise<boolean> {
  const { rows } = await pool.query(`SELECT 1 FROM pg_type WHERE typname = $1`, [enumName])
  return rows.length > 0
}

async function getLocaleEnumName(pool: PgPool): Promise<string> {
  const { rows } = await pool.query(
    `SELECT udt_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'artworks_additional_images_locales' AND column_name = '_locale'`,
  )
  const enumName = rows[0]?.udt_name
  if (typeof enumName !== 'string' || !enumName) {
    throw new Error('Could not resolve Payload locale enum')
  }
  return enumName
}

async function ensurePhotoRowTables(
  pool: PgPool,
  table: string,
  locales: string,
  imageTypeEnum: string,
): Promise<void> {
  if (!(await enumExists(pool, imageTypeEnum))) {
    await pool.query(
      `CREATE TYPE "public"."${imageTypeEnum}" AS ENUM('photograph', 'rendering')`,
    )
    console.log(`Created enum ${imageTypeEnum}`)
  }

  if (!(await tableExists(pool, table))) {
    await pool.query(`
      CREATE TABLE "public"."${table}" (
        "_order" integer NOT NULL,
        "_parent_id" integer NOT NULL,
        "id" character varying NOT NULL,
        "image_id" integer,
        "image_type" "public"."${imageTypeEnum}" DEFAULT 'photograph',
        CONSTRAINT "${table}_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "${table}_parent_id_fk"
          FOREIGN KEY ("_parent_id") REFERENCES "public"."artists"("id") ON DELETE CASCADE,
        CONSTRAINT "${table}_image_id_media_id_fk"
          FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE SET NULL
      )
    `)

    await pool.query(
      `CREATE INDEX "${table}_parent_id_idx" ON "public"."${table}" USING btree ("_parent_id")`,
    )
    await pool.query(
      `CREATE INDEX "${table}_image_id_idx" ON "public"."${table}" USING btree ("image_id")`,
    )

    console.log(`Created table ${table}`)
  } else {
    console.log(`Table ${table} already exists.`)
  }

  if (!(await tableExists(pool, locales))) {
    const localeEnum = await getLocaleEnumName(pool)

    await pool.query(`
      CREATE TABLE "public"."${locales}" (
        "caption" character varying,
        "id" serial PRIMARY KEY,
        "_locale" "public"."${localeEnum}" NOT NULL,
        "_parent_id" character varying NOT NULL,
        CONSTRAINT "${locales}_parent_id_fk"
          FOREIGN KEY ("_parent_id") REFERENCES "public"."${table}"("id") ON DELETE CASCADE
      )
    `)

    await pool.query(
      `CREATE INDEX "${locales}_locale_parent_idx"
       ON "public"."${locales}" USING btree ("_locale", "_parent_id")`,
    )

    console.log(`Created table ${locales}`)
  } else {
    console.log(`Table ${locales} already exists.`)
  }
}

async function migrateLegacySceneImages(pool: PgPool): Promise<void> {
  if (!(await tableExists(pool, LEGACY_PHOTOS_TABLE))) {
    console.log('No legacy statement scene images table — skipping migration.')
    return
  }

  const firstTable = PHOTO_ROWS[0].table
  const secondTable = PHOTO_ROWS[1].table

  const { rows: firstCount } = await pool.query(`SELECT COUNT(*)::int AS count FROM "${firstTable}"`)
  const { rows: secondCount } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM "${secondTable}"`,
  )

  if ((firstCount[0]?.count as number) > 0 || (secondCount[0]?.count as number) > 0) {
    console.log('First/second row tables already have data — skipping legacy migration.')
    return
  }

  const { rows: legacyRows } = await pool.query(
    `SELECT id, _order, _parent_id, image_id, image_type
     FROM "${LEGACY_PHOTOS_TABLE}"
     ORDER BY _parent_id, _order`,
  )

  if (legacyRows.length === 0) {
    console.log('Legacy statement scene images table is empty — nothing to migrate.')
    return
  }

  const byParent = new Map<number, Array<Record<string, unknown>>>()
  for (const row of legacyRows) {
    const parentId = row._parent_id as number
    const group = byParent.get(parentId) ?? []
    group.push(row)
    byParent.set(parentId, group)
  }

  const hasLegacyLocales = await tableExists(pool, LEGACY_LOCALES_TABLE)

  for (const [parentId, rows] of byParent) {
    const firstRows = rows.slice(0, 2)
    const secondRows = rows.slice(2)

    for (const [index, row] of firstRows.entries()) {
      const newId = `${row.id}-first`
      await pool.query(
        `INSERT INTO "${firstTable}" (id, _order, _parent_id, image_id, image_type)
         VALUES ($1, $2, $3, $4, $5)`,
        [newId, index + 1, parentId, row.image_id, row.image_type ?? 'photograph'],
      )

      if (hasLegacyLocales) {
        const { rows: localeRows } = await pool.query(
          `SELECT caption, _locale FROM "${LEGACY_LOCALES_TABLE}" WHERE _parent_id = $1`,
          [row.id],
        )
        for (const localeRow of localeRows) {
          await pool.query(
            `INSERT INTO "${PHOTO_ROWS[0].locales}" (caption, _locale, _parent_id)
             VALUES ($1, $2, $3)`,
            [localeRow.caption, localeRow._locale, newId],
          )
        }
      }
    }

    for (const [index, row] of secondRows.entries()) {
      const newId = `${row.id}-second`
      await pool.query(
        `INSERT INTO "${secondTable}" (id, _order, _parent_id, image_id, image_type)
         VALUES ($1, $2, $3, $4, $5)`,
        [newId, index + 1, parentId, row.image_id, row.image_type ?? 'photograph'],
      )

      if (hasLegacyLocales) {
        const { rows: localeRows } = await pool.query(
          `SELECT caption, _locale FROM "${LEGACY_LOCALES_TABLE}" WHERE _parent_id = $1`,
          [row.id],
        )
        for (const localeRow of localeRows) {
          await pool.query(
            `INSERT INTO "${PHOTO_ROWS[1].locales}" (caption, _locale, _parent_id)
             VALUES ($1, $2, $3)`,
            [localeRow.caption, localeRow._locale, newId],
          )
        }
      }
    }
  }

  console.log(`Migrated ${legacyRows.length} legacy scene image(s) into first/second rows.`)
}

const RELATED_WORKS_TABLE = 'artists_statement_related_works'
const RELATED_WORKS_LOCALES_TABLE = 'artists_statement_related_works_locales'

async function ensureRelatedWorksTable(pool: PgPool): Promise<void> {
  if (!(await tableExists(pool, RELATED_WORKS_TABLE))) {
    await pool.query(`
      CREATE TABLE "public"."${RELATED_WORKS_TABLE}" (
        "_order" integer NOT NULL,
        "_parent_id" integer NOT NULL,
        "id" character varying NOT NULL,
        "artwork_id" integer,
        CONSTRAINT "${RELATED_WORKS_TABLE}_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "${RELATED_WORKS_TABLE}_parent_id_fk"
          FOREIGN KEY ("_parent_id") REFERENCES "public"."artists"("id") ON DELETE CASCADE,
        CONSTRAINT "${RELATED_WORKS_TABLE}_artwork_id_artworks_id_fk"
          FOREIGN KEY ("artwork_id") REFERENCES "public"."artworks"("id") ON DELETE SET NULL
      )
    `)

    await pool.query(
      `CREATE INDEX "${RELATED_WORKS_TABLE}_parent_id_idx" ON "public"."${RELATED_WORKS_TABLE}" USING btree ("_parent_id")`,
    )
    await pool.query(
      `CREATE INDEX "${RELATED_WORKS_TABLE}_artwork_id_idx" ON "public"."${RELATED_WORKS_TABLE}" USING btree ("artwork_id")`,
    )

    console.log(`Created table ${RELATED_WORKS_TABLE}`)
  } else {
    console.log(`Table ${RELATED_WORKS_TABLE} already exists.`)
  }

  if (!(await tableExists(pool, RELATED_WORKS_LOCALES_TABLE))) {
    const localeEnum = await getLocaleEnumName(pool)

    await pool.query(`
      CREATE TABLE "public"."${RELATED_WORKS_LOCALES_TABLE}" (
        "note" character varying,
        "id" serial PRIMARY KEY,
        "_locale" "public"."${localeEnum}" NOT NULL,
        "_parent_id" character varying NOT NULL,
        CONSTRAINT "${RELATED_WORKS_LOCALES_TABLE}_parent_id_fk"
          FOREIGN KEY ("_parent_id") REFERENCES "public"."${RELATED_WORKS_TABLE}"("id") ON DELETE CASCADE
      )
    `)

    await pool.query(
      `CREATE INDEX "${RELATED_WORKS_LOCALES_TABLE}_locale_parent_idx"
       ON "public"."${RELATED_WORKS_LOCALES_TABLE}" USING btree ("_locale", "_parent_id")`,
    )

    console.log(`Created table ${RELATED_WORKS_LOCALES_TABLE}`)
  } else {
    console.log(`Table ${RELATED_WORKS_LOCALES_TABLE} already exists.`)
  }
}

async function main() {
  const payload = await getPayload({ config })
  const pool = getPgPool(payload)

  for (const row of PHOTO_ROWS) {
    await ensurePhotoRowTables(pool, row.table, row.locales, row.enum)
  }

  await migrateLegacySceneImages(pool)
  await ensureRelatedWorksTable(pool)

  if (!(await columnExists(pool, 'artists', 'statement_last_revised'))) {
    await pool.query(`ALTER TABLE "public"."artists" ADD COLUMN "statement_last_revised" timestamp(3) with time zone`)
    console.log('Added artists.statement_last_revised')
  }

  if (!(await columnExists(pool, 'artists_locales', 'statement_opening'))) {
    await pool.query(`ALTER TABLE "public"."artists_locales" ADD COLUMN "statement_opening" jsonb`)
    console.log('Added artists_locales.statement_opening')
  }

  if (!(await columnExists(pool, 'artists_locales', 'statement_pull_quote'))) {
    await pool.query(
      `ALTER TABLE "public"."artists_locales" ADD COLUMN "statement_pull_quote" character varying`,
    )
    console.log('Added artists_locales.statement_pull_quote')
  }

  if (!(await columnExists(pool, 'artists_locales', 'statement_middle_body'))) {
    await pool.query(
      `ALTER TABLE "public"."artists_locales" ADD COLUMN "statement_middle_body" jsonb`,
    )
    console.log('Added artists_locales.statement_middle_body')
  }

  if (!(await columnExists(pool, 'artists_locales', 'statement_closing_body'))) {
    await pool.query(
      `ALTER TABLE "public"."artists_locales" ADD COLUMN "statement_closing_body" jsonb`,
    )
    console.log('Added artists_locales.statement_closing_body')
  }

  if (!(await columnExists(pool, 'artists_locales', 'statement_closing_line'))) {
    await pool.query(
      `ALTER TABLE "public"."artists_locales" ADD COLUMN "statement_closing_line" character varying`,
    )
    console.log('Added artists_locales.statement_closing_line')
  }

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
