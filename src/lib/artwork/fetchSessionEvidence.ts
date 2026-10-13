import type { Payload } from 'payload'

import {
  sessionMessageCount,
  sessionTimelineCount,
  type SessionEvidence,
} from '@/lib/artwork/deriveReasoningStatus'
import type { Artwork } from '@/payload-types'

function relationId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id: unknown }).id
    if (typeof id === 'number' && Number.isFinite(id)) return id
  }
  return null
}

function artworkSlugFromRelation(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const slug = (value as Artwork).slug
  if (typeof slug !== 'string') return null
  const trimmed = slug.trim()
  return trimmed || null
}

/**
 * All completed sessions with message/timeline counts (bodies discarded).
 * Used for derived reasoningStatus and catalogue-status date evidence.
 */
export async function fetchCompletedSessionEvidence(
  payload: Payload,
): Promise<SessionEvidence[]> {
  const sessions: SessionEvidence[] = []
  let page = 1
  let hasNextPage = true

  while (hasNextPage) {
    const result = await payload.find({
      collection: 'sessions',
      where: { status: { equals: 'completed' } },
      limit: 100,
      page,
      depth: 1,
      overrideAccess: true,
      select: {
        sessionId: true,
        primaryArtwork: true,
        artworkRecord: true,
        messages: true,
        fieldUpdateTimeline: true,
        createdAt: true,
        completedAt: true,
      },
    })

    for (const doc of result.docs) {
      const primaryRel = doc.primaryArtwork ?? doc.artworkRecord
      const primaryId = relationId(primaryRel)
      const primarySlug = artworkSlugFromRelation(primaryRel)
      // Count only — do not retain message bodies.
      const messageCount = sessionMessageCount(doc.messages)
      const timelineCount = sessionTimelineCount(doc.fieldUpdateTimeline)
      sessions.push({
        sessionId:
          (typeof doc.sessionId === 'string' && doc.sessionId.trim()) || String(doc.id),
        primaryArtworkId: primaryId,
        primarySlug,
        messageCount,
        timelineCount,
        createdAt: doc.createdAt ?? null,
        completedAt: doc.completedAt ?? null,
      })
    }

    hasNextPage = result.hasNextPage
    page += 1
  }

  return sessions
}

/** Primary completed-session evidence for one artwork (by id and/or slug). */
export async function fetchPrimarySessionEvidenceForArtwork(
  payload: Payload,
  artwork: { id: number; slug: string },
): Promise<SessionEvidence[]> {
  const result = await payload.find({
    collection: 'sessions',
    where: {
      and: [
        { status: { equals: 'completed' } },
        {
          or: [
            { primaryArtwork: { equals: artwork.id } },
            { artworkRecord: { equals: artwork.id } },
          ],
        },
      ],
    },
    limit: 100,
    depth: 0,
    overrideAccess: true,
    select: {
      sessionId: true,
      primaryArtwork: true,
      artworkRecord: true,
      messages: true,
      fieldUpdateTimeline: true,
      createdAt: true,
      completedAt: true,
    },
  })

  return result.docs.map((doc) => ({
    sessionId:
      (typeof doc.sessionId === 'string' && doc.sessionId.trim()) || String(doc.id),
    primaryArtworkId: relationId(doc.primaryArtwork) ?? relationId(doc.artworkRecord),
    primarySlug: artwork.slug,
    messageCount: sessionMessageCount(doc.messages),
    timelineCount: sessionTimelineCount(doc.fieldUpdateTimeline),
    createdAt: doc.createdAt ?? null,
    completedAt: doc.completedAt ?? null,
  }))
}

/** Dates of completed primary sessions that have at least one message. */
export function sessionDatesByArtworkIdFromEvidence(
  sessions: SessionEvidence[],
): Record<number, string[]> {
  const datesByArtworkId: Record<number, string[]> = {}
  for (const session of sessions) {
    if (session.messageCount <= 0) continue
    const artworkId = session.primaryArtworkId
    const createdAt = session.createdAt
    if (artworkId == null || !createdAt) continue
    const existing = datesByArtworkId[artworkId] ?? []
    existing.push(createdAt)
    datesByArtworkId[artworkId] = existing
  }
  return datesByArtworkId
}
