/**
 * Insert a two-hop manual redirect chain for Stage 1 live verify.
 * Paths are under /sessions/ and do not collide with real sessionIds.
 *
 *   npx tsx src/scripts/seed-redirect-smoke-test.ts
 *
 * Verify:
 *   curl -sI 'https://bernardbolter.com/sessions/__redirect-smoke-a' | grep -i location
 *   # expect .../sessions/__redirect-smoke-c
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env', override: true })
dotenv.config({ path: '.env.local', override: true })

import { getPayload } from 'payload'
import config from '@/payload.config'
import { recordSlugRedirect } from '@/lib/redirects/recordSlugRedirect'
import { resolveRedirectTarget } from '@/lib/redirects/recordSlugRedirect'

const A = '/sessions/__redirect-smoke-a'
const B = '/sessions/__redirect-smoke-b'
const C = '/sessions/__redirect-smoke-c'

async function main() {
  const payload = await getPayload({ config })

  await recordSlugRedirect(payload, { fromPath: A, toPath: B, source: 'manual' })
  await recordSlugRedirect(payload, { fromPath: B, toPath: C, source: 'manual' })

  const landed = await resolveRedirectTarget(payload, A)
  console.log(JSON.stringify({ from: A, hops: `${A} -> ${B} -> ${C}`, landed }, null, 2))
  if (landed !== C) {
    console.error('FAIL: expected terminal', C)
    process.exit(1)
  }
  console.log('OK: multi-hop resolve lands on C')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
