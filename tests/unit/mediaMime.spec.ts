import { describe, expect, it } from 'vitest'

import { isVideoMediaFile, resolveMediaMimeType } from '@/lib/artOfficial/mediaMime'

describe('mediaMime', () => {
  it('detects video by mime type', () => {
    const file = { name: 'piece.mp4', type: 'video/mp4' } as File
    expect(isVideoMediaFile(file)).toBe(true)
  })

  it('infers video mime from extension when browser omits type', () => {
    const file = { name: 'piece.MOV', type: '' } as File
    expect(resolveMediaMimeType(file)).toBe('video/quicktime')
    expect(isVideoMediaFile(file)).toBe(true)
  })

  it('normalizes macOS mp4 variant video/x-m4v to video/mp4', () => {
    const file = { name: 'clip.mp4', type: 'video/x-m4v' } as File
    expect(resolveMediaMimeType(file)).toBe('video/mp4')
  })
})
