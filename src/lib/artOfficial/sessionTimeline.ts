import type { Payload } from 'payload'

import type { User } from '@/payload-types'

import { parseToolArgs, TOOL_UPDATE_FIELD, updateFieldSchema } from './agentTools'
import type { StoredMessage } from './chatMessages'
import { isFieldAllowedForAgent } from './fieldAllowlist'

export type TimelineEntry = {
  targetCollection?: string
  field?: string
  value?: unknown
  confidence?: string
  source?: string
  timestamp?: string
}

function timelineKey(entry: TimelineEntry): string {
  return `${entry.targetCollection ?? ''}:${entry.field ?? ''}`
}

function entryTime(entry: TimelineEntry): number {
  const t = entry.timestamp ? Date.parse(entry.timestamp) : 0
  return Number.isNaN(t) ? 0 : t
}

/** Extract successful update_field stages recorded in message history. */
export function extractTimelineFromMessages(messages: StoredMessage[]): TimelineEntry[] {
  const entries: TimelineEntry[] = []

  for (const message of messages) {
    if (message.role !== 'assistant' || !message.toolUses?.length) continue

    for (const tool of message.toolUses) {
      if (tool.name !== TOOL_UPDATE_FIELD) continue

      const parsed = parseToolArgs(TOOL_UPDATE_FIELD, tool.input)
      if (!parsed.ok) continue

      const args = updateFieldSchema.safeParse(parsed.data)
      if (!args.success) continue
      if (!isFieldAllowedForAgent(args.data.targetCollection, args.data.field)) continue

      entries.push({
        targetCollection: args.data.targetCollection,
        field: args.data.field,
        value: args.data.value,
        confidence: args.data.confidence,
        source: args.data.source,
        timestamp: message.timestamp ?? new Date().toISOString(),
      })
    }
  }

  return entries
}

/**
 * Merge DB timeline with tool calls embedded in messages.
 * Fixes lost updates when multiple update_field calls ran in one assistant turn.
 */
export function reconcileFieldUpdateTimeline(
  messages: StoredMessage[],
  existing: TimelineEntry[],
): { timeline: TimelineEntry[]; repaired: boolean } {
  const fromMessages = extractTimelineFromMessages(messages)
  const merged = new Map<string, TimelineEntry>()

  for (const entry of [...existing, ...fromMessages]) {
    if (!entry.field) continue
    const key = timelineKey(entry)
    const prev = merged.get(key)
    if (!prev || entryTime(entry) >= entryTime(prev)) {
      merged.set(key, entry)
    }
  }

  const timeline = [...merged.values()].sort((a, b) => entryTime(a) - entryTime(b))
  const repaired = timeline.length > existing.length

  return { timeline, repaired }
}

export type AppendTimelineArgs = {
  targetCollection: string
  field: string
  value: unknown
  confidence: 'confirmed' | 'inferred'
  source: 'conversation' | 'image-analysis' | 'knowledge-base'
}

/** Persist one staged field on the session timeline (used for auto-staging on upload). */
export async function appendSessionTimelineEntry(
  payload: Payload,
  user: User,
  session: { id: number; fieldUpdateTimeline?: unknown },
  entry: AppendTimelineArgs,
): Promise<TimelineEntry[]> {
  if (!isFieldAllowedForAgent(entry.targetCollection, entry.field)) {
    throw new Error(`Field ${entry.targetCollection}.${entry.field} is not allowed for staging.`)
  }

  const timeline = Array.isArray(session.fieldUpdateTimeline)
    ? [...(session.fieldUpdateTimeline as TimelineEntry[])]
    : []

  const row: TimelineEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  }
  timeline.push(row)

  await payload.update({
    collection: 'sessions',
    id: session.id,
    data: { fieldUpdateTimeline: timeline },
    overrideAccess: false,
    user,
    context: { skipAgent: true },
  })

  return timeline
}

/** Onboarding commits only practice-knowledge rows; drop mistaken artists/artworks staging. */
export function finalizeOnboardingTimeline(timeline: TimelineEntry[]): {
  timeline: TimelineEntry[]
  dropped: number
} {
  const pkOnly = timeline.filter((e) => e.targetCollection === 'practice-knowledge')
  return { timeline: pkOnly, dropped: timeline.length - pkOnly.length }
}
