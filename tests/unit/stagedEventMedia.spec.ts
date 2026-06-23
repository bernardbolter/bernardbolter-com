import { describe, expect, it } from 'vitest'

import {
  mergeStagedEventMediaIntoEventPatch,
  normalizeStagedEventMedia,
  seedStagedEventMediaFromEvent,
} from '@/lib/artOfficial/stagedEventMedia'

describe('stagedEventMedia', () => {
  it('merges artworks and installation images into event patch', () => {
    const patch = mergeStagedEventMediaIntoEventPatch(
      { descriptionShort: 'Opening night' },
      {
        artworkIds: [10, 11],
        installationImages: [
          {
            id: 'new-abc',
            mediaId: 42,
            caption: 'Wide shot',
            artworksShown: [10],
          },
        ],
      },
    )

    expect(patch.descriptionShort).toBe('Opening night')
    expect(patch.artworks).toEqual([10, 11])
    expect(patch.installationImages).toEqual([
      { image: 42, caption: 'Wide shot', artworksShown: [10] },
    ])
  })

  it('seeds from event when session staging is empty', () => {
    const seeded = seedStagedEventMediaFromEvent(
      {
        id: 1,
        artworks: [5],
        installationImages: [
          {
            id: 'img-1',
            image: 99,
            caption: 'Install view',
            artworksShown: [5],
          },
        ],
      } as never,
      null,
    )

    expect(seeded.artworkIds).toEqual([5])
    expect(seeded.installationImages).toHaveLength(1)
    expect(seeded.installationImages[0]?.mediaId).toBe(99)
  })

  it('normalizes invalid staged payloads to empty state', () => {
    expect(normalizeStagedEventMedia(null)).toEqual({
      artworkIds: [],
      installationImages: [],
    })
  })
})
