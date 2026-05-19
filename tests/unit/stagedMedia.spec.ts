import { describe, expect, it } from 'vitest'

import { detectVideoEmbedType } from '@/lib/artOfficial/artworkMediaSlots'
import {
  mergeStagedMediaIntoArtworkPatch,
  resolveMediaSlotStates,
} from '@/lib/artOfficial/stagedMedia'

describe('stagedMedia', () => {
  it('detects YouTube and Vimeo URLs', () => {
    expect(detectVideoEmbedType('https://www.youtube.com/watch?v=abc')).toBe('youtube')
    expect(detectVideoEmbedType('https://vimeo.com/123')).toBe('vimeo')
    expect(detectVideoEmbedType('https://example.com/v.mp4')).toBe('url')
  })

  it('resolves primary as staged when timeline has primaryImage', () => {
    const states = resolveMediaSlotStates({
      timeline: [
        {
          targetCollection: 'artworks',
          field: 'primaryImage',
          value: 42,
        },
      ],
      hasPrimary: true,
    })
    const primary = states.find((s) => s.slot.id === 'primary')
    expect(primary?.status).toBe('staged')
  })

  it('merges ACH source and detail images into patch', () => {
    const patch = mergeStagedMediaIntoArtworkPatch(
      { title: 'Test' },
      [
        {
          slotId: 'ach-source',
          kind: 'image',
          mediaId: 10,
          stagedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          slotId: 'work-view',
          kind: 'image',
          mediaId: 11,
          caption: 'Side view',
          stagedAt: '2026-01-01T00:00:01.000Z',
        },
        {
          slotId: 'documentation-photo',
          kind: 'image',
          mediaId: 12,
          caption: 'Studio',
          stagedAt: '2026-01-01T00:00:01.500Z',
        },
        {
          slotId: 'video-primary-url',
          kind: 'video-url',
          url: 'https://www.youtube.com/watch?v=abc',
          videoType: 'youtube',
          stagedAt: '2026-01-01T00:00:02.000Z',
        },
      ],
    )
    expect(patch).toMatchObject({
      title: 'Test',
      ach: { sourcePhotograph: { sourceImage: 10 } },
      alternateViewImages: [{ image: 11, caption: 'Side view' }],
      documentationImages: [{ image: 12, caption: 'Studio' }],
      videoUrl: 'https://www.youtube.com/watch?v=abc',
    })
  })
})
