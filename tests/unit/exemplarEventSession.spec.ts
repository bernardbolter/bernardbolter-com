import { describe, expect, it } from 'vitest'

import { summarizeExemplarEventSessionForPrompt } from '@/lib/artOfficial/queryExemplarEventSession'
import type { Session } from '@/payload-types'

describe('summarizeExemplarEventSessionForPrompt', () => {
  it('skips gracefully when none exists', () => {
    expect(summarizeExemplarEventSessionForPrompt(null)).toContain('none yet')
  })

  it('summarizes an exemplar without inventing Q&A', () => {
    const session = {
      sessionId: 'pecha-kucha-amsterdam-vol-9-mediamatic-2009-event-2026-07-31',
      sessionType: 'event-enrichment',
      status: 'completed',
      isExemplar: true,
      sessionNotes: 'Single-phase dialogue in ordinary chat.',
      messages: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'q1' }],
      eventRecord: {
        id: 40,
        slug: 'pecha-kucha-amsterdam-vol-9-mediamatic-2009',
        title: 'Pecha Kucha Night Amsterdam Vol. 9',
      },
    } as Session

    const block = summarizeExemplarEventSessionForPrompt(session)
    expect(block).toContain('isExemplar: true')
    expect(block).toContain('pecha-kucha-amsterdam-vol-9-mediamatic-2009-event-2026-07-31')
    expect(block).toContain('messages: 2 turns')
    expect(block).not.toContain('hi')
  })
})
