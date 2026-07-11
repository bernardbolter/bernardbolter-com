import { describe, expect, it } from 'vitest'

import {
  analysisPreview,
  formatVisionModelLabel,
  latestVisionAnalysis,
  vectorTeasePreview,
} from '@/lib/artwork/visionPage'
import type { Artwork } from '@/payload-types'

describe('visionPage helpers', () => {
  it('formats known vision model labels', () => {
    expect(formatVisionModelLabel('claude-sonnet-4-6')).toBe('Claude Sonnet 4.6')
    expect(formatVisionModelLabel('gpt-4o')).toBe('GPT-4o')
    expect(formatVisionModelLabel('gemini-2.5-pro')).toBe('Gemini 2.5 Pro')
    expect(formatVisionModelLabel('deepseek-vl2')).toBe('DeepSeek VL2')
  })

  it('returns the last vision analysis entry', () => {
    const artwork = {
      visionAnalyses: [
        { text: 'First.', model: 'gpt-4o', date: '2026-01-01' },
        { text: 'Latest.', model: 'claude-sonnet-4-6', date: '2026-07-08' },
      ],
    } as Artwork

    expect(latestVisionAnalysis(artwork)?.text).toBe('Latest.')
  })

  it('builds vector tease and analysis preview', () => {
    expect(vectorTeasePreview([0.234, -0.891, 0.445], 3)).toBe('0.234, -0.891, 0.445')
    expect(analysisPreview('One. Two. Three. Four.')).toBe('One. Two. Three.…')
  })
})
