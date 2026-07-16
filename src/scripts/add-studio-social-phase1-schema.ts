/**
 * Production-safe SQL migration for Studio Phase 1 social collections +
 * FieldNotes museumSourced + DINOv2 columns.
 *
 * Do NOT use interactive Drizzle push on Netcup (enum create-vs-rename prompts).
 *
 * Usage (on Netcup, after git pull, before deploy):
 *   npm run migrate:studio-social-phase1
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env', override: true })
dotenv.config({ path: '.env.local', override: true })

import { getPayload } from 'payload'
import config from '@/payload.config'

type PgPool = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>>; rowCount?: number }>
}

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

async function createEnumIfMissing(
  pool: PgPool,
  enumName: string,
  values: readonly string[],
): Promise<void> {
  if (await enumExists(pool, enumName)) {
    console.log(`ok  enum ${enumName}`)
    return
  }
  const labels = values.map((value) => `'${value}'`).join(', ')
  await pool.query(`CREATE TYPE "public"."${enumName}" AS ENUM(${labels})`)
  console.log(`+   enum ${enumName}`)
}

async function ensureColumn(
  pool: PgPool,
  table: string,
  column: string,
  ddl: string,
): Promise<void> {
  if (await columnExists(pool, table, column)) {
    console.log(`ok  ${table}.${column}`)
    return
  }
  await pool.query(`ALTER TABLE "public"."${table}" ADD COLUMN ${ddl}`)
  console.log(`+   ${table}.${column}`)
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
    console.log(`ok  FK ${constraintName}`)
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
  console.log(`+   FK ${constraintName}`)
}

async function createIndexIfMissing(
  pool: PgPool,
  indexName: string,
  tableName: string,
  columnName: string,
): Promise<void> {
  await pool.query(
    `CREATE INDEX IF NOT EXISTS "${indexName}"
     ON "public"."${tableName}" USING btree ("${columnName}")`,
  )
}

async function createCollectionTable(
  pool: PgPool,
  tableName: string,
  columnsSql: string,
): Promise<void> {
  if (await tableExists(pool, tableName)) {
    console.log(`ok  ${tableName}`)
    return
  }
  await pool.query(`
    CREATE TABLE "public"."${tableName}" (
      "id" serial PRIMARY KEY,
      ${columnsSql},
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    )
  `)
  console.log(`+   ${tableName}`)
}

async function createRelsTable(
  pool: PgPool,
  tableName: string,
  parentTable: string,
  relationColumns: Array<{ column: string; refTable: string }>,
): Promise<void> {
  if (!(await tableExists(pool, tableName))) {
    await pool.query(`
      CREATE TABLE "public"."${tableName}" (
        "id" serial PRIMARY KEY,
        "order" integer,
        "parent_id" integer NOT NULL,
        "path" character varying NOT NULL
      )
    `)
    await createIndexIfMissing(pool, `${tableName}_order_idx`, tableName, 'order')
    await createIndexIfMissing(pool, `${tableName}_parent_idx`, tableName, 'parent_id')
    await createIndexIfMissing(pool, `${tableName}_path_idx`, tableName, 'path')
    await addFkIfMissing(
      pool,
      tableName,
      'parent_id',
      parentTable,
      `${tableName}_parent_fk`,
      'CASCADE',
    )
    console.log(`+   ${tableName}`)
  } else {
    console.log(`ok  ${tableName}`)
  }

  for (const rel of relationColumns) {
    await ensureColumn(pool, tableName, rel.column, `"${rel.column}" integer`)
    await addFkIfMissing(
      pool,
      tableName,
      rel.column,
      rel.refTable,
      `${tableName}_${rel.column}_fk`,
      'CASCADE',
    )
    await createIndexIfMissing(pool, `${tableName}_${rel.column}_idx`, tableName, rel.column)
  }
}

async function createArrayTable(
  pool: PgPool,
  tableName: string,
  parentTable: string,
  columnsSql: string,
): Promise<void> {
  if (await tableExists(pool, tableName)) {
    console.log(`ok  ${tableName}`)
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
  await createIndexIfMissing(pool, `${tableName}_order_idx`, tableName, '_order')
  await createIndexIfMissing(pool, `${tableName}_parent_id_idx`, tableName, '_parent_id')
  await addFkIfMissing(
    pool,
    tableName,
    '_parent_id',
    parentTable,
    `${tableName}_parent_id_fk`,
    'CASCADE',
  )
  console.log(`+   ${tableName}`)
}

async function ensureLockedDocsRelColumn(
  pool: PgPool,
  column: string,
  refTable: string,
): Promise<void> {
  const locked = 'payload_locked_documents_rels'
  if (!(await tableExists(pool, locked))) return
  await ensureColumn(pool, locked, column, `"${column}" integer`)
  await addFkIfMissing(pool, locked, column, refTable, `${locked}_${column}_fk`, 'CASCADE')
  await createIndexIfMissing(pool, `${locked}_${column}_idx`, locked, column)
}

async function main() {
  const payload = await getPayload({ config })
  const pool = getPgPool(payload)

  console.log('Ensuring FieldNotes museumSourced…')
  await ensureColumn(
    pool,
    'field_notes',
    'museum_sourced',
    '"museum_sourced" boolean DEFAULT false',
  )

  console.log('Ensuring DINOv2 columns on artworks…')
  await ensureColumn(pool, 'artworks', 'dinov2_embedding', '"dinov2_embedding" vector(1024)')
  await ensureColumn(
    pool,
    'artworks',
    'dinov2_embedding_generated_at',
    '"dinov2_embedding_generated_at" timestamp(3) with time zone',
  )

  console.log('\nCreating enums…')
  await createEnumIfMissing(pool, 'enum_campaigns_status', [
    'planning',
    'active',
    'final-push',
    'complete',
  ])
  await createEnumIfMissing(pool, 'enum_queue_items_platform', [
    'instagram',
    'tiktok',
    'youtube-shorts',
    'youtube-longform',
  ])
  await createEnumIfMissing(pool, 'enum_queue_items_content_type', [
    'archive-post',
    'museum-post',
    'reel',
    'story',
    'longform',
  ])
  await createEnumIfMissing(pool, 'enum_queue_items_status', [
    'idea',
    'drafted',
    'scheduled',
    'posted',
    'promoted',
  ])
  await createEnumIfMissing(pool, 'enum_segments_coverage_status', [
    'no-footage',
    'some-takes',
    'covered',
  ])
  await createEnumIfMissing(pool, 'enum_shots_status', ['needed', 'shot', 'selected', 'gap'])

  console.log('\nCreating collection tables…')

  await createCollectionTable(
    pool,
    'hashtag_tags',
    `"label" character varying NOT NULL`,
  )
  await pool.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS "hashtag_tags_label_idx" ON "public"."hashtag_tags" ("label")`,
  )

  // campaigns first without finale_script_id (circular with finale_scripts)
  await createCollectionTable(
    pool,
    'campaigns',
    `
      "name" character varying NOT NULL,
      "start_date" timestamp(3) with time zone,
      "finale_date" timestamp(3) with time zone,
      "status" "public"."enum_campaigns_status" DEFAULT 'planning' NOT NULL,
      "cadence_rules" varchar,
      "buffer_phase_enabled" boolean DEFAULT false
    `,
  )

  await createCollectionTable(
    pool,
    'finale_scripts',
    `
      "campaign_id" integer NOT NULL,
      "title" character varying NOT NULL
    `,
  )
  await addFkIfMissing(
    pool,
    'finale_scripts',
    'campaign_id',
    'campaigns',
    'finale_scripts_campaign_id_fk',
    'CASCADE',
  )
  await createIndexIfMissing(pool, 'finale_scripts_campaign_idx', 'finale_scripts', 'campaign_id')

  await ensureColumn(pool, 'campaigns', 'finale_script_id', '"finale_script_id" integer')
  await addFkIfMissing(
    pool,
    'campaigns',
    'finale_script_id',
    'finale_scripts',
    'campaigns_finale_script_id_fk',
    'SET NULL',
  )

  await createCollectionTable(
    pool,
    'segments',
    `
      "finale_script_id" integer NOT NULL,
      "order" numeric NOT NULL,
      "wall_section" character varying NOT NULL,
      "painted_content" varchar,
      "angle" varchar,
      "connection_notes" varchar,
      "coverage_status" "public"."enum_segments_coverage_status" DEFAULT 'no-footage'
    `,
  )
  await addFkIfMissing(
    pool,
    'segments',
    'finale_script_id',
    'finale_scripts',
    'segments_finale_script_id_fk',
    'CASCADE',
  )
  await createIndexIfMissing(pool, 'segments_finale_script_idx', 'segments', 'finale_script_id')

  await createCollectionTable(
    pool,
    'themes',
    `
      "campaign_id" integer NOT NULL,
      "title" character varying NOT NULL,
      "notes" varchar,
      "date" timestamp(3) with time zone
    `,
  )
  await addFkIfMissing(pool, 'themes', 'campaign_id', 'campaigns', 'themes_campaign_id_fk', 'CASCADE')
  await createIndexIfMissing(pool, 'themes_campaign_idx', 'themes', 'campaign_id')

  await createCollectionTable(
    pool,
    'queue_items',
    `
      "campaign_id" integer NOT NULL,
      "theme_id" integer,
      "platform" "public"."enum_queue_items_platform" NOT NULL,
      "content_type" "public"."enum_queue_items_content_type" NOT NULL,
      "caption_text" varchar,
      "suggested_time" timestamp(3) with time zone,
      "status" "public"."enum_queue_items_status" DEFAULT 'idea' NOT NULL,
      "promoted_from_id" integer
    `,
  )
  await addFkIfMissing(
    pool,
    'queue_items',
    'campaign_id',
    'campaigns',
    'queue_items_campaign_id_fk',
    'CASCADE',
  )
  await addFkIfMissing(
    pool,
    'queue_items',
    'theme_id',
    'themes',
    'queue_items_theme_id_fk',
    'SET NULL',
  )
  await addFkIfMissing(
    pool,
    'queue_items',
    'promoted_from_id',
    'queue_items',
    'queue_items_promoted_from_id_fk',
    'SET NULL',
  )
  await createIndexIfMissing(pool, 'queue_items_campaign_idx', 'queue_items', 'campaign_id')
  await createIndexIfMissing(pool, 'queue_items_theme_idx', 'queue_items', 'theme_id')

  await createCollectionTable(
    pool,
    'calendar_days',
    `"date" timestamp(3) with time zone NOT NULL`,
  )
  await pool.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS "calendar_days_date_idx" ON "public"."calendar_days" ("date")`,
  )

  await createCollectionTable(
    pool,
    'shots',
    `
      "campaign_id" integer NOT NULL,
      "segment_id" integer,
      "description" character varying NOT NULL,
      "intended_framing" character varying,
      "status" "public"."enum_shots_status" DEFAULT 'needed' NOT NULL
    `,
  )
  await addFkIfMissing(pool, 'shots', 'campaign_id', 'campaigns', 'shots_campaign_id_fk', 'CASCADE')
  await addFkIfMissing(pool, 'shots', 'segment_id', 'segments', 'shots_segment_id_fk', 'SET NULL')
  await createIndexIfMissing(pool, 'shots_campaign_idx', 'shots', 'campaign_id')

  await createCollectionTable(
    pool,
    'takes',
    `
      "shot_id" integer NOT NULL,
      "take_number" numeric NOT NULL,
      "video_field_note_id" integer,
      "quick_note" character varying,
      "selected" boolean DEFAULT false,
      "in_point_sec" numeric,
      "out_point_sec" numeric
    `,
  )
  await addFkIfMissing(pool, 'takes', 'shot_id', 'shots', 'takes_shot_id_fk', 'CASCADE')
  await addFkIfMissing(
    pool,
    'takes',
    'video_field_note_id',
    'field_notes',
    'takes_video_field_note_id_fk',
    'SET NULL',
  )
  await createIndexIfMissing(pool, 'takes_shot_idx', 'takes', 'shot_id')

  console.log('\nCreating array + rels tables…')
  await createArrayTable(
    pool,
    'queue_items_metrics_snapshots',
    'queue_items',
    `
      "date" timestamp(3) with time zone NOT NULL,
      "views" numeric,
      "likes" numeric,
      "shares" numeric,
      "comments" numeric
    `,
  )

  await createRelsTable(pool, 'finale_scripts_rels', 'finale_scripts', [
    { column: 'segments_id', refTable: 'segments' },
  ])

  await createRelsTable(pool, 'themes_rels', 'themes', [
    { column: 'field_notes_id', refTable: 'field_notes' },
    { column: 'artworks_id', refTable: 'artworks' },
    { column: 'queue_items_id', refTable: 'queue_items' },
  ])

  await createRelsTable(pool, 'queue_items_rels', 'queue_items', [
    { column: 'field_notes_id', refTable: 'field_notes' },
    { column: 'artworks_id', refTable: 'artworks' },
    { column: 'hashtag_tags_id', refTable: 'hashtag_tags' },
    { column: 'queue_items_id', refTable: 'queue_items' },
  ])

  await createRelsTable(pool, 'calendar_days_rels', 'calendar_days', [
    { column: 'queue_items_id', refTable: 'queue_items' },
  ])

  // connectsTo on existing collections
  await createRelsTable(pool, 'artworks_rels', 'artworks', [
    { column: 'artworks_id', refTable: 'artworks' },
    { column: 'field_notes_id', refTable: 'field_notes' },
    { column: 'queue_items_id', refTable: 'queue_items' },
  ])
  await createRelsTable(pool, 'field_notes_rels', 'field_notes', [
    { column: 'artworks_id', refTable: 'artworks' },
    { column: 'field_notes_id', refTable: 'field_notes' },
    { column: 'queue_items_id', refTable: 'queue_items' },
  ])

  console.log('\nUpdating payload locked-document rels…')
  for (const [column, ref] of [
    ['campaigns_id', 'campaigns'],
    ['themes_id', 'themes'],
    ['queue_items_id', 'queue_items'],
    ['hashtag_tags_id', 'hashtag_tags'],
    ['calendar_days_id', 'calendar_days'],
    ['finale_scripts_id', 'finale_scripts'],
    ['segments_id', 'segments'],
    ['shots_id', 'shots'],
    ['takes_id', 'takes'],
  ] as const) {
    await ensureLockedDocsRelColumn(pool, column, ref)
  }

  console.log('\nVerifying…')
  const required = [
    'campaigns',
    'themes',
    'queue_items',
    'hashtag_tags',
    'calendar_days',
    'finale_scripts',
    'segments',
    'shots',
    'takes',
  ]
  for (const table of required) {
    console.log((await tableExists(pool, table)) ? `ok  ${table}` : `!!  missing ${table}`)
  }

  console.log('Done.')
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
