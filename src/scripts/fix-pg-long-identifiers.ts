/**
 * Fix PostgreSQL 63-char identifier truncation breaking Payload schema push.
 *
 * Drizzle expects FK names like `{table}_parent_id_fk`. When the table name is
 * long, Postgres truncates both the intended and existing constraint to the same
 * 63-char prefix — Drizzle does not recognise the FK and retries ADD on every boot.
 *
 * Usage:
 *   npx tsx src/scripts/fix-pg-long-identifiers.ts           # shorten tables (optional)
 *   npx tsx src/scripts/fix-pg-long-identifiers.ts --revert  # restore Drizzle default names
 *   npx tsx src/scripts/fix-pg-long-identifiers.ts --dry-run
 */
import dotenv from 'dotenv'

import { Client } from 'pg'

dotenv.config()

const SHORTEN: Array<{
  oldTable: string
  newTable: string
  oldFkPrefix: string
  newFk: string
}> = [
  {
    oldTable: 'artworks_megacities_interaction_spot_filters_regions',
    newTable: 'artworks_megacities_interaction_spot_f_regions',
    oldFkPrefix: 'artworks_megacities_interaction_spot_filters_regions_parent_id_',
    newFk: 'artworks_megacities_interaction_spot_f_regions_parent_id_fk',
  },
  {
    oldTable: 'artworks_megacities_composition_locations_boundary_polygon',
    newTable: 'artworks_megacities_composition_locations_bdry_pg',
    oldFkPrefix: 'artworks_megacities_composition_locations_boundary_polygon_pare',
    newFk: 'artworks_megacities_composition_locations_bdry_pg_parent_id_fk',
  },
]

const REVERT = SHORTEN.map((row) => ({
  oldTable: row.newTable,
  newTable: row.oldTable,
  oldFk: row.newFk,
  newFk: row.oldFkPrefix,
}))

const RENAMES = process.argv.includes('--revert') ? REVERT : SHORTEN

async function tableExists(client: Client, name: string): Promise<boolean> {
  const res = await client.query(
    `SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = $1`,
    [name],
  )
  return res.rowCount > 0
}

async function findFkName(client: Client, table: string): Promise<string | null> {
  const res = await client.query(
    `SELECT conname FROM pg_constraint con
     JOIN pg_class c ON c.oid = con.conrelid
     WHERE c.relname = $1 AND con.contype = 'f'`,
    [table],
  )
  return res.rows[0]?.conname ?? null
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('DATABASE_URL is required')
    process.exit(1)
  }

  const client = new Client({ connectionString: url })
  await client.connect()

  try {
    for (const row of RENAMES) {
      const hasOld = await tableExists(client, row.oldTable)
      const hasNew = await tableExists(client, row.newTable)

      if (!hasOld && hasNew) {
        console.log(`skip ${row.oldTable} (already ${row.newTable})`)
        continue
      }
      if (!hasOld) {
        console.log(`skip ${row.oldTable} (not found)`)
        continue
      }
      if (hasNew) {
        console.error(`blocked: both ${row.oldTable} and ${row.newTable} exist`)
        process.exit(1)
      }

      const fk =
        ('oldFk' in row && row.oldFk) ||
        (await findFkName(client, row.oldTable)) ||
        ('oldFkPrefix' in row ? row.oldFkPrefix : null)
      if (!fk) {
        console.error(`no FK found on ${row.oldTable}`)
        process.exit(1)
      }
      const targetFk = row.newFk
      console.log(`${dryRun ? '[dry-run] ' : ''}rename table ${row.oldTable} → ${row.newTable}`)
      console.log(`  rename FK ${fk} → ${targetFk}`)

      if (!dryRun) {
        await client.query('BEGIN')
        try {
          await client.query(
            `ALTER TABLE "${row.oldTable}" RENAME TO "${row.newTable}"`,
          )
          await client.query(
            `ALTER TABLE "${row.newTable}" RENAME CONSTRAINT "${fk}" TO "${targetFk}"`,
          )
          await client.query('COMMIT')
        } catch (err) {
          await client.query('ROLLBACK')
          throw err
        }
      }
    }

    console.log(dryRun ? 'Dry run complete.' : 'Done.')
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
