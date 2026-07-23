/**
 * Dev Drizzle schema push for corpus relation + linchpin session fields.
 *
 * Usage: npx tsx src/scripts/push-corpus-relation-fields-schema.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env', override: true })
dotenv.config({ path: '.env.local', override: true })

process.env.PAYLOAD_DATABASE_PUSH = 'true'
process.env.NODE_ENV = 'development'
process.env.PAYLOAD_FORCE_DRIZZLE_PUSH = 'true'

async function main() {
  console.log('Pushing Payload schema for relatedWorksAtMaking / seriesHingeMarker / linchpinFlag…')
  const { getPayload } = await import('payload')
  const { default: config } = await import('../payload.config.ts')
  const payload = await getPayload({ config })
  const destroy = (payload.db as { destroy?: () => Promise<void> } | undefined)?.destroy
  if (destroy) await destroy.call(payload.db)
  console.log('Schema push complete.')
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
