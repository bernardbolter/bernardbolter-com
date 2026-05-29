import { describe, expect, it } from 'vitest'

import {
  buildEpisodeAssemblyBlock,
  buildEpisodeStoryboardBlock,
} from '@/lib/artOfficial/promptBlocks'

describe('episode prompt blocks', () => {
  it('storyboard block includes title and concept', () => {
    const block = buildEpisodeStoryboardBlock('Test Episode', 'A bold idea')
    expect(block).toContain('Test Episode')
    expect(block).toContain('A bold idea')
    expect(block).toContain('storyboard')
  })

  it('storyboard block handles missing concept', () => {
    const block = buildEpisodeStoryboardBlock('Solo', null)
    expect(block).toContain('(none yet)')
  })

  it('assembly block includes clips summary', () => {
    const block = buildEpisodeAssemblyBlock('Edit Map', '- clip 1: b-roll')
    expect(block).toContain('Edit Map')
    expect(block).toContain('clip 1')
    expect(block).toContain('assembly')
  })

  it('assembly block notes when no clips', () => {
    const block = buildEpisodeAssemblyBlock('Empty', '')
    expect(block).toContain('no clips linked yet')
  })
})
