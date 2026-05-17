/**
 * Re-apply Practice Knowledge from a completed onboarding session timeline.
 * Usage: pnpm tsx src/scripts/reapply-onboarding-pk.ts <sessionId>
 */
import { getPayload } from 'payload'

import {
  applyPracticeKnowledgePatches,
  patchesFromSessionTimeline,
} from '@/lib/artOfficial/applyPracticeKnowledgePatches'
import config from '@payload-config'

async function main() {
  const sessionId = process.argv[2]
  if (!sessionId) {
    console.error('Usage: pnpm tsx src/scripts/reapply-onboarding-pk.ts <sessionId>')
    process.exit(1)
  }

  const payload = await getPayload({ config })

  const sessionRes = await payload.find({
    collection: 'sessions',
    where: { sessionId: { equals: sessionId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const session = sessionRes.docs[0]
  if (!session) {
    console.error('Session not found:', sessionId)
    process.exit(1)
  }

  if (session.sessionType !== 'onboarding') {
    console.error('Session is not onboarding:', session.sessionType)
    process.exit(1)
  }

  const patches = patchesFromSessionTimeline(session.fieldUpdateTimeline, [])
  console.log('Patches to apply:', patches.map((p) => p.slug).join(', ') || '(none)')

  if (!patches.length) {
    console.error('No practice-knowledge rows in fieldUpdateTimeline.')
    process.exit(1)
  }

  const users = await payload.find({
    collection: 'users',
    limit: 1,
    overrideAccess: true,
  })
  const user = users.docs[0]
  if (!user) {
    console.error('No admin user found for access-controlled update.')
    process.exit(1)
  }

  const result = await applyPracticeKnowledgePatches(payload, user, patches)
  console.log(JSON.stringify(result, null, 2))

  if (result.missing.length) {
    console.error('\nMissing slugs — run: pnpm tsx src/scripts/seed-practice-knowledge.ts')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
