import { applyAgentTool } from '@/lib/artOfficial/applyAgentTool'
import { formatChatError } from '@/lib/artOfficial/formatChatError'
import { requireAnthropic } from '@/lib/artOfficial/anthropic'
import { ANTHROPIC_TOOL_SCHEMAS, resolveToolsForSession } from '@/lib/artOfficial/agentTools'
import { buildSystemPromptParts } from '@/lib/artOfficial/buildSystemPrompt'
import {
  nextPreUploadStepAfterAnswer,
  sessionHasPrimaryImage,
} from '@/lib/artOfficial/preUploadGuide'
import { resolveAutoPhase } from '@/lib/artOfficial/phaseAutoAdvance'
import { isSessionKickoffMessage } from '@/lib/artOfficial/sessionKickoff'
import {
  buildAnthropicMessageHistory,
  type StoredMessage,
} from '@/lib/artOfficial/chatMessages'
import {
  buildAnthropicSystemBlocks,
  isPromptCacheEnabled,
  withToolCaching,
} from '@/lib/artOfficial/promptCache'
import { checkRateLimit } from '@/lib/artOfficial/rateLimit'
import { requireStaff } from '@/lib/artOfficial/requireStaff'
import type { SessionType } from '@/lib/artOfficial/routing'
import {
  buildAssistantToolBlocks,
  buildToolResultBlocks,
  runAnthropicTurn,
} from '@/lib/artOfficial/runAnthropicTurn'
import { applyStagedMediaUpload } from '@/lib/artOfficial/applyStagedMediaUpload'
import {
  defaultSessionPhase,
  normalizeSessionPhase,
  resolveModel,
  type SessionPhase,
} from '@/lib/artOfficial/sessionPhase'
import {
  defaultEventDialoguePhase,
  normalizeEventDialoguePhase,
  type EventDialoguePhase,
} from '@/lib/artOfficial/eventDialoguePhase'
import type { MediaUploadPayload } from '@/lib/artOfficial/stageArtworkMedia'
import {
  aggregateUsage,
  appendTokenLog,
  type TokenLogEntry,
} from '@/lib/artOfficial/tokenLog'

const MAX_TOOL_ROUNDS = 5

function jsonError(
  message: string,
  status: number,
  code?: string,
): Response {
  return Response.json({ error: message, code }, { status })
}

export async function POST(request: Request) {
  try {
    const { ok, payload, user } = await requireStaff()
    if (!ok || !user) {
      return jsonError(
        'You are not signed in to the admin. Log in again, then reopen this session.',
        401,
        'UNAUTHORIZED',
      )
    }

    if (!checkRateLimit(user.id).ok) {
      return jsonError(
        'Too many messages in a short time. Wait a minute and try again.',
        429,
        'RATE_LIMIT',
      )
    }

    let body: {
      sessionId?: string
      userMessage?: string
      imageMediaId?: number
      mediaUpload?: MediaUploadPayload
      currentPhase?: SessionPhase
    }
    try {
      body = await request.json()
    } catch {
      return jsonError('Invalid JSON in request body.', 400)
    }

    const { sessionId, userMessage, imageMediaId, mediaUpload: mediaUploadBody } = body
    const mediaUpload: MediaUploadPayload | undefined =
      mediaUploadBody ??
      (imageMediaId != null ? { slotId: 'primary', mediaId: imageMediaId } : undefined)
    if (!sessionId || !userMessage?.trim()) {
      return jsonError('sessionId and userMessage are required.', 400)
    }

    const sessionRes = await payload.find({
      collection: 'sessions',
      where: { sessionId: { equals: sessionId } },
      limit: 1,
      depth: 1,
      overrideAccess: false,
      user,
    })

    const session = sessionRes.docs[0]
    if (!session) {
      return jsonError('Session not found. Open it again from Art/Official home.', 404)
    }

    const artistId =
      typeof session.artistId === 'object'
        ? (session.artistId?.id as number | undefined)
        : (session.artistId as number | undefined)

    if (!artistId) {
      return jsonError(
        'This session is not linked to an Artist record. Create an Artist in the CMS, then start a new session.',
        412,
        'NO_ARTIST',
      )
    }

    const isRefinement =
      session.status === 'completed' && Boolean(session.dialogueRefinementFlag)

    const hasFirstImpression = Boolean(session.firstImpression?.trim())
    const hasPrimaryImage = sessionHasPrimaryImage(session)
    const isKickoff = isSessionKickoffMessage(userMessage.trim())

    const advancedStep = nextPreUploadStepAfterAnswer({
      sessionType: session.sessionType,
      preUploadStep: session.preUploadStep,
      hasFirstImpression,
      hasPrimaryImage,
      userMessage: userMessage.trim(),
      isKickoffMessage: isKickoff,
    })

    if (advancedStep != null) {
      await payload.update({
        collection: 'sessions',
        id: session.id,
        data: { preUploadStep: advancedStep },
        overrideAccess: false,
        user,
        context: { skipAgent: true },
      })
      session.preUploadStep = advancedStep
    }

    const episodeId =
      typeof session.episodeRecord === 'object'
        ? (session.episodeRecord?.id as number | undefined)
        : (session.episodeRecord as number | undefined)

    const artworkRecordId =
      typeof session.artworkRecord === 'object'
        ? (session.artworkRecord?.id as number | undefined)
        : (session.artworkRecord as number | undefined)

    const eventRecordId =
      typeof session.eventRecord === 'object'
        ? (session.eventRecord?.id as number | undefined)
        : (session.eventRecord as number | undefined)

    const sessionType = session.sessionType as string
    const primaryUploadThisTurn = Boolean(
      mediaUpload?.mediaId != null &&
        (mediaUpload.slotId === 'primary' || imageMediaId != null),
    )
    const effectiveHasPrimaryImage = hasPrimaryImage || primaryUploadThisTurn

    const defaultPhase = defaultSessionPhase(sessionType, Boolean(artworkRecordId))
    let currentPhase = normalizeSessionPhase(
      body.currentPhase ?? session.currentPhase,
      defaultPhase,
    )
    let eventDialoguePhase: EventDialoguePhase =
      sessionType === 'event-enrichment'
        ? normalizeEventDialoguePhase(session.eventDialoguePhase)
        : defaultEventDialoguePhase()

    const autoPhase = resolveAutoPhase({
      sessionType,
      currentPhase,
      hasPrimaryImage: effectiveHasPrimaryImage,
      primaryUploadThisTurn,
      tokenLog: session.tokenLog,
      fieldUpdateTimeline: session.fieldUpdateTimeline,
    })

    let autoPhaseTransition: SessionPhase | undefined
    if (autoPhase.transitioned && autoPhase.phase !== currentPhase) {
      currentPhase = autoPhase.phase
      autoPhaseTransition = currentPhase
    }

    if (currentPhase !== session.currentPhase) {
      await payload.update({
        collection: 'sessions',
        id: session.id,
        data: { currentPhase },
        overrideAccess: false,
        user,
        context: { skipAgent: true },
      })
      session.currentPhase = currentPhase
    }

    const model = resolveModel(currentPhase, sessionType, eventDialoguePhase)

    let systemParts
    try {
      systemParts = await buildSystemPromptParts({
        payload,
        user,
        sessionType: session.sessionType as SessionType,
        artistId,
        episodeId,
        artworkRecordId,
        eventRecordId,
        weakPhases: session.weakPhases,
        isLinchpin: session.linchpinFlag?.isLinchpin === true,
        linchpinNote: session.linchpinFlag?.note,
        isRefinement,
        preUpload: {
          preUploadStep: session.preUploadStep,
          hasFirstImpression,
          hasPrimaryImage: effectiveHasPrimaryImage,
        },
        currentPhase,
        eventDialoguePhase,
      })
    } catch (err) {
      console.error('[art-official/chat] buildSystemPromptParts', err)
      return jsonError(
        `Could not build the agent briefing: ${formatChatError(err)}`,
        500,
        'SERVER_ERROR',
      )
    }

    const system = buildAnthropicSystemBlocks(systemParts)
    const tools = withToolCaching(
      resolveToolsForSession(sessionType, eventDialoguePhase),
    )

    const priorMessages = (Array.isArray(session.messages)
      ? session.messages
      : []) as StoredMessage[]
    const userTurn: StoredMessage = {
      role: 'user',
      content: userMessage.trim(),
      kind: 'human',
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          )
        }

        try {
          if (advancedStep != null) {
            send('pre-upload-step', { preUploadStep: advancedStep })
          }

          if (autoPhaseTransition) {
            send('phase-transition', {
              phase: autoPhaseTransition,
              reason: autoPhase.reason,
              automatic: true,
            })
          }

          if (mediaUpload && session.sessionType === 'artwork-cataloguing') {
            try {
              const uploadResult = await applyStagedMediaUpload({
                payload,
                user,
                session,
                upload: mediaUpload,
                send,
              })
              const notices: string[] = []
              if (uploadResult.conflictQuestion) notices.push(uploadResult.conflictQuestion)
              if (uploadResult.descriptionMismatch) notices.push(uploadResult.descriptionMismatch)
              if (notices.length > 0) {
                userTurn.content = `${userTurn.content}\n\n[Session integrity]\n${notices.join('\n\n')}`
              }
            } catch (mediaErr) {
              console.error('[art-official/chat] media upload', mediaErr)
              send('error', {
                message: formatChatError(mediaErr),
                code: 'MEDIA_UPLOAD',
              })
            }
          }

          let imageMediaUrl: string | null = null
          const visionMediaId = mediaUpload?.mediaId ?? imageMediaId ?? null
          if (visionMediaId != null) {
            try {
              const media = await payload.findByID({
                collection: 'media',
                id: visionMediaId,
                depth: 0,
                overrideAccess: false,
                user,
              })
              const mimeType = media.mimeType?.toLowerCase() ?? ''
              imageMediaUrl =
                mimeType.startsWith('image/') && typeof media.url === 'string'
                  ? media.url
                  : null
            } catch {
              imageMediaUrl = null
            }
          }

          const anthropic = requireAnthropic()
          let apiMessages = buildAnthropicMessageHistory(
            priorMessages,
            userTurn.content,
            imageMediaUrl,
          )

          const newStored: StoredMessage[] = []
          let phaseTransition: SessionPhase | undefined
          const turnUsage: Omit<
            TokenLogEntry,
            'turn' | 'phase' | 'model' | 'timestamp'
          > = {
            inputTokens: 0,
            outputTokens: 0,
            cacheReadTokens: 0,
            cacheWriteTokens: 0,
          }

          for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
            const { assistantText, toolUses, usage } = await runAnthropicTurn({
              anthropic,
              model,
              system,
              tools,
              messages: apiMessages,
              maxTokens: 1024,
              onToken: (text) => send('token', { text }),
            })
            aggregateUsage(turnUsage, usage)

            if (!toolUses.length) {
              newStored.push({
                role: 'assistant',
                content: assistantText,
                timestamp: new Date().toISOString(),
              })
              break
            }

            newStored.push({
              role: 'assistant',
              content: assistantText,
              toolUses,
              timestamp: new Date().toISOString(),
            })

            const toolResults: Array<{ tool_use_id: string; content: string }> = []
            for (const tool of toolUses) {
              const content = await applyAgentTool({
                payload,
                user,
                session,
                tool,
                send: (event, data) => {
                  if (event === 'phase-transition' && data && typeof data === 'object') {
                    const phase = (data as { phase?: unknown }).phase
                    if (typeof phase === 'string') {
                      if (phase === 'phase-b-reasoning' || phase === 'phase-a-research') {
                        eventDialoguePhase = normalizeEventDialoguePhase(phase)
                      } else {
                        phaseTransition = normalizeSessionPhase(phase, currentPhase)
                        currentPhase = phaseTransition
                      }
                    }
                  }
                  send(event, data)
                },
              })
              toolResults.push({ tool_use_id: tool.id, content })
            }

            newStored.push({
              role: 'user',
              content: '',
              kind: 'tool_results',
              toolResults,
            })

            const assistantBlocks = buildAssistantToolBlocks(assistantText, toolUses)
            const toolResultBlocks = buildToolResultBlocks(
              toolUses,
              toolResults.map((tr) => tr.content),
            )

            apiMessages = [
              ...apiMessages,
              { role: 'assistant', content: assistantBlocks },
              { role: 'user', content: toolResultBlocks },
            ]
          }

          const lastAssistant = [...newStored]
            .reverse()
            .find((m) => m.role === 'assistant')
          if (
            lastAssistant &&
            !lastAssistant.content.trim() &&
            lastAssistant.toolUses?.length
          ) {
            const fallback =
              'I’ve noted that in the session. Continuing — what would you like to add next?'
            lastAssistant.content = fallback
            send('token', { text: fallback })
          }

          const tokenLog = appendTokenLog(session.tokenLog, {
            turn: priorMessages.length + 1,
            phase: currentPhase,
            model,
            ...turnUsage,
            timestamp: new Date().toISOString(),
          })

          const finalPhase = phaseTransition ?? currentPhase

          // Part 3d: omit empty-content tool_results turns from the persisted transcript
          const messagesToPersist = [userTurn, ...newStored].filter((msg) => {
            if (msg.kind === 'tool_results' && !msg.content?.trim()) return false
            return true
          })

          await payload.update({
            collection: 'sessions',
            id: session.id,
            data: {
              messages: [...priorMessages, ...messagesToPersist],
              tokenLog,
              currentPhase: finalPhase,
              ...(sessionType === 'event-enrichment' ? { eventDialoguePhase } : {}),
            },
            overrideAccess: false,
            user,
            context: { skipAgent: true },
          })

          send('done', {
            sessionId: session.sessionId,
            phaseTransition: phaseTransition ?? autoPhaseTransition,
            ...(sessionType === 'event-enrichment' ? { eventDialoguePhase } : {}),
            fieldUpdateTimeline: session.fieldUpdateTimeline ?? [],
            eventAuthorityProposals: session.eventAuthorityProposals ?? [],
            model,
            promptCache: isPromptCacheEnabled() ? {} : undefined,
          })
          controller.close()
        } catch (err) {
          console.error('[art-official/chat] stream', err)
          send('error', {
            message: formatChatError(err),
            code: 'STREAM_ERROR',
          })
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    console.error('[art-official/chat]', err)
    return jsonError(formatChatError(err), 500, 'SERVER_ERROR')
  }
}
