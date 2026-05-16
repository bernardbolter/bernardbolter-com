import type { MessageParam } from '@anthropic-ai/sdk/resources/messages/messages'

export type StoredMessage = {
  role: 'user' | 'assistant'
  content: string
  toolUses?: Array<{ name: string; input: unknown; id: string }>
  timestamp?: string
}

export function toAnthropicMessages(
  messages: StoredMessage[],
  latestUserText: string,
  imageMediaUrl?: string | null,
): MessageParam[] {
  const prior: MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }))

  if (imageMediaUrl) {
    prior.push({
      role: 'user',
      content: [
        { type: 'text', text: latestUserText },
        {
          type: 'image',
          source: { type: 'url', url: imageMediaUrl },
        },
      ],
    })
    return prior
  }

  prior.push({ role: 'user', content: latestUserText })
  return prior
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
