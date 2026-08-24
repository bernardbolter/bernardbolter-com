/**
 * One-off: generate a Payload Drizzle migration for ACH locale/hero columns
 * added in 1ce7036 but never pushed to Postgres.
 *
 * Usage: npx tsx src/scripts/generate-ach-locale-migration.ts
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import payload from 'payload'
import { writeMigrationIndex } from 'payload'

import config from '../payload.config.ts'

const NEW_COLUMN_FRAGMENTS = [
  'ach_location_older_story',
  'ach_location_newer_story',
  'ach_hero_hero_eligible',
  'ach_hero_hero_fields',
  'ach_hero_hero_photo',
]

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function nameMatches(value: unknown): boolean {
  if (typeof value !== 'string') return false
  return NEW_COLUMN_FRAGMENTS.some((fragment) => value.includes(fragment))
}

function stripNewColumns(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map(stripNewColumns).filter((item) => !nameMatches(JSON.stringify(item)))
  }
  if (node && typeof node === 'object') {
    const record = node as Record<string, unknown>
    const next: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(record)) {
      if (nameMatches(key) || nameMatches(value)) continue
      next[key] = stripNewColumns(value)
    }
    return next
  }
  return node
}

function formatStatements(statements: string[]): string {
  const sqlExecute = 'await db.execute(sql`'
  return `${sqlExecute}\n ${statements.join('\n')}\`)`
}

async function main() {
  process.env.PAYLOAD_MIGRATING = 'true'
  await payload.init({
    config,
    disableDBConnect: true,
    disableOnInit: true,
  })

  const adapter = payload.db as {
    migrationDir: string
    schema: unknown
    requireDrizzleKit: () => {
      generateDrizzleJson: (schema: unknown) => Promise<Record<string, unknown>>
      generateMigration: (before: unknown, after: unknown) => Promise<string[]>
    }
  }

  const { generateDrizzleJson, generateMigration } = adapter.requireDrizzleKit()
  const after = await generateDrizzleJson(adapter.schema)
  const before = stripNewColumns(deepClone(after))

  const upStatements = await generateMigration(before, after)
  const downStatements = await generateMigration(after, before)

  if (!upStatements?.length) {
    throw new Error('Drizzle generated no UP statements — column names may not match the schema.')
  }

  console.log('UP statements:')
  for (const statement of upStatements) console.log(statement)

  const dir = adapter.migrationDir
  fs.mkdirSync(dir, { recursive: true })

  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15)
  const fileName = `${stamp}_add_ach_location_stories`
  const filePath = path.join(dir, fileName)

  const upSQL = formatStatements(upStatements)
  const downSQL = downStatements?.length
    ? formatStatements(downStatements)
    : '  // Migration code'

  const source = `import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  ${upSQL}
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  ${downSQL}
}
`

  fs.writeFileSync(`${filePath}.json`, JSON.stringify(after, null, 2))
  fs.writeFileSync(`${filePath}.ts`, source)
  writeMigrationIndex({ migrationsDir: dir })

  console.log(`Wrote ${filePath}.ts`)
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
