import { describe, expect, it } from 'vitest'

import {
  artworkFieldsImportSchema,
  envelopeImportSchema,
  mapEnvelopeSessionType,
  orderEnvelopeWrites,
  visionAnalysisImportSchema,
} from '@/lib/studio/archiveImportSchemas'

describe('archiveImportSchemas strict validation', () => {
  it('accepts a valid vision single payload', () => {
    const parsed = visionAnalysisImportSchema.safeParse({
      slug: 'gates-iii',
      analyses: [{ text: 'Seen.', model: 'claude-sonnet-4-6', date: '2026-07-23' }],
    })
    expect(parsed.success).toBe(true)
  })

  it('rejects unknown keys on vision analysis entries', () => {
    const parsed = visionAnalysisImportSchema.safeParse({
      slug: 'gates-iii',
      analyses: [
        {
          text: 'Seen.',
          model: 'claude-sonnet-4-6',
          date: '2026-07-23',
          confidence: 0.9,
        },
      ],
    })
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(parsed.error.message).toMatch(/Unrecognized key/i)
    }
  })

  it('rejects unknown top-level keys on vision single payloads', () => {
    const parsed = visionAnalysisImportSchema.safeParse({
      slug: 'gates-iii',
      analyses: [{ text: 'Seen.', model: 'claude-sonnet-4-6', date: '2026-07-23' }],
      visionAnalyses: [],
    })
    expect(parsed.success).toBe(false)
  })

  it('accepts vision batch items wrapper', () => {
    const parsed = visionAnalysisImportSchema.safeParse({
      items: [
        {
          slug: 'gates-iii',
          analyses: [{ text: 'A', model: 'gpt-4o', date: '2026-07-23' }],
        },
      ],
    })
    expect(parsed.success).toBe(true)
  })

  it('rejects unknown keys on envelope writes and entries', () => {
    const parsed = envelopeImportSchema.safeParse({
      writes: [
        {
          collection: 'bio-timeline',
          operation: 'append',
          entry: {
            text: 'A life fact.',
            typoField: true,
          },
        },
      ],
    })
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(parsed.error.message).toMatch(/Unrecognized key/i)
    }
  })

  it('rejects unknown top-level envelope keys', () => {
    const parsed = envelopeImportSchema.safeParse({
      sourceSessionRef: 'abc',
      writes: [
        {
          collection: 'artworks',
          slug: 'gates-iii',
          fields: { intent: '…' },
        },
      ],
      dryRun: true,
    })
    expect(parsed.success).toBe(false)
  })

  it('accepts artwork-fields single and batch shapes', () => {
    expect(
      artworkFieldsImportSchema.safeParse({
        slug: 'gates-iii',
        fields: { intent: '…' },
      }).success,
    ).toBe(true)

    expect(
      artworkFieldsImportSchema.safeParse({
        items: [{ slug: 'gates-iii', fields: { reasoningStatus: 'complete' } }],
      }).success,
    ).toBe(true)
  })

  it('rejects unknown keys on artwork-fields payloads', () => {
    const parsed = artworkFieldsImportSchema.safeParse({
      slug: 'gates-iii',
      fields: { intent: '…' },
      extra: true,
    })
    expect(parsed.success).toBe(false)
  })

  it('accepts sessions as a collection discriminator', () => {
    const parsed = envelopeImportSchema.safeParse({
      writes: [
        {
          collection: 'sessions',
          operation: 'set',
          sessionId: 'venice-biennale-2007-chat',
          fields: {
            sessionType: 'artwork',
            status: 'completed',
            primaryArtwork: 'venice-in-the-middle',
            messages: [
              { role: 'user', content: 'Blind description…' },
              { role: 'assistant', content: '…' },
            ],
          },
        },
      ],
    })
    expect(parsed.success).toBe(true)
  })

  it('rejects unknown keys on sessions writes', () => {
    const parsed = envelopeImportSchema.safeParse({
      writes: [
        {
          collection: 'sessions',
          operation: 'set',
          sessionId: 'x',
          fields: {
            sessionType: 'artwork',
            status: 'completed',
            messages: [],
            typoField: true,
          },
        },
      ],
    })
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(parsed.error.message).toMatch(/Unrecognized key/i)
    }
  })

  it('maps envelope sessionType shorthand to Payload values', () => {
    expect(mapEnvelopeSessionType('artwork')).toBe('artwork-cataloguing')
    expect(mapEnvelopeSessionType('statement')).toBe('artist-statement')
    expect(mapEnvelopeSessionType('event')).toBe('event-enrichment')
    expect(mapEnvelopeSessionType('artwork-cataloguing')).toBe('artwork-cataloguing')
  })

  it('orders sessions writes before dependent collections', () => {
    const ordered = orderEnvelopeWrites([
      { collection: 'statement-throughlines' as const },
      { collection: 'artworks' as const },
      { collection: 'sessions' as const },
      { collection: 'bio-timeline' as const },
      { collection: 'sessions' as const },
    ])
    expect(ordered.map((w) => w.collection)).toEqual([
      'sessions',
      'sessions',
      'statement-throughlines',
      'artworks',
      'bio-timeline',
    ])
  })
})
