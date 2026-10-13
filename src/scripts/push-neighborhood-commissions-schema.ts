/**
 * One-shot Drizzle schema push for Neighborhood Commissions:
 * - collection ach-neighborhood-sources
 * - global neighborhood-commissions
 * - Artworks.ach.neighborhoodCommission
 *
 * Sets PAYLOAD_DATABASE_PUSH=true for this process only — do not leave that on in .env.
 *
 * Usage (local or Netcup after pull):
 *   npx tsx src/scripts/push-neighborhood-commissions-schema.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env', override: true })
dotenv.config({ path: '.env.local', override: true })

process.env.PAYLOAD_DATABASE_PUSH = 'true'
process.env.NODE_ENV = 'development'
process.env.PAYLOAD_FORCE_DRIZZLE_PUSH = 'true'

async function main() {
  console.log('Pushing Neighborhood Commissions schema (dev push — NODE_ENV=development)...')
  console.log(`  PAYLOAD_DATABASE_PUSH=${process.env.PAYLOAD_DATABASE_PUSH}`)
  console.log(`  NODE_ENV=${process.env.NODE_ENV}`)

  const { getPayload } = await import('payload')
  const { default: config } = await import('../payload.config.ts')

  const payload = await getPayload({ config })

  const destroy = (payload.db as { destroy?: () => Promise<void> } | undefined)?.destroy
  if (destroy) {
    await destroy.call(payload.db)
  }

  console.log('Schema push complete.')
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
