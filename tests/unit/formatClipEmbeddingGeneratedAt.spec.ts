import { describe, expect, it } from 'vitest'

import { formatClipEmbeddingGeneratedAt } from '@/utilities/formatClipEmbeddingGeneratedAt'

describe('formatClipEmbeddingGeneratedAt', () => {
  it('formats ISO timestamps for display', () => {
    const formatted = formatClipEmbeddingGeneratedAt('2026-06-18T15:36:00.000Z')
    expect(formatted).toContain('June')
    expect(formatted).toContain('2026')
    expect(formatted).toMatch(/17:36|15:36/)
  })

  it('returns empty string for missing values', () => {
    expect(formatClipEmbeddingGeneratedAt(null)).toBe('')
    expect(formatClipEmbeddingGeneratedAt(undefined)).toBe('')
  })
})
