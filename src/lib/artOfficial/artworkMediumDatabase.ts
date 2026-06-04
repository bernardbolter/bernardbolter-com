import type { Payload } from 'payload'

import { BUILTIN_VALUES } from './artworkMediumOptions'

type PgPool = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>
}

function getPgPool(payload: Payload): PgPool | null {
  const db = payload.db as { pool?: PgPool } | undefined
  return db?.pool ?? null
}

async function mediumColumnUdt(payload: Payload): Promise<string | null> {
  const pool = getPgPool(payload)
  if (!pool) return null

  const { rows } = await pool.query(
    `SELECT udt_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'artworks'
       AND column_name = 'medium'`,
  )
  const udt = rows[0]?.udt_name
  return typeof udt === 'string' ? udt : null
}

function quoteIdent(ident: string): string {
  return `"${ident.replace(/"/g, '""')}"`
}

/** Add a custom medium slug to the Postgres enum (when column is still enum-backed). */
export async function ensureArtworkMediumEnumValue(
  payload: Payload,
  value: string,
): Promise<void> {
  if (BUILTIN_VALUES.has(value)) return

  const pool = getPgPool(payload)
  if (!pool) return

  const udt = await mediumColumnUdt(payload)
  if (!udt || udt === 'text' || udt === 'varchar') return

  const enumType = quoteIdent(udt)
  const escaped = value.replace(/'/g, "''")

  try {
    await pool.query(`ALTER TYPE ${enumType} ADD VALUE IF NOT EXISTS '${escaped}'`)
  } catch {
    try {
      await pool.query(`ALTER TYPE ${enumType} ADD VALUE '${escaped}'`)
    } catch {
      // Already present or column migrated to text
    }
  }
}

/**
 * One-time: store medium as varchar so Quick Upload custom slugs always work.
 * Safe to run multiple times.
 */
export async function migrateArtworksMediumColumnToText(payload: Payload): Promise<{
  changed: boolean
  previousUdt: string | null
}> {
  const pool = getPgPool(payload)
  if (!pool) {
    throw new Error('Postgres pool not available on payload.db')
  }

  const udt = await mediumColumnUdt(payload)
  if (!udt || udt === 'text' || udt === 'varchar') {
    return { changed: false, previousUdt: udt }
  }

  await pool.query(
    `ALTER TABLE "artworks" ALTER COLUMN "medium" SET DATA TYPE varchar USING "medium"::text`,
  )

  try {
    await pool.query(`DROP TYPE IF EXISTS ${quoteIdent(udt)}`)
  } catch {
    // Type may still be referenced elsewhere
  }

  return { changed: true, previousUdt: udt }
}
