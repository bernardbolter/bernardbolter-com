import { describe, expect, it } from 'vitest'

import {
  ART_OFFICIAL_SOURCE_OF_TRUTH_PATH,
  buildSourceOfTruthPromptBlock,
  loadArtOfficialSourceOfTruthMarkdown,
} from '@/lib/artOfficial/sourceOfTruth'

describe('artOfficial sourceOfTruth', () => {
  it('loads the corpus markdown from disk', () => {
    const md = loadArtOfficialSourceOfTruthMarkdown()
    expect(md).toContain('Art/Official — Source of Truth')
    expect(md).toContain('Part 1 — Session step → field map')
    expect(ART_OFFICIAL_SOURCE_OF_TRUTH_PATH).toBe('docs/corpus/art-official-source-of-truth.md')
  })

  it('builds an operational prompt block with key rules', () => {
    const block = buildSourceOfTruthPromptBlock()
    expect(block).toContain('firstImpression')
    expect(block).toContain('ownershipRegistry')
    expect(block).toContain('search_events')
    expect(block).toContain('sessions')
    expect(block).toMatch(/Never call this "your blind vision\."/)
  })
})
