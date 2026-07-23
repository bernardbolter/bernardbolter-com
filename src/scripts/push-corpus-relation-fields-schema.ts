/**
 * DEV ONLY — interactive Payload Drizzle push.
 *
 * On Netcup / production, do NOT run this. It will prompt to delete unrelated
 * legacy columns. Use the additive SQL migration instead:
 *
 *   npx tsx src/scripts/add-corpus-relation-fields-schema.ts
 *
 * Usage (local only): npx tsx src/scripts/push-corpus-relation-fields-schema.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env', override: true })
dotenv.config({ path: '.env.local', override: true })

if (process.env.NODE_ENV === 'production' || process.env.FORCE_ADDITIVE_ONLY === 'true') {
  console.error(
    'Refusing interactive Drizzle push. Run: npx tsx src/scripts/add-corpus-relation-fields-schema.ts',
  )
  process.exit(1)
}

process.env.PAYLOAD_DATABASE_PUSH = 'true'
process.env.NODE_ENV = 'development'
process.env.PAYLOAD_FORCE_DRIZZLE_PUSH = 'true'

async function main() {
  console.log('Pushing Payload schema for relatedWorksAtMaking / seriesHingeMarker / linchpinFlag…')
  console.log('WARNING: If you see DATA LOSS deletes for unrelated columns, answer N and use add-corpus-relation-fields-schema.ts instead.')
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
