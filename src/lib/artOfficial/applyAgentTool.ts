import type { Payload } from 'payload'

import type { Session, User } from '@/payload-types'

import {
  assessFormalContributionSchema,
  flagWeakPhaseSchema,
  generateConfirmationDraftSchema,
  parseToolArgs,
  storeSessionFieldSchema,
  TOOL_ASSESS_FORMAL_CONTRIBUTION,
  TOOL_FLAG_WEAK_PHASE,
  TOOL_GENERATE_CONFIRMATION_DRAFT,
  TOOL_STORE_SESSION_FIELD,
  TOOL_TRIGGER_IMAGE_ANALYSIS,
  TOOL_UPDATE_FIELD,
  triggerImageAnalysisSchema,
  updateFieldSchema,
} from './agentTools'
import { isFieldAllowedForAgent } from './fieldAllowlist'

const BIOGRAPHY_ARTIST_FIELDS = new Set(['bioFull', 'bioMedium', 'bioShort'])
const STATEMENT_ARTIST_FIELDS = new Set([
  'statementFull',
  'statementMedium',
  'statementShort',
])
import { runImageAnalysisStub } from './imageAnalysisStub'

export type ApplyAgentToolCtx = {
  payload: Payload
  user: User
  session: Session
  tool: { name: string; input: unknown; id: string }
  send: (event: string, data: unknown) => void
}

function toolResult(payload: Record<string, unknown>): string {
  return JSON.stringify(payload)
}

/** Apply tool side effects and return JSON for Anthropic `tool_result` content. */
export async function applyAgentTool(ctx: ApplyAgentToolCtx): Promise<string> {
  const { payload, user, session, tool, send } = ctx

  try {
    switch (tool.name) {
      case TOOL_UPDATE_FIELD: {
        const parsed = parseToolArgs(tool.name, tool.input)
        if (!parsed.ok) {
          send('error', { tool: tool.name, message: parsed.error })
          return toolResult({ ok: false, error: parsed.error })
        }
        const args = updateFieldSchema.parse(parsed.data)
        if (
          session.sessionType === 'onboarding' &&
          args.targetCollection !== 'practice-knowledge'
        ) {
          const message =
            'Onboarding only stages practice-knowledge. Use targetCollection "practice-knowledge" and field = slug (series, visual-vocabulary, art-historical-touchstones, preferred-vocabulary).'
          send('error', { tool: tool.name, message })
          return toolResult({ ok: false, error: message })
        }
        if (session.sessionType === 'biography') {
          if (args.targetCollection !== 'artists' || !BIOGRAPHY_ARTIST_FIELDS.has(args.field)) {
            const message =
              'Biography sessions must use update_field with targetCollection "artists" and field one of: bioFull, bioMedium, bioShort (plain-text value).'
            send('error', { tool: tool.name, message })
            return toolResult({ ok: false, error: message })
          }
        }
        if (session.sessionType === 'artist-statement') {
          if (
            args.targetCollection !== 'artists' ||
            !STATEMENT_ARTIST_FIELDS.has(args.field)
          ) {
            const message =
              'Artist statement sessions must use targetCollection "artists" and field one of: statementFull, statementMedium, statementShort.'
            send('error', { tool: tool.name, message })
            return toolResult({ ok: false, error: message })
          }
        }
        if (!isFieldAllowedForAgent(args.targetCollection, args.field)) {
          const message = `Field ${args.targetCollection}.${args.field} is not writable by the agent.`
          send('error', { tool: tool.name, message })
          return toolResult({ ok: false, error: message })
        }
        const timeline = Array.isArray(session.fieldUpdateTimeline)
          ? [...(session.fieldUpdateTimeline as Array<Record<string, unknown>>)]
          : []
        const entry = {
          targetCollection: args.targetCollection,
          field: args.field,
          value: args.value,
          confidence: args.confidence,
          source: args.source,
          timestamp: new Date().toISOString(),
        }
        timeline.push(entry)
        // Keep in-memory session in sync when several tools run in one turn.
        session.fieldUpdateTimeline = timeline
        await payload.update({
          collection: 'sessions',
          id: session.id,
          data: { fieldUpdateTimeline: timeline },
          overrideAccess: false,
          user,
          context: { skipAgent: true },
        })
        send('tool-staged', { name: tool.name, input: args })
        return toolResult({
          ok: true,
          staged: true,
          targetCollection: args.targetCollection,
          field: args.field,
        })
      }

      case TOOL_STORE_SESSION_FIELD: {
        const parsed = parseToolArgs(tool.name, tool.input)
        if (!parsed.ok) {
          send('error', { tool: tool.name, message: parsed.error })
          return toolResult({ ok: false, error: parsed.error })
        }
        const args = storeSessionFieldSchema.parse(parsed.data)
        await payload.update({
          collection: 'sessions',
          id: session.id,
          data: { [args.field]: args.value },
          overrideAccess: false,
          user,
          context: { skipAgent: true },
        })
        send('tool-staged', { name: tool.name, input: args })
        return toolResult({ ok: true, field: args.field })
      }

      case TOOL_GENERATE_CONFIRMATION_DRAFT: {
        const parsed = parseToolArgs(tool.name, tool.input)
        if (!parsed.ok) {
          send('error', { tool: tool.name, message: parsed.error })
          return toolResult({ ok: false, error: parsed.error })
        }
        const args = generateConfirmationDraftSchema.parse(parsed.data)
        await payload.update({
          collection: 'sessions',
          id: session.id,
          data: {
            agentDraftDescriptionShort: args.agentDraftDescriptionShort,
            agentDraftDescriptionLong: args.agentDraftDescriptionLong,
            agentDraftConceptualKeywords: args.agentDraftConceptualKeywords.map(
              (keyword) => ({ keyword }),
            ),
            agentDraftFormalContributionAssessment:
              args.agentDraftFormalContributionAssessment,
          },
          overrideAccess: false,
          user,
          context: { skipAgent: true },
        })
        send('tool-staged', { name: tool.name, input: args })
        return toolResult({ ok: true, draftSaved: true })
      }

      case TOOL_FLAG_WEAK_PHASE: {
        const parsed = parseToolArgs(tool.name, tool.input)
        if (!parsed.ok) {
          send('error', { tool: tool.name, message: parsed.error })
          return toolResult({ ok: false, error: parsed.error })
        }
        const args = flagWeakPhaseSchema.parse(parsed.data)
        const current = Array.isArray(session.weakPhases) ? session.weakPhases : []
        if (!current.includes(args.phase)) {
          session.weakPhases = [...current, args.phase]
          await payload.update({
            collection: 'sessions',
            id: session.id,
            data: { weakPhases: session.weakPhases },
            overrideAccess: false,
            user,
            context: { skipAgent: true },
          })
        }
        return toolResult({ ok: true, phase: args.phase })
      }

      case TOOL_ASSESS_FORMAL_CONTRIBUTION: {
        const parsed = parseToolArgs(tool.name, tool.input)
        if (!parsed.ok) {
          send('error', { tool: tool.name, message: parsed.error })
          return toolResult({ ok: false, error: parsed.error })
        }
        const args = assessFormalContributionSchema.parse(parsed.data)
        const prior = session.refinementNotes ?? ''
        await payload.update({
          collection: 'sessions',
          id: session.id,
          data: {
            formalContributionAccuracy: args.accuracy,
            refinementNotes: prior + `\n[formalContribution] ${args.notes}`,
          },
          overrideAccess: false,
          user,
          context: { skipAgent: true },
        })
        return toolResult({ ok: true, accuracy: args.accuracy })
      }

      case TOOL_TRIGGER_IMAGE_ANALYSIS: {
        const parsed = parseToolArgs(tool.name, tool.input)
        if (!parsed.ok) {
          send('error', { tool: tool.name, message: parsed.error })
          return toolResult({ ok: false, error: parsed.error })
        }
        const args = triggerImageAnalysisSchema.parse(parsed.data)
        const result = await runImageAnalysisStub({ mediaId: args.mediaId })
        send('image-analysis', result)
        return toolResult({ ok: true, analysis: result })
      }

      default: {
        const message = `Unknown tool: ${tool.name}`
        send('error', { message })
        return toolResult({ ok: false, error: message })
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Tool application failed'
    send('error', { tool: tool.name, message })
    return toolResult({ ok: false, error: message })
  }
}
