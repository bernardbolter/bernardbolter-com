import { describe, expect, it } from 'vitest'

import { validateEnvelopeDryRun } from '../../src/lib/artOfficial/contract/validateEnvelopeDryRun'

describe('validateEnvelopeDryRun', () => {
  it('accepts a minimal valid multi-collection envelope', () => {
    const result = validateEnvelopeDryRun({
      sourceSessionRef: 'test-session-1',
      writes: [
        {
          collection: 'artworks',
          slug: 'nature-vs-nurture',
          operation: 'set',
          fields: {
            workContext: 'A short context for dry-run.',
          },
        },
      ],
    })

    expect(result.ok).toBe(true)
    expect(result.accepted.length).toBeGreaterThanOrEqual(1)
    expect(result.rejected).toHaveLength(0)
    expect(result.silentlyDropped).toEqual([])
  })


  it('rejects unknown keys under .strict() (whole paste)', () => {
    const result = validateEnvelopeDryRun({
      sourceSessionRef: 'test-session-1',
      writes: [
        {
          collection: 'sessions',
          operation: 'set',
          sessionId: 'test-session-1',
          fields: {
            sessionType: 'artwork',
            status: 'completed',
            messages: [{ role: 'user', content: 'hi' }],
            notASessionField: 'boom',
          },
        },
      ],
    })

    expect(result.ok).toBe(false)
    expect(result.wholePasteRejected).toBe(true)
    expect(
      result.rejected.some((r) => /Unrecognized key|notASessionField/i.test(r.reason + r.path)),
    ).toBe(true)
  })

  it('rejects money fields as FORBIDDEN (ask in prose, never write)', () => {
    const result = validateEnvelopeDryRun({
      sourceSessionRef: 'test-session-1',
      writes: [
        {
          collection: 'artworks',
          slug: 'nature-vs-nurture',
          operation: 'set',
          fields: {
            workContext: 'context',
            askingPrice: 1200,
            salesRecord: [{ note: 'sold' }],
          },
        },
      ],
    })

    expect(result.ok).toBe(false)
    expect(result.rejected.some((r) => r.path.endsWith('askingPrice'))).toBe(true)
    expect(result.rejected.some((r) => r.path.endsWith('salesRecord'))).toBe(true)
  })

  it('reports reasoningStatus as silently dropped', () => {
    const result = validateEnvelopeDryRun({
      sourceSessionRef: 'test-session-1',
      writes: [
        {
          collection: 'artworks',
          slug: 'nature-vs-nurture',
          operation: 'set',
          fields: {
            workContext: 'context',
            reasoningStatus: 'complete',
          },
        },
      ],
    })

    expect(result.silentlyDropped.some((r) => r.path.includes('reasoningStatus'))).toBe(true)
  })

  it('rejects prose artHistoricalReferences', () => {
    const result = validateEnvelopeDryRun({
      sourceSessionRef: 'test-session-1',
      writes: [
        {
          collection: 'artworks',
          slug: 'nature-vs-nurture',
          operation: 'set',
          fields: {
            artHistoricalReferences: 'Bauhaus influence in the grid',
          },
        },
      ],
    })

    expect(result.ok).toBe(false)
    expect(result.rejected.some((r) => r.path.includes('artHistoricalReferences'))).toBe(true)
  })

  it('rejects vision envelope with wrong key visionAnalyses', () => {
    const result = validateEnvelopeDryRun({
      slug: 'nature-vs-nurture',
      visionAnalyses: [{ text: 'x', model: 'm', date: '2026-01-01' }],
    })

    expect(result.ok).toBe(false)
  })

  it('accepts vision envelope with analyses key', () => {
    const result = validateEnvelopeDryRun({
      slug: 'nature-vs-nurture',
      analyses: [{ text: 'A reading.', model: 'claude-sonnet-5', date: '2026-07-23' }],
    })

    expect(result.ok).toBe(true)
    expect(result.accepted[0]?.path).toBe('vision:nature-vs-nurture')
  })
})

