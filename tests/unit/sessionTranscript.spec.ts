import { describe, expect, it } from 'vitest'

import {
  SESSION_TRANSCRIPT_FALLBACK_VISIBLE_COUNT,
  collapseFieldPath,
  formatFieldsWrittenLine,
  messagesForPublicTranscript,
  normalizeFieldsWritten,
  prepareFieldsWrittenDisplay,
  resolveTranscriptPreviewCount,
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

  it('attaches update_field names to the preceding artist turn, never values', () => {
    const turns = messagesForPublicTranscript([
      { role: 'user', content: 'Megacities' },
      {
        role: 'assistant',
        content: 'Staged.',
        toolUses: [
          {
            name: 'update_field',
            id: '1',
            input: { field: 'series', value: 'secret-value', targetCollection: 'artworks' },
          },
          {
            name: 'update_field',
            id: '2',
            input: { field: 'seriesContext', value: { nested: true }, targetCollection: 'artworks' },
          },
        ],
      },
      { role: 'user', content: 'Berlin' },
    ])

    expect(turns[0]).toEqual({
      role: 'user',
      content: 'Megacities',
      fieldsWritten: ['series', 'seriesContext'],
    })
    expect(JSON.stringify(turns)).not.toContain('secret-value')
    expect(turns[2]?.fieldsWritten).toBeUndefined()
  })

  it('cuts preview after upload acknowledgment when present', () => {
    const turns = messagesForPublicTranscript([
      { role: 'user', content: 'pre' },
      { role: 'assistant', content: 'ask blind' },
      { role: 'user', content: 'blind description' },
      { role: 'assistant', content: 'upload when ready' },
      { role: 'user', content: 'I have uploaded the primary artwork image.' },
      { role: 'assistant', content: 'I can see the city fabric.' },
      { role: 'user', content: 'later fact' },
      { role: 'assistant', content: 'later reply' },
    ])
    expect(resolveTranscriptPreviewCount(turns)).toBe(6)
  })

  it('falls back to a round 24 when no upload beat exists', () => {
    const turns = Array.from({ length: 40 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: `turn ${i}`,
    }))
    expect(resolveTranscriptPreviewCount(turns)).toBe(SESSION_TRANSCRIPT_FALLBACK_VISIBLE_COUNT)
  })

  it('formats field-write lines quietly', () => {
    expect(formatFieldsWrittenLine(['series'])).toBe('wrote series')
    expect(formatFieldsWrittenLine(['series', 'seriesContext'])).toBe(
      'wrote series, series context',
    )
  })

  it('collapses nested field paths to their parent and caps the line', () => {
    expect(collapseFieldPath('megacities.series.compositeNumber')).toBe('series')
    expect(collapseFieldPath('locationCreated.countryCode')).toBe('locationCreated')
    expect(collapseFieldPath('title')).toBe('title')

    const nested = [
      'title',
      'yearStart',
      'megacities.series.compositeNumber',
      'megacities.series.completionStatus',
      'locationCreated.countryCode',
      'widthWhole',
      'heightWhole',
      'medium',
      'support',
    ]
    expect(normalizeFieldsWritten(nested)).toEqual([
      'title',
      'year start',
      'series',
      'location created',
      'width whole',
      'height whole',
      'medium',
      'support',
    ])

    const display = prepareFieldsWrittenDisplay(nested)
    expect(display?.summary).toBe(
      'wrote title, year start, series, location created and 4 more',
    )
    expect(display?.hiddenCount).toBe(4)
    expect(display?.allNames).toHaveLength(8)
  })
})
