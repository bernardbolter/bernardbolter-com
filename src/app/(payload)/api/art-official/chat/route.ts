import { applyAgentTool } from '@/lib/artOfficial/applyAgentTool'
import { ART_OFFICIAL_MODEL, requireAnthropic } from '@/lib/artOfficial/anthropic'
import { ANTHROPIC_TOOL_SCHEMAS } from '@/lib/artOfficial/agentTools'
import { buildSystemPrompt } from '@/lib/artOfficial/buildSystemPrompt'
import {
  createToolUseAccumulator,
  toAnthropicMessages,
  type StoredMessage,
} from '@/lib/artOfficial/chatMessages'
import { checkRateLimit } from '@/lib/artOfficial/rateLimit'
import { requireStaff } from '@/lib/artOfficial/requireStaff'
import type { SessionType } from '@/lib/artOfficial/routing'

export async function POST(request: Request) {
  const { ok, payload, user } = await requireStaff()
  if (!ok || !user) {
    return new Response('Unauthorized', { status: 401 })
  }

  if (!checkRateLimit(user.id).ok) {
    return new Response('Too many requests', { status: 429 })
  }

  let body: { sessionId?: string; userMessage?: string; imageMediaId?: number }
  try {
    body = await request.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const { sessionId, userMessage, imageMediaId } = body
  if (!sessionId || !userMessage?.trim()) {
    return new Response('sessionId + userMessage required', { status: 400 })
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
    return new Response('Session not found', { status: 404 })
  }

  const artistId =
    typeof session.artistId === 'object'
      ? (session.artistId?.id as number)
      : (session.artistId as number)

  const isRefinement =
    session.status === 'completed' && Boolean(session.dialogueRefinementFlag)

  const systemPrompt = await buildSystemPrompt({
    payload,
    user,
    sessionType: session.sessionType as SessionType,
    artistId,
    weakPhases: session.weakPhases,
    isRefinement,
  })

  let imageMediaUrl: string | null = null
  if (imageMediaId) {
    try {
      const media = await payload.findByID({
        collection: 'media',
        id: imageMediaId,
        depth: 0,
        overrideAccess: false,
        user,
      })
      imageMediaUrl = media.url ?? null
    } catch {
      imageMediaUrl = null
    }
  }

  const priorMessages = (Array.isArray(session.messages)
    ? session.messages
    : []) as StoredMessage[]
  const userTurn: StoredMessage = { role: 'user', content: userMessage.trim() }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        )
      }

      try {
        const anthropic = requireAnthropic()
        const toolAcc = createToolUseAccumulator()
        let assistantText = ''

        const anthropicStream = anthropic.messages.stream({
          model: ART_OFFICIAL_MODEL,
          max_tokens: 1024,
          system: systemPrompt,
          tools: ANTHROPIC_TOOL_SCHEMAS,
          messages: toAnthropicMessages(
            priorMessages,
            userTurn.content,
            imageMediaUrl,
          ),
        })

        for await (const chunk of anthropicStream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            assistantText += chunk.delta.text
            send('token', { text: chunk.delta.text })
          }
          if (chunk.type === 'content_block_start') {
            toolAcc.onBlockStart(chunk.index, chunk.content_block)
          }
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'input_json_delta'
          ) {
            toolAcc.onInputDelta(chunk.index, chunk.delta.partial_json)
          }
        }

        const toolUses = toolAcc.finish()

        for (const tool of toolUses) {
          await applyAgentTool({ payload, user, session, tool, send })
        }

        const assistantMessage: StoredMessage = {
          role: 'assistant',
          content: assistantText,
          toolUses,
          timestamp: new Date().toISOString(),
        }

        await payload.update({
          collection: 'sessions',
          id: session.id,
          data: {
            messages: [...priorMessages, userTurn, assistantMessage],
          },
          overrideAccess: false,
          user,
          context: { skipAgent: true },
        })

        send('done', { sessionId: session.sessionId })
        controller.close()
      } catch (err) {
        send('error', { message: (err as Error).message })
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
}
