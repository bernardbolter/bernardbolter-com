/**
 * Stage 2: rename sessionId values to {artwork-slug}-{YYYY-MM-DD}.
 * beforeChange records redirects for every change.
 *
 * HOLD (relation unset but matching artwork exists — do not guess):
 *   the-way-to-la-2026-08-15, space-time-session-2026-08-12,
 *   session-the-end-2026-08-13, session-four-nations-2026-08-31
 *
 * Usage (Netcup, after Stage 1 redirects are live):
 *   npx tsx src/scripts/rename-session-ids.ts --dry-run
 *   npx tsx src/scripts/rename-session-ids.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env', override: true })
dotenv.config({ path: '.env.local', override: true })

import { getPayload } from 'payload'
import config from '@/payload.config'
import {
  allocateSessionId,
  buildSessionIdBase,
  readArtworkSlug,
} from '@/lib/sessions/sessionId'

/** SessionIds left untouched: artwork exists, primary/artworkRecord unset. */
const HOLD_SESSION_IDS = new Set([
  'the-way-to-la-2026-08-15',
  'space-time-session-2026-08-12',
  'session-the-end-2026-08-13',
  'session-four-nations-2026-08-31',
])

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const payload = await getPayload({ config })

  const sessions: Array<{
    id: number | string
    sessionId: string
    completedAt?: string | null
    createdAt?: string | null
    primaryArtwork?: unknown
    artworkRecord?: unknown
  }> = []

  let page = 1
  while (true) {
    const result = await payload.find({
      collection: 'sessions',
      limit: 100,
      page,
      depth: 1,
      sort: 'id',
      overrideAccess: true,
    })
    for (const doc of result.docs) {
      if (typeof doc.sessionId !== 'string' || !doc.sessionId.trim()) continue
      sessions.push({
        id: doc.id,
        sessionId: doc.sessionId.trim(),
        completedAt: typeof doc.completedAt === 'string' ? doc.completedAt : null,
        createdAt: typeof doc.createdAt === 'string' ? doc.createdAt : null,
        primaryArtwork: doc.primaryArtwork,
        artworkRecord: doc.artworkRecord,
      })
    }
    if (!result.hasNextPage) break
    page += 1
  }

  // Pass 1: desired bases (before collision allocation).
  type Plan = {
    id: number | string
    from: string
    base: string
    to: string
    hold: boolean
  }
  const plans: Plan[] = []
  for (const s of sessions) {
    if (HOLD_SESSION_IDS.has(s.sessionId)) {
      plans.push({
        id: s.id,
        from: s.sessionId,
        base: s.sessionId,
        to: s.sessionId,
        hold: true,
      })
      continue
    }
    const artSlug =
      readArtworkSlug(s.primaryArtwork as { slug?: string | null }) ||
      readArtworkSlug(s.artworkRecord as { slug?: string | null })
    const base = buildSessionIdBase({
      artworkSlug: artSlug,
      completedAt: s.completedAt,
      createdAt: s.createdAt,
    })
    plans.push({ id: s.id, from: s.sessionId, base, to: base, hold: false })
  }

  // Pass 2: allocate unique targets. Prefer keeping current id when it already
  // equals the base or an allocated form of the base.
  const used = new Set<string>()
  // Reserve HOLD and already-correct ids first so collisions resolve around them.
  for (const plan of plans) {
    if (plan.hold || plan.from === plan.base) {
      used.add(plan.from)
      plan.to = plan.from
    }
  }
  for (const plan of plans) {
    if (plan.hold || plan.from === plan.to) continue
    // If current slug is already a collision form of this base, keep it.
    if (plan.from === plan.base || plan.from.startsWith(`${plan.base}-`)) {
      const suffix = plan.from.slice(plan.base.length)
      if (suffix === '' || /^-\d+$/.test(suffix)) {
        if (!used.has(plan.from)) {
          used.add(plan.from)
          plan.to = plan.from
          continue
        }
      }
    }
    const allocated = allocateSessionId(plan.base, used)
    used.add(allocated)
    plan.to = allocated
  }

  const changes = plans.filter((p) => !p.hold && p.from !== p.to)
  const holds = plans.filter((p) => p.hold)

  console.log(
    JSON.stringify(
      {
        dryRun,
        total: plans.length,
        changeCount: changes.length,
        holdCount: holds.length,
        holds: holds.map((h) => h.from),
        changes: changes.map((c) => ({ id: c.id, from: c.from, to: c.to })),
      },
      null,
      2,
    ),
  )

  if (dryRun) {
    console.log('dry-run only; no writes')
    process.exit(0)
  }

  for (const change of changes) {
    await payload.update({
      collection: 'sessions',
      id: change.id,
      data: { sessionId: change.to },
      overrideAccess: true,
      context: { skipHooks: false },
    })
    console.log(`renamed ${change.from} → ${change.to}`)
  }

  console.log(`done: ${changes.length} renamed, ${holds.length} held`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
