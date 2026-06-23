import { describe, expect, it } from 'vitest'

import {
  buildEventSessionCloseBlock,
  buildEventTagWrapUpBlock,
} from '@/lib/artOfficial/assembleEventPhaseBPrompt'

describe('event tag wrap-up prompt', () => {
  it('requires all five tag fields and conceptualKeywords before commit', () => {
    const block = buildEventTagWrapUpBlock()
    expect(block).toContain('MANDATORY')
    expect(block).toContain('movementTags')
    expect(block).toContain('styleTags')
    expect(block).toContain('subjectTags')
    expect(block).toContain('genreTags')
    expect(block).toContain('periodTags')
    expect(block).toContain('conceptualKeywords')
    expect(block).toContain('ready to commit')
    expect(block).toContain('generate_confirmation_draft')
  })

  it('chains narrative close-gate to tag wrap-up', () => {
    const block = buildEventSessionCloseBlock()
    expect(block).toContain('EVENT TAG & KEYWORD WRAP-UP')
    expect(block).toContain('Wrap up / confirm')
  })
})
