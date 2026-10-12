import type { Payload, PayloadRequest } from 'payload'

import { normalizeRedirectPath } from '@/lib/redirects/paths'

export type RedirectSource = 'session' | 'throughline' | 'bio-entry' | 'manual'

const MAX_HOP_FOLLOW = 20

/**
 * Record that fromPath now points at toPath. Idempotent on fromPath.
 * If fromPath already redirects elsewhere, update the target.
 * Never creates a self-loop (from === to).
 */
export async function recordSlugRedirect(
  payload: Payload,
  options: {
    fromPath: string
    toPath: string
    source: RedirectSource
    req?: PayloadRequest
  },
): Promise<void> {
  const fromPath = normalizeRedirectPath(options.fromPath)
  const toPath = normalizeRedirectPath(options.toPath)
  if (!fromPath || !toPath || fromPath === toPath) return

  const existing = await payload.find({
    collection: 'redirects',
    where: { fromPath: { equals: fromPath } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req: options.req,
  })

  const doc = existing.docs[0]
  if (doc) {
    if (doc.toPath === toPath && doc.source === options.source) {
      await flattenInboundRedirects(payload, fromPath, toPath, options.source, options.req)
      return
    }
    await payload.update({
      collection: 'redirects',
      id: doc.id,
      data: { toPath, source: options.source },
      overrideAccess: true,
      context: { skipRedirectHooks: true },
      req: options.req,
    })
  } else {
    await payload.create({
      collection: 'redirects',
      data: {
        fromPath,
        toPath,
        source: options.source,
      },
      overrideAccess: true,
      context: { skipRedirectHooks: true },
      req: options.req,
    })
  }

  // Second hop → retarget every row that still pointed at fromPath so old
  // URLs 308 in one hop to the final slug (not via an intermediate).
  await flattenInboundRedirects(payload, fromPath, toPath, options.source, options.req)
}

/**
 * Any redirect whose toPath is `oldTo` now points at `newTo`.
 * Skips self-loops (fromPath === newTo).
 */
async function flattenInboundRedirects(
  payload: Payload,
  oldTo: string,
  newTo: string,
  source: RedirectSource,
  req?: PayloadRequest,
): Promise<void> {
  if (!oldTo || !newTo || oldTo === newTo) return

  const inbound = await payload.find({
    collection: 'redirects',
    where: { toPath: { equals: oldTo } },
    limit: 500,
    depth: 0,
    overrideAccess: true,
    req,
  })

  for (const row of inbound.docs) {
    const from = normalizeRedirectPath(row.fromPath)
    if (!from || from === newTo) continue
    if (row.toPath === newTo && row.source === source) continue
    await payload.update({
      collection: 'redirects',
      id: row.id,
      data: { toPath: newTo, source },
      overrideAccess: true,
      context: { skipRedirectHooks: true },
      req,
    })
  }
}

/**
 * Follow redirect rows until a terminal path (not itself a fromPath), or max hops.
 * Returns null when fromPath has no redirect row.
 */
export async function resolveRedirectTarget(
  payload: Payload,
  fromPath: string,
): Promise<string | null> {
  let current = normalizeRedirectPath(fromPath)
  if (!current) return null

  const seen = new Set<string>()
  let hops = 0
  let landed: string | null = null

  while (hops < MAX_HOP_FOLLOW) {
    if (seen.has(current)) break
    seen.add(current)

    const result = await payload.find({
      collection: 'redirects',
      where: { fromPath: { equals: current } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const next = result.docs[0]?.toPath
      ? normalizeRedirectPath(result.docs[0].toPath)
      : null
    if (!next) break
    landed = next
    current = next
    hops += 1
  }

  return landed
}
