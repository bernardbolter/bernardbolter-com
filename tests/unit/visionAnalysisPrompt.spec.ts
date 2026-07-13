import { describe, expect, it } from 'vitest'

import {
  VISION_ANALYSIS_PROMPT_A1_0,
  VISION_PROMPT_VERSION,
  buildVisionAnalysisPrompt,
  buildVisionImportJsonPrompt,
  buildVisionPhoneWorkflowPrompt,
} from '@/lib/studio/visionAnalysisPrompt'
import { VISION_IMPORT_CLAUDE_PROMPT } from '@/lib/studio/visionImportTemplate'

describe('visionAnalysisPrompt', () => {
  it('freezes prompt version A-1.0', () => {
    expect(VISION_PROMPT_VERSION).toBe('A-1.0')
  })

  it('includes temporal-coexistence and unresolved closing in A-1.0', () => {
    expect(VISION_ANALYSIS_PROMPT_A1_0).toContain('Temporal-coexistence signals')
    expect(VISION_ANALYSIS_PROMPT_A1_0).toContain('resists confident visual description')
    expect(VISION_ANALYSIS_PROMPT_A1_0).not.toContain('subject_inventory')
  })

  it('embeds slug in workflow prompt when provided', () => {
    const prompt = buildVisionPhoneWorkflowPrompt({ slug: 'gates-iii' })
    expect(prompt).toContain('gates-iii')
    expect(prompt).toContain('Prompt version: A-1.0')
    expect(prompt).toContain('analyses[0].text')
  })

  it('builds analysis-only prompt with optional slug', () => {
    const prompt = buildVisionAnalysisPrompt({ slug: 'gates-iii' })
    expect(prompt).toContain('gates-iii')
    expect(prompt).toContain(VISION_ANALYSIS_PROMPT_A1_0)
  })

  it('builds JSON wrap prompt with slug hint', () => {
    const prompt = buildVisionImportJsonPrompt({ slug: 'gates-iii' })
    expect(prompt).toContain('gates-iii')
    expect(prompt).toContain('"slug"')
  })

  it('exports default Claude workflow from template module', () => {
    expect(VISION_IMPORT_CLAUDE_PROMPT).toContain(VISION_ANALYSIS_PROMPT_A1_0)
    expect(VISION_IMPORT_CLAUDE_PROMPT).toContain('Bernard Bolter Studio vision import')
  })
})
