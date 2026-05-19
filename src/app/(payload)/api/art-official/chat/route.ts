import { applyAgentTool } from '@/lib/artOfficial/applyAgentTool'
import { formatChatError } from '@/lib/artOfficial/formatChatError'
import { ART_OFFICIAL_MODEL, requireAnthropic } from '@/lib/artOfficial/anthropic'
import { ANTHROPIC_TOOL_SCHEMAS } from '@/lib/artOfficial/agentTools'
import { buildSystemPromptParts } from '@/lib/artOfficial/buildSystemPrompt'
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
import { getMediaSlot } from '@/lib/artOfficial/artworkMediaSlots'
import { runImageAnalysis } from '@/lib/artOfficial/runImageAnalysis'
import {
  stageArtworkMediaUpload,
  type MediaUploadPayload,
} from '@/lib/artOfficial/stageArtworkMedia'

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

    let systemParts
    try {
      systemParts = await buildSystemPromptParts({
        payload,
        user,
        sessionType: session.sessionType as SessionType,
        artistId,
        weakPhases: session.weakPhases,
        isRefinement,
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
    const tools = withToolCaching(ANTHROPIC_TOOL_SCHEMAS)

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
          if (mediaUpload && session.sessionType === 'artwork-cataloguing') {
            try {
              const staged = await stageArtworkMediaUpload({
                payload,
                user,
                session,
                upload: mediaUpload,
              })
              if (staged.timeline) {
                session.fieldUpdateTimeline = staged.timeline
              }
              session.stagedMedia = staged.stagedMedia
              send('media-staged', {
                slotId: mediaUpload.slotId,
                attachment: staged.attachment,
              })
              if (staged.stagedTimelineEntry) {
                send('tool-staged', {
                  name: 'update_field',
                  input: {
                    ...staged.stagedTimelineEntry,
                    confidence: 'confirmed',
                    source: 'conversation',
                  },
                })
              }

              const visionMediaId = mediaUpload.mediaId
              const slot = getMediaSlot(mediaUpload.slotId)
              if (visionMediaId != null && slot?.kind === 'image') {
                try {
                  const analysis = await runImageAnalysis({
                    mediaId: visionMediaId,
                    payload,
                    user,
                  })
                  send('image-analysis', { slotId: mediaUpload.slotId, ...analysis })
                } catch (analysisErr) {
                  console.error('[art-official/chat] image analysis', analysisErr)
                  send('error', {
                    message: formatChatError(analysisErr),
                    code: 'IMAGE_ANALYSIS',
                  })
                }
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
              imageMediaUrl = media.url ?? null
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

          for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
            const { assistantText, toolUses } = await runAnthropicTurn({
              anthropic,
              model: ART_OFFICIAL_MODEL,
              system,
              tools,
              messages: apiMessages,
              maxTokens: 1024,
              onToken: (text) => send('token', { text }),
            })

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
                send,
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

          await payload.update({
            collection: 'sessions',
            id: session.id,
            data: {
              messages: [...priorMessages, userTurn, ...newStored],
            },
            overrideAccess: false,
            user,
            context: { skipAgent: true },
          })

          send('done', {
            sessionId: session.sessionId,
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
