/**
 * One-shot Drizzle schema push for sessions / bio-statement capture fields.
 * Payload skips push when NODE_ENV=production, so this process forces development.
 *
 * Sets PAYLOAD_DATABASE_PUSH=true for this process only — do not leave that on in .env.
 *
 * Usage (on Netcup, after git pull, before deploy):
 *   npx tsx src/scripts/push-sessions-foundation-schema.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env', override: true })
dotenv.config({ path: '.env.local', override: true })

process.env.PAYLOAD_DATABASE_PUSH = 'true'
process.env.NODE_ENV = 'development'
process.env.PAYLOAD_FORCE_DRIZZLE_PUSH = 'true'

async function main() {
  console.log('Pushing sessions foundation schema (dev push — NODE_ENV=development)...')
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
