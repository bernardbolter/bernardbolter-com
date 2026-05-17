import { isSessionKickoffMessage } from './sessionKickoff'

import type {
  ContentBlockParam,
  MessageParam,
  ToolResultBlockParam,
  ToolUseBlockParam,
} from '@anthropic-ai/sdk/resources/messages/messages'

export type StoredToolResult = {
  tool_use_id: string
  content: string
}

export type StoredMessage = {
  role: 'user' | 'assistant'
  content: string
  /** Synthetic user row carrying tool_result blocks for Anthropic history replay. */
  kind?: 'human' | 'tool_results'
  toolUses?: Array<{ name: string; input: unknown; id: string }>
  toolResults?: StoredToolResult[]
  timestamp?: string
}

export function buildAnthropicMessageHistory(
  messages: StoredMessage[],
  latestUserText: string,
  imageMediaUrl?: string | null,
): MessageParam[] {
  const out: MessageParam[] = []

  for (const m of messages) {
    if (m.kind === 'tool_results' && m.toolResults?.length) {
      const blocks: ToolResultBlockParam[] = m.toolResults.map((tr) => ({
        type: 'tool_result',
        tool_use_id: tr.tool_use_id,
        content: tr.content,
      }))
      out.push({ role: 'user', content: blocks })
      continue
    }

    if (m.role === 'user') {
      if (m.content.trim()) {
        out.push({ role: 'user', content: m.content })
      }
      continue
    }

    const blocks: ContentBlockParam[] = []
    if (m.content.trim()) {
      blocks.push({ type: 'text', text: m.content })
    }
    if (m.toolUses?.length) {
      for (const tool of m.toolUses) {
        blocks.push({
          type: 'tool_use',
          id: tool.id,
          name: tool.name,
          input: tool.input as ToolUseBlockParam['input'],
        })
      }
    }
    if (blocks.length) {
      out.push({ role: 'assistant', content: blocks })
    }
  }

  if (imageMediaUrl) {
    out.push({
      role: 'user',
      content: [
        { type: 'text', text: latestUserText },
        {
          type: 'image',
          source: { type: 'url', url: imageMediaUrl },
        },
      ],
    })
  } else {
    out.push({ role: 'user', content: latestUserText })
  }

  return out
}

/** @deprecated Use buildAnthropicMessageHistory */
export function toAnthropicMessages(
  messages: StoredMessage[],
  latestUserText: string,
  imageMediaUrl?: string | null,
): MessageParam[] {
  return buildAnthropicMessageHistory(messages, latestUserText, imageMediaUrl)
}

/** Accumulate tool_use blocks from Anthropic streaming chunks. */
export function createToolUseAccumulator() {
  const byIndex = new Map<number, { id: string; name: string; inputJson: string }>()

  return {
    onBlockStart(
      index: number,
      block: { type: string; id?: string; name?: string },
    ) {
      if (block.type === 'tool_use' && block.id && block.name) {
        byIndex.set(index, { id: block.id, name: block.name, inputJson: '' })
      }
    },
    onInputDelta(index: number, partial: string) {
      const t = byIndex.get(index)
      if (t) t.inputJson += partial
    },
    finish(): Array<{ name: string; input: unknown; id: string }> {
      return [...byIndex.values()].map((t) => {
        let input: unknown = {}
        try {
          input = t.inputJson ? JSON.parse(t.inputJson) : {}
        } catch {
          input = {}
        }
        return { id: t.id, name: t.name, input }
      })
    },
  }
}

/** Messages shown in the chat UI (excludes internal tool_result rows). */
export function messagesForDisplay(messages: StoredMessage[]): Array<{
  role: 'user' | 'assistant'
  content: string
}> {
  return messages
    .filter((m) => {
      if (m.kind === 'tool_results' || !m.content.trim()) return false
      if (m.role === 'user' && isSessionKickoffMessage(m.content)) return false
      return true
    })
    .map((m) => ({ role: m.role, content: m.content }))
}
