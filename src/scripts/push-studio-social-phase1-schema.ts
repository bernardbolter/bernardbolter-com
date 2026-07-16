/**
 * Dev-only Drizzle schema push for Studio Phase 1 social collections.
 * For production column patches (museumSourced, dinov2), also run:
 *   npm run migrate:studio-social-phase1
 *
 * Usage: npm run push:studio-social-phase1
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env', override: true })
dotenv.config({ path: '.env.local', override: true })

process.env.PAYLOAD_DATABASE_PUSH = 'true'
process.env.NODE_ENV = 'development'
process.env.PAYLOAD_FORCE_DRIZZLE_PUSH = 'true'

async function main() {
  console.log('Pushing Payload schema for Studio Phase 1 social collections...')
  const { getPayload } = await import('payload')
  const { default: config } = await import('../payload.config.ts')
  const payload = await getPayload({ config })
  const destroy = (payload.db as { destroy?: () => Promise<void> } | undefined)?.destroy
  if (destroy) await destroy.call(payload.db)
  console.log('Schema push complete.')
  console.log('Next: npm run migrate:studio-social-phase1')
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
