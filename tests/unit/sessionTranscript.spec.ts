import { describe, expect, it } from 'vitest'

import {
  SESSION_TRANSCRIPT_VISIBLE_COUNT,
  messagesForPublicTranscript,
  sessionTranscriptRoleLabel,
} from '@/lib/corpus/sessionTranscript'

describe('sessionTranscript', () => {
  it('skips empty-content messages only', () => {
    const messages = [
      { role: 'user', content: 'not a commisision, just a submission' },
      { role: 'assistant', content: '' },
      { role: 'user', content: '', kind: 'tool_results' },
      { role: 'assistant', content: 'Got it — continuing.' },
      { role: 'user', content: '   ' },
    ]

    expect(messagesForPublicTranscript(messages)).toEqual([
      { role: 'user', content: 'not a commisision, just a submission' },
      { role: 'assistant', content: 'Got it — continuing.' },
      { role: 'user', content: '   ' },
    ])
  })

  it('does not rewrite message text', () => {
    const [turn] = messagesForPublicTranscript([
      { role: 'user', content: 'not a commisision, just a submission' },
    ])
    expect(turn?.content).toBe('not a commisision, just a submission')
  })

  it('ignores non-array and malformed entries', () => {
    expect(messagesForPublicTranscript(null)).toEqual([])
    expect(messagesForPublicTranscript('x')).toEqual([])
    expect(
      messagesForPublicTranscript([
        null,
        { role: 'system', content: 'nope' },
        { role: 'user' },
        { role: 'assistant', content: 12 },
      ]),
    ).toEqual([])
  })

  it('maps roles to public labels', () => {
    expect(sessionTranscriptRoleLabel('user')).toBe('Artist')
    expect(sessionTranscriptRoleLabel('assistant')).toBe('Art/Official')
  })

  it('keeps a stable default visible count for progressive disclosure', () => {
    expect(SESSION_TRANSCRIPT_VISIBLE_COUNT).toBe(16)
  })
})
