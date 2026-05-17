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
