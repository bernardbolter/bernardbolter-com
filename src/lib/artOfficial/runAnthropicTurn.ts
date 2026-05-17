import type Anthropic from '@anthropic-ai/sdk'
import type {
  ContentBlockParam,
  MessageParam,
  TextBlockParam,
  Tool,
  ToolResultBlockParam,
  ToolUseBlockParam,
} from '@anthropic-ai/sdk/resources/messages/messages'

import { createToolUseAccumulator } from './chatMessages'

export type StreamedToolUse = { name: string; input: unknown; id: string }

export type AnthropicTurnResult = {
  assistantText: string
  toolUses: StreamedToolUse[]
}

export async function runAnthropicTurn({
  anthropic,
  model,
  system,
  tools,
  messages,
  maxTokens,
  onToken,
}: {
  anthropic: Anthropic
  model: string
  system: string | TextBlockParam[]
  tools: Tool[]
  messages: MessageParam[]
  maxTokens: number
  onToken?: (text: string) => void
}): Promise<AnthropicTurnResult> {
  const toolAcc = createToolUseAccumulator()
  let assistantText = ''

  const stream = anthropic.messages.stream({
    model,
    max_tokens: maxTokens,
    system,
    tools,
    messages,
  })

  for await (const chunk of stream) {
    if (
      chunk.type === 'content_block_delta' &&
      chunk.delta.type === 'text_delta'
    ) {
      assistantText += chunk.delta.text
      onToken?.(chunk.delta.text)
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

  await stream.finalMessage()

  return { assistantText, toolUses: toolAcc.finish() }
}

export function buildAssistantToolBlocks(
  assistantText: string,
  toolUses: StreamedToolUse[],
): ContentBlockParam[] {
  const blocks: ContentBlockParam[] = []
  if (assistantText.trim()) {
    blocks.push({ type: 'text', text: assistantText })
  }
  for (const tool of toolUses) {
    blocks.push({
      type: 'tool_use',
      id: tool.id,
      name: tool.name,
      input: tool.input as ToolUseBlockParam['input'],
    })
  }
  return blocks
}

export function buildToolResultBlocks(
  toolUses: StreamedToolUse[],
  results: string[],
): ToolResultBlockParam[] {
  return toolUses.map((tool, i) => ({
    type: 'tool_result',
    tool_use_id: tool.id,
    content: results[i] ?? JSON.stringify({ ok: false, error: 'Missing tool result' }),
  }))
}
