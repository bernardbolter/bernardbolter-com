import type { Payload } from 'payload'

import type { Session, User } from '@/payload-types'

import {
  assessFormalContributionSchema,
  fetchWikipediaArticleSchema,
  flagWeakPhaseSchema,
  setPhaseSchema,
  generateConfirmationDraftSchema,
  getWikidataEntitySchema,
  listLegacyRecordsSchema,
  linkMediaToSlotSchema,
  lookupCommonsFileSchema,
  lookupLegacyRecordSchema,
  parseToolArgs,
  placeInSequenceSchema,
  searchGettyTgnSchema,
  searchWikidataSchema,
  setDateAnchorSchema,
  storeSessionFieldSchema,
  TOOL_ASSESS_FORMAL_CONTRIBUTION,
  TOOL_FETCH_WIKIPEDIA_ARTICLE,
  TOOL_FLAG_WEAK_PHASE,
  TOOL_SET_PHASE,
  TOOL_GENERATE_CONFIRMATION_DRAFT,
  TOOL_GET_MEDIA_UPLOAD_STATUS,
  TOOL_GET_WIKIDATA_ENTITY,
  TOOL_LINK_MEDIA_TO_SLOT,
  TOOL_LIST_LEGACY_RECORDS,
  TOOL_LOOKUP_COMMONS_FILE,
  TOOL_LOOKUP_LEGACY_RECORD,
  TOOL_PLACE_IN_SEQUENCE,
  TOOL_PROPOSE_AUTHORITY_FIELD,
  TOOL_CONFIRM_AUTHORITY_PROPOSAL,
  TOOL_TRANSITION_TO_REASONING_PHASE,
  TOOL_SEARCH_GETTY_TGN,
  TOOL_SEARCH_WIKIDATA,
  TOOL_SET_DATE_ANCHOR,
  TOOL_STORE_SESSION_FIELD,
  TOOL_TRIGGER_IMAGE_ANALYSIS,
  TOOL_UPDATE_FIELD,
  confirmAuthorityProposalSchema,
  proposeAuthorityFieldSchema,
  transitionToReasoningPhaseSchema,
  triggerImageAnalysisSchema,
  updateFieldSchema,
} from './agentTools'
import { applyStagedMediaUpload } from './applyStagedMediaUpload'
import { getMediaSlot } from './artworkMediaSlots'
import { computeMidpointSortIndex } from './computeTimelineDates'
import {
  fetchCommonsFileMetadata,
  fetchWikipediaArticle,
  getWikidataEntity,
  searchGettyTgn,
  searchWikidata,
} from './externalLookups'
import { isFieldAllowedForAgent } from './fieldAllowlist'
import { assertArtworkSeriesSlugExists } from './seriesSlugs'
import { seriesMediaFlagsFromTimeline } from './seriesMediaFlags'
import {
  formatMediaStatusForAgent,
  resolveMediaSlotStates,
} from './stagedMedia'
import { runImageAnalysis } from './runImageAnalysis'
import { listLegacyRecords, lookupLegacyRecord } from './legacyLookup'
import { clampPreUploadStep } from './preUploadGuide'
import { upsertTimelineEntry } from './sessionTimeline'
import { normalizeEventDialoguePhase } from './eventDialoguePhase'
import {
  isEventPhaseAStagingField,
  normalizeEventPhaseAFieldName,
  normalizeEventPhaseAStagedValue,
} from './eventPhaseAStaging'
import {
  ensureEventPhaseBForFieldStaging,
  transitionEventSessionToPhaseB,
} from './transitionEventDialoguePhase'
import { estimateTimelineDateForWork } from './sequencing/estimateTimelineDate'
import { findArtworkBySlug, resolveTargetArtworkSlug } from './sequencing/resolveArtwork'

const BIOGRAPHY_ARTIST_FIELDS = new Set(['bioFull', 'bioMedium', 'bioShort'])
const STATEMENT_ARTIST_FIELDS = new Set([
  'statementFull',
  'statementMedium',
  'statementShort',
])

type EventAuthorityProposal = {
  fieldName: string
  value: string
  sourceUrl: string
  confidence: 'high' | 'medium' | 'low'
}

function readEventAuthorityProposals(session: Session): EventAuthorityProposal[] {
  const raw = session.eventAuthorityProposals
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (entry): entry is EventAuthorityProposal =>
      Boolean(
        entry &&
          typeof entry === 'object' &&
          typeof (entry as EventAuthorityProposal).fieldName === 'string' &&
          typeof (entry as EventAuthorityProposal).value === 'string',
      ),
  )
}

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
        if (
          session.sessionType === 'episode-storyboard' ||
          session.sessionType === 'episode-assembly'
        ) {
          if (args.targetCollection !== 'episodes') {
            const message =
              'Episode sessions must use update_field with targetCollection "episodes" only.'
            return failTool(tool.name, message)
          }
        }
        if (session.sessionType === 'sequencing') {
          const message =
            'Sequencing sessions use place_in_sequence and set_date_anchor — not update_field.'
          return failTool(tool.name, message)
        }
        if (session.sessionType === 'event-enrichment') {
          const phaseBError = await ensureEventPhaseBForFieldStaging({
            payload,
            user,
            session,
            send,
            reason: 'Staging reflective event fields',
            targetCollection: args.targetCollection,
            field: args.field,
          })
          if (phaseBError) {
            return failTool(tool.name, phaseBError)
          }

          const phase = normalizeEventDialoguePhase(session.eventDialoguePhase)
          if (phase === 'phase-a-research') {
            if (args.targetCollection !== 'events') {
              return failTool(
                tool.name,
                'Phase A only stages targetCollection "events". Use update_field with factual fields like venueAddress, venueUrl, endDate, sameAs.',
              )
            }
            const field = normalizeEventPhaseAFieldName(args.field)
            if (!isEventPhaseAStagingField(field)) {
              return failTool(
                tool.name,
                `Field ${args.field} is not stageable in Phase A. Use: venueAddress, venueUrl, venueLatLng, venueCountry, endDate, sameAs, venueWikidataUri, etc.`,
              )
            }
            args.field = field
            try {
              if (typeof args.value === 'string') {
                args.value = normalizeEventPhaseAStagedValue(field, args.value)
              } else if (field === 'venueLatLng' && args.value && typeof args.value === 'object') {
                const lat = (args.value as { lat?: unknown }).lat
                const lng = (args.value as { lng?: unknown }).lng
                if (typeof lat !== 'number' || typeof lng !== 'number') {
                  throw new Error('venueLatLng must be { lat: number, lng: number }.')
                }
              } else if (field === 'sameAs' && typeof args.value === 'string') {
                args.value = normalizeEventPhaseAStagedValue(field, args.value)
              }
            } catch (err) {
              return failTool(tool.name, err instanceof Error ? err.message : String(err))
            }
          }
        }
        if (!isFieldAllowedForAgent(args.targetCollection, args.field)) {
          const message = `Field ${args.targetCollection}.${args.field} is not writable by the agent.`
          return failTool(tool.name, message)
        }
        if (args.targetCollection === 'artworks' && args.field === 'series') {
          try {
            await assertArtworkSeriesSlugExists({ payload, user }, args.value)
          } catch (err) {
            return failTool(tool.name, err instanceof Error ? err.message : String(err))
          }
        }
        let entrySource:
          | 'conversation'
          | 'image-analysis'
          | 'knowledge-base'
          | 'phase-a-haiku' = args.source
        if (session.sessionType === 'event-enrichment' && args.targetCollection === 'events') {
          const eventPhase = normalizeEventDialoguePhase(session.eventDialoguePhase)
          entrySource = eventPhase === 'phase-a-research' ? 'phase-a-haiku' : 'conversation'
        }
        const entry = {
          targetCollection: args.targetCollection,
          field: args.field,
          value: args.value,
          confidence: args.confidence,
          source: entrySource,
          timestamp: new Date().toISOString(),
        }
        const timeline = upsertTimelineEntry(
          Array.isArray(session.fieldUpdateTimeline)
            ? [...(session.fieldUpdateTimeline as Array<Record<string, unknown>>)]
            : [],
          entry,
        )
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
        if (args.field === 'preUploadStep') {
          const requested = Number(args.value)
          const current = clampPreUploadStep(session.preUploadStep ?? 1)
          if (requested < current) {
            return toolResult({
              ok: true,
              field: args.field,
              note: `preUploadStep stays at ${current} — do not repeat earlier questions.`,
            })
          }
        }
        const sessionData: Record<string, unknown> =
          args.field === 'preUploadStep'
            ? { preUploadStep: Number(args.value) }
            : { [args.field]: args.value }
        if (args.field === 'preUploadStep') {
          const requested = Number(args.value)
          const current = clampPreUploadStep(session.preUploadStep ?? 1)
          if (requested >= current) {
            session.preUploadStep = requested
          }
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
        if (session.sessionType === 'event-enrichment') {
          await transitionEventSessionToPhaseB({
            payload,
            user,
            session,
            send,
            reason: 'Generating event confirmation draft',
          })
        }
        const draftData: Record<string, unknown> = {
          agentDraftDescriptionShort: args.agentDraftDescriptionShort,
          agentDraftDescriptionLong: args.agentDraftDescriptionLong,
          agentDraftConceptualKeywords: args.agentDraftConceptualKeywords.map((keyword) => ({
            keyword,
          })),
        }
        if (session.sessionType !== 'event-enrichment') {
          draftData.agentDraftFormalContributionAssessment =
            args.agentDraftFormalContributionAssessment
        }
        await payload.update({
          collection: 'sessions',
          id: session.id,
          data: draftData,
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

      case TOOL_SET_PHASE: {
        const parsed = parseToolArgs(tool.name, tool.input)
        if (!parsed.ok) {
          return failTool(tool.name, parsed.error)
        }
        const args = setPhaseSchema.parse(parsed.data)
        await payload.update({
          collection: 'sessions',
          id: session.id,
          data: { currentPhase: args.phase },
          overrideAccess: false,
          user,
          context: { skipAgent: true },
        })
        session.currentPhase = args.phase
        send('phase-transition', { phase: args.phase })
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
        const { isAchWork, isDcsWork, isMegacitiesWork } = seriesMediaFlagsFromTimeline(
          timeline as never,
        )
        const states = resolveMediaSlotStates({
          timeline: timeline as never,
          stagedMedia: session.stagedMedia,
          hasPrimary,
          highlightedMediaSlot: session.highlightedMediaSlot,
          isAchWork,
          isDcsWork,
          isMegacitiesWork,
        })
        return toolResult({
          ok: true,
          slots: formatMediaStatusForAgent(states),
          highlightedMediaSlot: session.highlightedMediaSlot ?? null,
        })
      }

      case TOOL_LOOKUP_LEGACY_RECORD: {
        if (session.sessionType !== 'artwork-cataloguing') {
          return toolResult({
            ok: false,
            error: 'Legacy lookup is only for artwork-cataloguing sessions.',
          })
        }
        const parsed = parseToolArgs(tool.name, tool.input)
        if (!parsed.ok) {
          return failTool(tool.name, parsed.error)
        }
        const args = lookupLegacyRecordSchema.parse(parsed.data)
        const result = lookupLegacyRecord({
          query: args.query,
          series: args.series,
        })

        if (result.status === 'no-dump') {
          return toolResult({
            ok: false,
            error:
              'Legacy dump not found. Run: npx tsx src/scripts/export-wp-legacy-artworks.ts',
          })
        }

        if (args.storeOnSession && result.status === 'match') {
          await payload.update({
            collection: 'sessions',
            id: session.id,
            data: { legacyRecordId: result.record.legacyRecordId },
            overrideAccess: false,
            user,
            context: { skipAgent: true },
          })
        }

        if (result.status === 'match') {
          return toolResult({
            ok: true,
            status: result.status,
            record: result.record,
            candidates: result.candidates,
            storedLegacyRecordId: args.storeOnSession
              ? result.record.legacyRecordId
              : undefined,
          })
        }

        return toolResult({
          ok: true,
          status: result.status,
          candidates: result.candidates,
        })
      }

      case TOOL_LIST_LEGACY_RECORDS: {
        if (session.sessionType !== 'artwork-cataloguing') {
          return toolResult({
            ok: false,
            error: 'Legacy lookup is only for artwork-cataloguing sessions.',
          })
        }
        const parsed = parseToolArgs(tool.name, tool.input)
        if (!parsed.ok) {
          return failTool(tool.name, parsed.error)
        }
        const args = listLegacyRecordsSchema.parse(parsed.data)
        const records = listLegacyRecords({ series: args.series })
        if (records.length === 0) {
          return toolResult({
            ok: false,
            error:
              'No legacy records in dump. Run: npx tsx src/scripts/export-wp-legacy-artworks.ts',
          })
        }
        return toolResult({ ok: true, records })
      }

      case TOOL_PLACE_IN_SEQUENCE: {
        if (session.sessionType !== 'sequencing') {
          return toolResult({
            ok: false,
            error: 'place_in_sequence is only for sequencing sessions.',
          })
        }
        const parsed = parseToolArgs(tool.name, tool.input)
        if (!parsed.ok) {
          return failTool(tool.name, parsed.error)
        }
        const args = placeInSequenceSchema.parse(parsed.data)
        if (!args.beforeSlug && !args.afterSlug) {
          return failTool(tool.name, 'Provide beforeSlug and/or afterSlug.')
        }

        const slug = await resolveTargetArtworkSlug(
          payload,
          user,
          session,
          args.artworkSlug,
        )
        if (!slug) {
          return failTool(
            tool.name,
            'Target artwork not found — pass artworkSlug or link artworkRecord on the session.',
          )
        }

        const target = await findArtworkBySlug(payload, slug, user)
        if (!target) {
          return failTool(tool.name, `Artwork not found: ${slug}`)
        }

        let lower: number | null = null
        let upper: number | null = null

        if (args.afterSlug) {
          const after = await findArtworkBySlug(payload, args.afterSlug, user)
          if (!after || after.sortIndex == null) {
            return failTool(tool.name, `afterSlug not found or missing sortIndex: ${args.afterSlug}`)
          }
          lower = after.sortIndex
        }
        if (args.beforeSlug) {
          const before = await findArtworkBySlug(payload, args.beforeSlug, user)
          if (!before || before.sortIndex == null) {
            return failTool(
              tool.name,
              `beforeSlug not found or missing sortIndex: ${args.beforeSlug}`,
            )
          }
          upper = before.sortIndex
        }

        const sortIndex = computeMidpointSortIndex(lower, upper)
        const entry = {
          targetCollection: 'artworks',
          field: 'sortIndex',
          value: sortIndex,
          confidence: 'confirmed' as const,
          source: 'conversation' as const,
          artworkSlug: slug,
          timestamp: new Date().toISOString(),
        }
        const timeline = upsertTimelineEntry(
          Array.isArray(session.fieldUpdateTimeline)
            ? [...(session.fieldUpdateTimeline as Array<Record<string, unknown>>)]
            : [],
          entry,
        )
        session.fieldUpdateTimeline = timeline
        await payload.update({
          collection: 'sessions',
          id: session.id,
          data: { fieldUpdateTimeline: timeline },
          overrideAccess: false,
          user,
          context: { skipAgent: true },
        })

        const seriesId =
          typeof session.sequencingSeries === 'object' && session.sequencingSeries
            ? session.sequencingSeries.id
            : typeof session.sequencingSeries === 'number'
              ? session.sequencingSeries
              : null

        const estimatedTimelineDate = await estimateTimelineDateForWork(payload, user, {
          artworkId: target.id,
          proposedSortIndex: sortIndex,
          seriesId,
        })

        send('tool-staged', { name: tool.name, input: args })
        return toolResult({
          ok: true,
          staged: true,
          artworkSlug: slug,
          sortIndex,
          estimatedTimelineDate,
        })
      }

      case TOOL_SET_DATE_ANCHOR: {
        if (session.sessionType !== 'sequencing') {
          return toolResult({
            ok: false,
            error: 'set_date_anchor is only for sequencing sessions.',
          })
        }
        const parsed = parseToolArgs(tool.name, tool.input)
        if (!parsed.ok) {
          return failTool(tool.name, parsed.error)
        }
        const args = setDateAnchorSchema.parse(parsed.data)

        const slug = await resolveTargetArtworkSlug(
          payload,
          user,
          session,
          args.artworkSlug,
        )
        if (!slug) {
          return failTool(
            tool.name,
            'Target artwork not found — pass artworkSlug or link artworkRecord on the session.',
          )
        }

        const target = await findArtworkBySlug(payload, slug, user)
        if (!target) {
          return failTool(tool.name, `Artwork not found: ${slug}`)
        }

        const timeline = Array.isArray(session.fieldUpdateTimeline)
          ? [...(session.fieldUpdateTimeline as Array<Record<string, unknown>>)]
          : []
        const timestamp = new Date().toISOString()
        let nextTimeline = timeline
        nextTimeline = upsertTimelineEntry(nextTimeline, {
          targetCollection: 'artworks',
          field: 'dateKnown',
          value: args.date,
          confidence: 'confirmed',
          source: 'conversation',
          artworkSlug: slug,
          timestamp,
        })
        nextTimeline = upsertTimelineEntry(nextTimeline, {
          targetCollection: 'artworks',
          field: 'datePrecision',
          value: args.precision,
          confidence: 'confirmed',
          source: 'conversation',
          artworkSlug: slug,
          timestamp,
        })
        session.fieldUpdateTimeline = nextTimeline
        await payload.update({
          collection: 'sessions',
          id: session.id,
          data: { fieldUpdateTimeline: nextTimeline },
          overrideAccess: false,
          user,
          context: { skipAgent: true },
        })

        send('tool-staged', { name: tool.name, input: args })
        return toolResult({
          ok: true,
          staged: true,
          artworkSlug: slug,
          dateKnown: args.date,
          datePrecision: args.precision,
        })
      }

      case TOOL_LINK_MEDIA_TO_SLOT: {
        if (session.sessionType !== 'artwork-cataloguing') {
          return toolResult({
            ok: false,
            error: 'link_media_to_slot is only for artwork-cataloguing sessions.',
          })
        }
        const parsed = parseToolArgs(tool.name, tool.input)
        if (!parsed.ok) {
          return failTool(tool.name, parsed.error)
        }
        const args = linkMediaToSlotSchema.parse(parsed.data)
        const slot = getMediaSlot(args.slotId)
        if (!slot) {
          return failTool(tool.name, `Unknown media slot: ${args.slotId}`)
        }
        if (slot.kind !== 'image' && slot.kind !== 'video-file') {
          return failTool(
            tool.name,
            `Slot ${args.slotId} expects a file upload or URL — use the Media panel for links.`,
          )
        }

        try {
          await payload.findByID({
            collection: 'media',
            id: args.mediaId,
            depth: 0,
            overrideAccess: false,
            user,
          })
        } catch {
          return failTool(tool.name, `Media #${args.mediaId} not found.`)
        }

        try {
          const result = await applyStagedMediaUpload({
            payload,
            user,
            session,
            upload: { slotId: args.slotId, mediaId: args.mediaId },
            send,
          })
          send('tool-staged', { name: tool.name, input: args })
          return toolResult({
            ok: true,
            linked: true,
            slotId: args.slotId,
            mediaId: args.mediaId,
            field: slot.field,
            hasAnalysis: Boolean(result.analysis),
          })
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Could not link media to slot'
          return failTool(tool.name, message)
        }
      }

      case TOOL_PROPOSE_AUTHORITY_FIELD: {
        const parsed = parseToolArgs(tool.name, tool.input)
        if (!parsed.ok) return failTool(tool.name, parsed.error)
        if (session.sessionType !== 'event-enrichment') {
          return failTool(tool.name, 'propose_authority_field is for event-enrichment Phase A only.')
        }
        const args = proposeAuthorityFieldSchema.parse(parsed.data)
        const fieldName = normalizeEventPhaseAFieldName(args.fieldName)
        if (!isEventPhaseAStagingField(fieldName)) {
          return failTool(
            tool.name,
            `Field ${args.fieldName} cannot be staged in Phase A. Use an allowed events field (venueAddress, venueUrl, venueLatLng, endDate, sameAs, etc.).`,
          )
        }
        const proposals = readEventAuthorityProposals(session).filter(
          (p) => p.fieldName !== fieldName,
        )
        proposals.push({
          fieldName,
          value: args.value,
          sourceUrl: args.sourceUrl,
          confidence: args.confidence,
        })
        session.eventAuthorityProposals = proposals
        await payload.update({
          collection: 'sessions',
          id: session.id,
          data: { eventAuthorityProposals: proposals },
          overrideAccess: false,
          user,
          context: { skipAgent: true },
        })
        send('tool-staged', { name: tool.name, input: { ...args, fieldName } })
        return toolResult({ ok: true, proposed: true, fieldName })
      }

      case TOOL_CONFIRM_AUTHORITY_PROPOSAL: {
        const parsed = parseToolArgs(tool.name, tool.input)
        if (!parsed.ok) return failTool(tool.name, parsed.error)
        if (session.sessionType !== 'event-enrichment') {
          return failTool(tool.name, 'confirm_authority_proposal is for event-enrichment Phase A only.')
        }
        const args = confirmAuthorityProposalSchema.parse(parsed.data)
        const fieldName = normalizeEventPhaseAFieldName(args.fieldName)
        if (!isEventPhaseAStagingField(fieldName)) {
          return failTool(tool.name, `Field ${args.fieldName} cannot be staged in Phase A.`)
        }

        const proposals = readEventAuthorityProposals(session)
        const match = proposals.find((p) => p.fieldName === fieldName)
        const rawValue = match?.value ?? args.value
        if (!rawValue) {
          return failTool(
            tool.name,
            `No pending proposal for ${fieldName}. Call propose_authority_field first, or pass value and sourceUrl with confirm.`,
          )
        }

        let value: unknown
        try {
          value = normalizeEventPhaseAStagedValue(fieldName, rawValue)
        } catch (err) {
          return failTool(tool.name, err instanceof Error ? err.message : String(err))
        }

        const entry = {
          targetCollection: 'events',
          field: fieldName,
          value,
          confidence: 'confirmed' as const,
          source: 'phase-a-haiku' as const,
          timestamp: new Date().toISOString(),
        }
        const timeline = upsertTimelineEntry(
          Array.isArray(session.fieldUpdateTimeline)
            ? [...(session.fieldUpdateTimeline as Array<Record<string, unknown>>)]
            : [],
          entry,
        )
        session.fieldUpdateTimeline = timeline
        const remaining = proposals.filter((p) => p.fieldName !== fieldName)
        session.eventAuthorityProposals = remaining
        await payload.update({
          collection: 'sessions',
          id: session.id,
          data: {
            fieldUpdateTimeline: timeline,
            eventAuthorityProposals: remaining,
          },
          overrideAccess: false,
          user,
          context: { skipAgent: true },
        })
        send('tool-staged', {
          name: tool.name,
          input: {
            fieldName,
            targetCollection: 'events',
            field: fieldName,
            value,
            confidence: 'confirmed',
            source: 'phase-a-haiku',
          },
        })
        return toolResult({ ok: true, confirmed: true, fieldName })
      }

      case TOOL_TRANSITION_TO_REASONING_PHASE: {
        const parsed = parseToolArgs(tool.name, tool.input)
        if (!parsed.ok) return failTool(tool.name, parsed.error)
        if (session.sessionType !== 'event-enrichment') {
          return failTool(tool.name, 'transition_to_reasoning_phase is for event-enrichment only.')
        }
        transitionToReasoningPhaseSchema.parse(parsed.data)
        const remaining = readEventAuthorityProposals(session)
        if (remaining.length > 0) {
          return failTool(
            tool.name,
            `Still ${remaining.length} pending authority proposal(s) — confirm or reject each first.`,
          )
        }
        session.eventDialoguePhase = 'phase-b-reasoning'
        await payload.update({
          collection: 'sessions',
          id: session.id,
          data: { eventDialoguePhase: 'phase-b-reasoning' },
          overrideAccess: false,
          user,
          context: { skipAgent: true },
        })
        send('phase-transition', { phase: 'phase-b-reasoning', reason: 'Phase A complete' })
        return toolResult({ ok: true, phase: 'phase-b-reasoning' })
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
