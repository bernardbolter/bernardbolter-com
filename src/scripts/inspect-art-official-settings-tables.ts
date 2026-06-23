import dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

import { getPayload } from 'payload'
import config from '@/payload.config'

async function main() {
  const payload = await getPayload({ config })
  const pool = (payload.db as { pool?: { query: (s: string) => Promise<{ rows: unknown[] }> } })
    .pool
  if (!pool) throw new Error('no pool')

  for (const t of [
    'art_official_settings',
    'art_official_settings_custom_mediums',
    'art_official_settings_custom_edition_substrates',
    'art_official_settings_custom_edition_print_techniques',
  ]) {
    const { rows } = await pool.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name='${t}' ORDER BY ordinal_position`,
    )
    console.log('TABLE', t, Array.isArray(rows) && rows.length ? rows : 'MISSING')
  }
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
