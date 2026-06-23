import type { Payload } from 'payload'

import type { Session, User } from '@/payload-types'

import { normalizeEventDialoguePhase } from './eventDialoguePhase'
import {
  isEventPhaseAStagingField,
  isEventReflectiveStagingField,
  normalizeEventPhaseAFieldName,
} from './eventPhaseAStaging'
import { isFieldAllowedForAgent } from './fieldAllowlist'

type TransitionCtx = {
  payload: Payload
  user: User
  session: Session
  send: (event: string, data: unknown) => void
  reason: string
}

export async function transitionEventSessionToPhaseB(
  ctx: TransitionCtx,
): Promise<boolean> {
  if (ctx.session.sessionType !== 'event-enrichment') return false
  if (normalizeEventDialoguePhase(ctx.session.eventDialoguePhase) === 'phase-b-reasoning') {
    return false
  }

  ctx.session.eventDialoguePhase = 'phase-b-reasoning'
  await ctx.payload.update({
    collection: 'sessions',
    id: ctx.session.id,
    data: { eventDialoguePhase: 'phase-b-reasoning' },
    overrideAccess: false,
    user: ctx.user,
    context: { skipAgent: true },
  })
  ctx.send('phase-transition', { phase: 'phase-b-reasoning', reason: ctx.reason })
  return true
}

/** Advance to Phase B when staging narrative fields while still in Phase A. */
export async function ensureEventPhaseBForFieldStaging(
  ctx: TransitionCtx & { targetCollection: string; field: string },
): Promise<string | null> {
  if (ctx.session.sessionType !== 'event-enrichment') return null
  if (ctx.targetCollection !== 'events') {
    return 'Event sessions stage on targetCollection "events" only.'
  }

  const field = normalizeEventPhaseAFieldName(ctx.field)
  if (!isFieldAllowedForAgent('events', field)) {
    return `Field events.${field} is not writable by the agent.`
  }

  if (normalizeEventDialoguePhase(ctx.session.eventDialoguePhase) === 'phase-b-reasoning') {
    return null
  }

  if (isEventPhaseAStagingField(field)) {
    return null
  }

  if (!isEventReflectiveStagingField(field)) {
    return `Field ${field} cannot be staged in this session.`
  }

  await transitionEventSessionToPhaseB(ctx)
  return null
}
