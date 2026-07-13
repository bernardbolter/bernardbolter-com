/**
 * One-off Payload schema push for capture-presets + field-notes pipeline fields.
 *
 * Sets PAYLOAD_DATABASE_PUSH=true for this process only (does not change .env).
 * payload.config.ts preserves this flag across its own dotenv reload.
 *
 * Usage: npm run migrate:fieldnotes-pipeline
 *
 * After push, verify: npm run verify:fieldnotes-pipeline-schema
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env', override: true })
dotenv.config({ path: '.env.local', override: true })

process.env.PAYLOAD_DATABASE_PUSH = 'true'

async function main() {
  console.log('Pushing Payload schema (PAYLOAD_DATABASE_PUSH=true for this run)...')

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
