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
import { runImageAnalysisStub } from './imageAnalysisStub'

export type ApplyAgentToolCtx = {
  payload: Payload
  user: User
  session: Session
  tool: { name: string; input: unknown; id: string }
  send: (event: string, data: unknown) => void
}

export async function applyAgentTool(ctx: ApplyAgentToolCtx): Promise<void> {
  const { payload, user, session, tool, send } = ctx

  try {
    switch (tool.name) {
      case TOOL_UPDATE_FIELD: {
        const parsed = parseToolArgs(tool.name, tool.input)
        if (!parsed.ok) {
          send('error', { tool: tool.name, message: parsed.error })
          return
        }
        const args = updateFieldSchema.parse(parsed.data)
        if (!isFieldAllowedForAgent(args.targetCollection, args.field)) {
          send('error', {
            tool: tool.name,
            message: `Field ${args.targetCollection}.${args.field} is not writable by the agent.`,
          })
          return
        }
        const timeline = Array.isArray(session.fieldUpdateTimeline)
          ? [...session.fieldUpdateTimeline]
          : []
        timeline.push({
          targetCollection: args.targetCollection,
          field: args.field,
          value: args.value,
          confidence: args.confidence,
          source: args.source,
          timestamp: new Date().toISOString(),
        })
        await payload.update({
          collection: 'sessions',
          id: session.id,
          data: { fieldUpdateTimeline: timeline },
          overrideAccess: false,
          user,
          context: { skipAgent: true },
        })
        send('tool-staged', { name: tool.name, input: args })
        return
      }

      case TOOL_STORE_SESSION_FIELD: {
        const parsed = parseToolArgs(tool.name, tool.input)
        if (!parsed.ok) {
          send('error', { tool: tool.name, message: parsed.error })
          return
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
        return
      }

      case TOOL_GENERATE_CONFIRMATION_DRAFT: {
        const parsed = parseToolArgs(tool.name, tool.input)
        if (!parsed.ok) {
          send('error', { tool: tool.name, message: parsed.error })
          return
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
        return
      }

      case TOOL_FLAG_WEAK_PHASE: {
        const parsed = parseToolArgs(tool.name, tool.input)
        if (!parsed.ok) {
          send('error', { tool: tool.name, message: parsed.error })
          return
        }
        const args = flagWeakPhaseSchema.parse(parsed.data)
        const current = Array.isArray(session.weakPhases) ? session.weakPhases : []
        if (!current.includes(args.phase)) {
          await payload.update({
            collection: 'sessions',
            id: session.id,
            data: { weakPhases: [...current, args.phase] },
            overrideAccess: false,
            user,
            context: { skipAgent: true },
          })
        }
        return
      }

      case TOOL_ASSESS_FORMAL_CONTRIBUTION: {
        const parsed = parseToolArgs(tool.name, tool.input)
        if (!parsed.ok) {
          send('error', { tool: tool.name, message: parsed.error })
          return
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
        return
      }

      case TOOL_TRIGGER_IMAGE_ANALYSIS: {
        const parsed = parseToolArgs(tool.name, tool.input)
        if (!parsed.ok) {
          send('error', { tool: tool.name, message: parsed.error })
          return
        }
        const args = triggerImageAnalysisSchema.parse(parsed.data)
        const result = await runImageAnalysisStub({ mediaId: args.mediaId })
        send('image-analysis', result)
        return
      }

      default:
        send('error', { message: `Unknown tool: ${tool.name}` })
    }
  } catch (err) {
    send('error', {
      tool: tool.name,
      message: err instanceof Error ? err.message : 'Tool application failed',
    })
  }
}
