import type { Payload } from 'payload'

import type { Session, User } from '@/payload-types'

import {
  assessFormalContributionSchema,
  fetchWikipediaArticleSchema,
  flagWeakPhaseSchema,
  generateConfirmationDraftSchema,
  getWikidataEntitySchema,
  lookupCommonsFileSchema,
  parseToolArgs,
  searchGettyTgnSchema,
  searchWikidataSchema,
  storeSessionFieldSchema,
  TOOL_ASSESS_FORMAL_CONTRIBUTION,
  TOOL_FETCH_WIKIPEDIA_ARTICLE,
  TOOL_FLAG_WEAK_PHASE,
  TOOL_GENERATE_CONFIRMATION_DRAFT,
  TOOL_GET_MEDIA_UPLOAD_STATUS,
  TOOL_GET_WIKIDATA_ENTITY,
  TOOL_LOOKUP_COMMONS_FILE,
  TOOL_SEARCH_GETTY_TGN,
  TOOL_SEARCH_WIKIDATA,
  TOOL_STORE_SESSION_FIELD,
  TOOL_TRIGGER_IMAGE_ANALYSIS,
  TOOL_UPDATE_FIELD,
  triggerImageAnalysisSchema,
  updateFieldSchema,
} from './agentTools'
import {
  fetchCommonsFileMetadata,
  fetchWikipediaArticle,
  getWikidataEntity,
  searchGettyTgn,
  searchWikidata,
} from './externalLookups'
import { isFieldAllowedForAgent } from './fieldAllowlist'
import {
  formatMediaStatusForAgent,
  resolveMediaSlotStates,
} from './stagedMedia'
import { runImageAnalysis } from './runImageAnalysis'

const BIOGRAPHY_ARTIST_FIELDS = new Set(['bioFull', 'bioMedium', 'bioShort'])
const STATEMENT_ARTIST_FIELDS = new Set([
  'statementFull',
  'statementMedium',
  'statementShort',
])

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

/** Log and return a failed tool_result — never emit SSE `error` (that aborts the chat UI). */
function failTool(tool: string, message: string): string {
  console.warn(`[art-official] tool ${tool}:`, message)
  return toolResult({ ok: false, error: message })
}

/** Apply tool side effects and return JSON for Anthropic `tool_result` content. */
export async function applyAgentTool(ctx: ApplyAgentToolCtx): Promise<string> {
  const { payload, user, session, tool, send } = ctx

  try {
    switch (tool.name) {
      case TOOL_UPDATE_FIELD: {
        const parsed = parseToolArgs(tool.name, tool.input)
        if (!parsed.ok) {
          return failTool(tool.name, parsed.error)
        }
        const args = updateFieldSchema.parse(parsed.data)
        if (
          session.sessionType === 'onboarding' &&
          args.targetCollection !== 'practice-knowledge'
        ) {
          const message =
            'Onboarding only stages practice-knowledge. Use targetCollection "practice-knowledge" and field = slug (series, visual-vocabulary, art-historical-touchstones, preferred-vocabulary).'
          return failTool(tool.name, message)
        }
        if (session.sessionType === 'biography') {
          if (args.targetCollection !== 'artists' || !BIOGRAPHY_ARTIST_FIELDS.has(args.field)) {
            const message =
              'Biography sessions must use update_field with targetCollection "artists" and field one of: bioFull, bioMedium, bioShort (plain-text value).'
            return failTool(tool.name, message)
          }
        }
        if (session.sessionType === 'artist-statement') {
          if (
            args.targetCollection !== 'artists' ||
            !STATEMENT_ARTIST_FIELDS.has(args.field)
          ) {
            const message =
              'Artist statement sessions must use targetCollection "artists" and field one of: statementFull, statementMedium, statementShort.'
            return failTool(tool.name, message)
          }
        }
        if (session.sessionType === 'triptych-cataloguing') {
          if (args.targetCollection !== 'triptychs') {
            const message =
              'Triptych sessions must use update_field with targetCollection "triptychs" only (corpus and core narrative fields — not panels or commerce).'
            return failTool(tool.name, message)
          }
        }
        if (!isFieldAllowedForAgent(args.targetCollection, args.field)) {
          const message = `Field ${args.targetCollection}.${args.field} is not writable by the agent.`
          return failTool(tool.name, message)
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
          return failTool(tool.name, parsed.error)
        }
        const args = storeSessionFieldSchema.parse(parsed.data)
        const sessionData: Record<string, unknown> =
          args.field === 'preUploadStep'
            ? { preUploadStep: Number(args.value) }
            : { [args.field]: args.value }
        if (args.field === 'preUploadStep') {
          session.preUploadStep = Number(args.value)
        } else if (args.field === 'firstImpression') {
          session.firstImpression = args.value
        } else if (args.field === 'highlightedMediaSlot') {
          session.highlightedMediaSlot = args.value
        }
        await payload.update({
          collection: 'sessions',
          id: session.id,
          data: sessionData,
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
          return failTool(tool.name, parsed.error)
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
          return failTool(tool.name, parsed.error)
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
          return failTool(tool.name, parsed.error)
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
          return failTool(tool.name, parsed.error)
        }
        const args = triggerImageAnalysisSchema.parse(parsed.data)
        const result = await runImageAnalysis({
          mediaId: args.mediaId,
          payload,
          user,
        })
        send('image-analysis', result)
        return toolResult({ ok: true, analysis: result })
      }

      case TOOL_LOOKUP_COMMONS_FILE: {
        const parsed = parseToolArgs(tool.name, tool.input)
        if (!parsed.ok) {
          return failTool(tool.name, parsed.error)
        }
        const args = lookupCommonsFileSchema.parse(parsed.data)
        const result = await fetchCommonsFileMetadata(args.commonsUrl)
        return toolResult(
          'error' in result ? { ok: false, error: result.error } : { ok: true, metadata: result },
        )
      }

      case TOOL_SEARCH_WIKIDATA: {
        const parsed = parseToolArgs(tool.name, tool.input)
        if (!parsed.ok) {
          return failTool(tool.name, parsed.error)
        }
        const args = searchWikidataSchema.parse(parsed.data)
        const result = await searchWikidata(args.query, args.language ?? 'en', args.limit ?? 5)
        return toolResult(
          'error' in result ? { ok: false, error: result.error } : { ok: true, hits: result },
        )
      }

      case TOOL_GET_WIKIDATA_ENTITY: {
        const parsed = parseToolArgs(tool.name, tool.input)
        if (!parsed.ok) {
          return failTool(tool.name, parsed.error)
        }
        const args = getWikidataEntitySchema.parse(parsed.data)
        const result = await getWikidataEntity(args.entityId, args.language ?? 'en')
        return toolResult(
          'error' in result ? { ok: false, error: result.error } : { ok: true, entity: result },
        )
      }

      case TOOL_FETCH_WIKIPEDIA_ARTICLE: {
        const parsed = parseToolArgs(tool.name, tool.input)
        if (!parsed.ok) {
          return failTool(tool.name, parsed.error)
        }
        const args = fetchWikipediaArticleSchema.parse(parsed.data)
        if (!args.url && !args.title) {
          const message = 'Provide url or title for Wikipedia lookup.'
          return failTool(tool.name, message)
        }
        const result = await fetchWikipediaArticle({
          url: args.url,
          title: args.title,
          locale: args.locale,
        })
        return toolResult(
          'error' in result ? { ok: false, error: result.error } : { ok: true, article: result },
        )
      }

      case TOOL_SEARCH_GETTY_TGN: {
        const parsed = parseToolArgs(tool.name, tool.input)
        if (!parsed.ok) {
          return failTool(tool.name, parsed.error)
        }
        const args = searchGettyTgnSchema.parse(parsed.data)
        const result = await searchGettyTgn(args.placeName, args.limit ?? 5)
        return toolResult(
          'error' in result ? { ok: false, error: result.error } : { ok: true, hits: result },
        )
      }

      case TOOL_GET_MEDIA_UPLOAD_STATUS: {
        if (session.sessionType !== 'artwork-cataloguing') {
          return toolResult({
            ok: false,
            error: 'Media upload status is only for artwork-cataloguing sessions.',
          })
        }
        const timeline = Array.isArray(session.fieldUpdateTimeline)
          ? (session.fieldUpdateTimeline as Array<{ targetCollection?: string; field?: string; value?: unknown }>)
          : []
        const hasPrimary = timeline.some((e) => e.field === 'primaryImage')
        const seriesSlug = timeline.find((e) => e.field === 'seriesSlug')?.value
        const isAch =
          seriesSlug === 'a-colorful-history' ||
          timeline.some((e) => String(e.field ?? '').startsWith('ach.'))
        const states = resolveMediaSlotStates({
          timeline: timeline as never,
          stagedMedia: session.stagedMedia,
          hasPrimary,
          highlightedMediaSlot: session.highlightedMediaSlot,
          isAchWork: isAch,
        })
        return toolResult({
          ok: true,
          slots: formatMediaStatusForAgent(states),
          highlightedMediaSlot: session.highlightedMediaSlot ?? null,
        })
      }

      default: {
        return failTool(tool.name, `Unknown tool: ${tool.name}`)
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Tool application failed'
    console.error('[art-official] tool failed:', tool.name, err)
    // Return to the model only — avoid chat-level "Something went wrong" for recoverable tool errors.
    return toolResult({ ok: false, error: message })
  }
}
