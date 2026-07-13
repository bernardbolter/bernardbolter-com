/**
 * One-time schema sync for vision page fields on a restored/migrated database.
 * Creates artworks_embeddings + artworks_vision_analyses tables (and any other drift).
 *
 * Prefer add-vision-schema.ts when only those two tables are missing.
 *
 * Usage:
 *   PAYLOAD_DATABASE_PUSH=true npx tsx src/scripts/push-vision-schema.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env', override: true })
dotenv.config({ path: '.env.local', override: true })
process.env.PAYLOAD_DATABASE_PUSH = 'true'

async function main() {
  const { getPayload } = await import('payload')
  const { default: config } = await import('@/payload.config')

  console.log('Pushing Payload schema (PAYLOAD_DATABASE_PUSH=true)…')
  await getPayload({ config })
  console.log('Schema push complete.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
