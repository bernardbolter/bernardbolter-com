import { describe, expect, it } from 'vitest'

import {
  buildAnthropicMessageHistory,
  messagesForDisplay,
  type StoredMessage,
} from '@/lib/artOfficial/chatMessages'

describe('chatMessages', () => {
  it('replays assistant tool_use and tool_result rows for Anthropic', () => {
    const stored: StoredMessage[] = [
      { role: 'user', content: 'Hello', kind: 'human' },
      {
        role: 'assistant',
        content: '',
        toolUses: [{ id: 'tu_1', name: 'update_field', input: { field: 'x' } }],
      },
      {
        role: 'user',
        content: '',
        kind: 'tool_results',
        toolResults: [{ tool_use_id: 'tu_1', content: '{"ok":true}' }],
      },
      { role: 'assistant', content: 'Thanks, continuing.' },
    ]

    const api = buildAnthropicMessageHistory(stored, 'Next question')
    expect(api).toHaveLength(5)
    expect(api[0]).toMatchObject({ role: 'user', content: 'Hello' })
    expect(api[1].role).toBe('assistant')
    expect(api[2].role).toBe('user')
    expect(api[3]).toMatchObject({ role: 'assistant' })
    expect(api[4]).toMatchObject({ role: 'user', content: 'Next question' })
  })

  it('repairs orphaned tool_use when tool_results were stripped from history', () => {
    const stored: StoredMessage[] = [
      { role: 'user', content: 'Map the freestyle', kind: 'human' },
      {
        role: 'assistant',
        content: 'Updating assembly…',
        toolUses: [{ id: 'toolu_orphan', name: 'update_field', input: { field: 'assembly' } }],
      },
      // Missing tool_results row — previously caused Anthropic 400.
      { role: 'assistant', content: 'Done.' },
    ]

    const api = buildAnthropicMessageHistory(stored, 'Continue')
    expect(api).toHaveLength(5)
    expect(api[1].role).toBe('assistant')
    expect(api[2].role).toBe('user')
    const toolResultBlocks = api[2]?.content
    expect(Array.isArray(toolResultBlocks)).toBe(true)
    expect(toolResultBlocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'tool_result',
          tool_use_id: 'toolu_orphan',
        }),
      ]),
    )
    expect(api[3].role).toBe('assistant')
    expect(api[3].content).toEqual([{ type: 'text', text: 'Done.' }])
    expect(api[4]).toMatchObject({ role: 'user', content: 'Continue' })
  })

  it('messagesForDisplay hides tool_result rows', () => {
    const stored: StoredMessage[] = [
      { role: 'user', content: 'Hi', kind: 'human' },
      { role: 'user', content: '', kind: 'tool_results', toolResults: [] },
      { role: 'assistant', content: 'Reply' },
    ]
    expect(messagesForDisplay(stored)).toEqual([
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Reply' },
    ])
  })
})
