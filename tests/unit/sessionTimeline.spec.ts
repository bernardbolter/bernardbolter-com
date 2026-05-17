import { describe, expect, it } from 'vitest'

import type { StoredMessage } from '@/lib/artOfficial/chatMessages'
import {
  finalizeOnboardingTimeline,
  reconcileFieldUpdateTimeline,
} from '@/lib/artOfficial/sessionTimeline'

describe('reconcileFieldUpdateTimeline', () => {
  it('restores entries lost when multiple tools overwrote the DB timeline', () => {
    const messages: StoredMessage[] = [
      {
        role: 'assistant',
        content: '',
        timestamp: '2026-05-15T12:00:00.000Z',
        toolUses: [
          {
            id: 't1',
            name: 'update_field',
            input: {
              targetCollection: 'practice-knowledge',
              field: 'series',
              value: 'Series text',
              confidence: 'confirmed',
              source: 'conversation',
            },
          },
          {
            id: 't2',
            name: 'update_field',
            input: {
              targetCollection: 'practice-knowledge',
              field: 'visual-vocabulary',
              value: 'Visual vocab',
              confidence: 'confirmed',
              source: 'conversation',
            },
          },
          {
            id: 't3',
            name: 'update_field',
            input: {
              targetCollection: 'practice-knowledge',
              field: 'preferred-vocabulary',
              value: 'Preferred terms',
              confidence: 'confirmed',
              source: 'conversation',
            },
          },
        ],
      },
    ]

    const dbTimeline = [
      {
        targetCollection: 'practice-knowledge',
        field: 'art-historical-touchstones',
        value: 'Only survivor',
        confidence: 'confirmed',
        source: 'conversation',
        timestamp: '2026-05-15T12:01:00.000Z',
      },
    ]

    const { timeline, repaired } = reconcileFieldUpdateTimeline(messages, dbTimeline)

    expect(repaired).toBe(true)
    expect(timeline).toHaveLength(4)
    expect(timeline.map((e) => e.field).sort()).toEqual([
      'art-historical-touchstones',
      'preferred-vocabulary',
      'series',
      'visual-vocabulary',
    ])
  })

  it('drops mistaken artists rows from onboarding timeline', () => {
    const { timeline, dropped } = finalizeOnboardingTimeline([
      {
        targetCollection: 'artists',
        field: 'practiceOverview',
        value: 'ignored',
      },
      {
        targetCollection: 'practice-knowledge',
        field: 'series',
        value: 'kept',
      },
    ])
    expect(dropped).toBe(1)
    expect(timeline).toHaveLength(1)
    expect(timeline[0]?.field).toBe('series')
  })
})
