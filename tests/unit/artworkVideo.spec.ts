import { describe, expect, it } from 'vitest'

import {
  getYoutubeAccessUrl,
  isVideoPrimaryArtwork,
} from '@/lib/artwork/artworkGalleryImages'
import type { Artwork, Media } from '@/payload-types'

const videoFile = {
  id: 1,
  url: 'https://cdn.example.com/video.mp4',
  filename: 'video.mp4',
  updatedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  alt: '',
} satisfies Media

const primaryImage = {
  id: 2,
  url: 'https://cdn.example.com/poster.jpg',
  filename: 'poster.jpg',
  width: 960,
  height: 540,
  updatedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  alt: 'Poster',
} satisfies Media

describe('isVideoPrimaryArtwork', () => {
  it('uses the video player when an R2 upload exists even with a primary still', () => {
    const artwork = {
      videoFile,
      primaryImage,
    } as Artwork

    expect(isVideoPrimaryArtwork(artwork)).toBe(true)
  })

  it('falls back to the image slider when extra gallery images exist', () => {
    const artwork = {
      videoFile,
      primaryImage,
      alternateViewImages: [{ image: primaryImage }],
    } as Artwork

    expect(isVideoPrimaryArtwork(artwork)).toBe(false)
  })
})

describe('getYoutubeAccessUrl', () => {
  it('reads a YouTube access link stored alongside an uploaded primary video', () => {
    const artwork = {
      videoFile,
      videoUrl: 'https://www.youtube.com/watch?v=FFw_jIrXbgk',
    } as Artwork

    expect(getYoutubeAccessUrl(artwork)).toBe('https://www.youtube.com/watch?v=FFw_jIrXbgk')
  })
})
