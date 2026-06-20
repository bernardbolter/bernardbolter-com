import { describe, expect, it } from 'vitest'

import {
  formatRelatedWorkLine,
  getPublicRelatedWorks,
} from '@/lib/artwork/relatedWorksPublic'
import type { Artwork } from '@/payload-types'

describe('getPublicRelatedWorks', () => {
  it('returns note-only entries without a linked artwork', () => {
    const artwork = {
      relatedWorks: [
        {
          relationshipType: 'derivative-oil-painting',
          relatedWorkNote: 'An oil painting interpretation exists separately.',
        },
      ],
    } as Artwork

    expect(getPublicRelatedWorks(artwork)).toEqual([
      {
        relationshipLabel: 'oil painting interpretation',
        note: 'An oil painting interpretation exists separately.',
        href: null,
        linkLabel: null,
      },
    ])
  })

  it('returns linked artwork with slug and title', () => {
    const artwork = {
      relatedWorks: [
        {
          relationshipType: 'series-related',
          relatedArtwork: { slug: 'london', title: 'London' },
          relatedWorkNote: 'Companion work.',
        },
      ],
    } as Artwork

    expect(getPublicRelatedWorks(artwork)).toEqual([
      {
        relationshipLabel: 'related composition in the same series',
        note: 'Companion work.',
        href: '/london',
        linkLabel: 'London',
      },
    ])
  })

  it('skips empty rows', () => {
    expect(getPublicRelatedWorks({ relatedWorks: [{}] } as Artwork)).toEqual([])
  })
})

describe('formatRelatedWorkLine', () => {
  it('formats note-only lines', () => {
    expect(
      formatRelatedWorkLine({
        relationshipLabel: 'oil painting interpretation',
        note: 'Commissioned separately.',
        href: null,
        linkLabel: null,
      }),
    ).toBe('A related oil painting interpretation exists — Commissioned separately.')
  })

  it('formats linked artwork lines', () => {
    expect(
      formatRelatedWorkLine({
        relationshipLabel: 'related composition in the same series',
        note: null,
        href: '/london',
        linkLabel: 'London',
      }),
    ).toBe('A related related composition in the same series exists — London.')
  })
})
