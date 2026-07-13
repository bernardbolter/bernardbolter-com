/**
 * Dev-only Drizzle schema push (Payload skips push when NODE_ENV=production).
 * For production / Netcup, use: npm run migrate:fieldnotes-pipeline
 * (runs add-fieldnotes-pipeline-schema.ts).
 *
 * Sets PAYLOAD_DATABASE_PUSH=true and NODE_ENV=development for this process only.
 * payload.config.ts preserves the push flag across its own dotenv reload.
 *
 * Usage: npm run push:fieldnotes-pipeline
 *
 * After push, verify: npm run verify:fieldnotes-pipeline-schema
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env', override: true })
dotenv.config({ path: '.env.local', override: true })

process.env.PAYLOAD_DATABASE_PUSH = 'true'
process.env.NODE_ENV = 'development'
process.env.PAYLOAD_FORCE_DRIZZLE_PUSH = 'true'

async function main() {
  console.log('Pushing Payload schema (dev push — NODE_ENV=development)...')
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
  console.log('Next: npm run verify:fieldnotes-pipeline-schema')
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
