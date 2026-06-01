import { describe, expect, it } from 'vitest'

import {
  buildTagClassificationBlock,
  buildTimeBasedWorkBlock,
} from '@/lib/artOfficial/promptBlocks'

describe('tag and time-based prompt blocks', () => {
  it('requires all five tag fields', () => {
    const block = buildTagClassificationBlock()
    expect(block).toContain('movementTags')
    expect(block).toContain('periodTags')
    expect(block).toContain('within 3 turns')
  })

  it('documents performance stills and video modes', () => {
    const block = buildTimeBasedWorkBlock()
    expect(block).toContain('alternateViewImages')
    expect(block).toContain('video-primary-file')
    expect(block).toContain('measurementType')
  })
})
