import { describe, expect, it } from 'vitest'

import type { Artist } from '@/payload-types'
import { normalizeBioPhotos } from '@/helpers/bioPhotos'

describe('normalizeBioPhotos', () => {
  it('includes relatedEvent only when hasPage is true', () => {
    const photos = normalizeBioPhotos([
      {
        image: { id: 1, url: '/a.jpg', width: 800, height: 600, updatedAt: '', createdAt: '' },
        caption: 'Published show',
        relatedEvent: { id: 1, slug: 'book-job-2013', hasPage: true, updatedAt: '', createdAt: '' },
        id: 'row-1',
      },
      {
        image: { id: 2, url: '/b.jpg', width: 800, height: 600, updatedAt: '', createdAt: '' },
        caption: 'CV-only show',
        relatedEvent: { id: 2, slug: 'stub-show', hasPage: false, updatedAt: '', createdAt: '' },
        id: 'row-2',
      },
    ] as Artist['bioPhotos'])

    expect(photos[0]?.relatedEvent).toEqual({ slug: 'book-job-2013', hasPage: true })
    expect(photos[1]?.relatedEvent).toBeNull()
  })
})
