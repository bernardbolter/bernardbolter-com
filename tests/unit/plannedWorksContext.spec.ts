import { describe, expect, it } from 'vitest'

import {
  buildPlannedWorksContextBlock,
  collectPlannedWorksForPrompt,
} from '@/lib/artOfficial/plannedWorksContext'
import type { Artist } from '@/payload-types'

describe('plannedWorksContext', () => {
  it('excludes complete-migrated entries from prompt context', () => {
    const artist = {
      plannedWorks: [
        { title: 'Keep me', status: 'blocked', motivatingNote: 'Because' },
        { title: 'Done', status: 'complete-migrated', motivatingNote: 'Was' },
      ],
    } as Artist

    const entries = collectPlannedWorksForPrompt(artist)
    expect(entries).toHaveLength(1)
    expect(entries[0]?.title).toBe('Keep me')
  })

  it('prefers entries matching the session series', () => {
    const block = buildPlannedWorksContextBlock(
      [
        {
          title: 'Deutsche Skate Stadt',
          status: 'idea',
          relatedSeriesSlug: 'megacities',
          motivatingNote: 'Relaunch',
          blocker: 'Resolution',
        },
        {
          title: 'Other idea',
          status: 'active',
          relatedSeriesSlug: 'digital-city-series',
        },
      ],
      'megacities',
    )

    expect(block).toContain('Deutsche Skate Stadt')
    expect(block).toContain('megacities')
    expect(block).not.toContain('Other idea')
  })
})
