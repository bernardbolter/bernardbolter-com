import type { Payload } from 'payload'

import type { Session, User } from '@/payload-types'

export type ExemplarEventSession = Pick<
  Session,
  | 'id'
  | 'sessionId'
  | 'sessionType'
  | 'status'
  | 'completedAt'
  | 'eventRecord'
  | 'messages'
  | 'sessionNotes'
  | 'isExemplar'
  | 'fieldUpdateTimeline'
>

/**
 * Completed event-enrichment session marked isExemplar — used as Phase B reference.
 * Prefer the most recently completed exemplar when several exist.
 */
export async function queryExemplarEventSession(args: {
  payload: Payload
  user: User
  excludeSessionId?: string | null
}): Promise<ExemplarEventSession | null> {
  const { payload, user, excludeSessionId } = args

  const where: Record<string, unknown> = {
    and: [
      { sessionType: { equals: 'event-enrichment' } },
      { status: { equals: 'completed' } },
      { isExemplar: { equals: true } },
    ],
  }

  if (excludeSessionId?.trim()) {
    ;(where.and as unknown[]).push({
      sessionId: { not_equals: excludeSessionId.trim() },
    })
  }

  const result = await payload.find({
    collection: 'sessions',
    where: where as never,
    limit: 1,
    depth: 1,
    sort: '-completedAt',
    overrideAccess: false,
    user,
    select: {
      sessionId: true,
      sessionType: true,
      status: true,
      completedAt: true,
      eventRecord: true,
      messages: true,
      sessionNotes: true,
      isExemplar: true,
      fieldUpdateTimeline: true,
    },
  })

  return (result.docs[0] as ExemplarEventSession | undefined) ?? null
}

/** Compact prompt block — skip gracefully when none exist. */
export function summarizeExemplarEventSessionForPrompt(
  session: ExemplarEventSession | Session | null,
): string {
  if (!session) {
    return 'EXEMPLAR EVENT SESSION — none yet. Skip this block; do not invent one.'
  }

  const event =
    session.eventRecord && typeof session.eventRecord === 'object' ?
      session.eventRecord
    : null
  const title = event && 'title' in event && typeof event.title === 'string' ? event.title : null
  const slug = event && 'slug' in event && typeof event.slug === 'string' ? event.slug : null
  const messageCount = Array.isArray(session.messages) ? session.messages.length : 0

  const lines = [
    'EXEMPLAR EVENT SESSION (isExemplar: true) — tone/shape reference only; do not copy fields:',
    `- sessionId: ${session.sessionId}`,
    title || slug ? `- event: ${[title, slug].filter(Boolean).join(' / ')}` : null,
    session.sessionNotes?.trim() ?
      `- sessionNotes: ${session.sessionNotes.trim().slice(0, 400)}`
    : null,
    `- messages: ${messageCount} turns (full transcript is in the Sessions record; do not invent Q&A)`,
  ].filter(Boolean)

  return lines.join('\n')
}
