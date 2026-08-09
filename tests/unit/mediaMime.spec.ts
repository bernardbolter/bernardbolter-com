import { describe, expect, it } from 'vitest'

import {
  isAudioMediaFile,
  isVideoMediaFile,
  resolveMediaMimeType,
} from '@/lib/artOfficial/mediaMime'

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

  it('maps GarageBand iOS m4a aliases and empty type to audio/mp4', () => {
    expect(resolveMediaMimeType({ name: 'beat.m4a', type: 'audio/x-m4a' } as File)).toBe(
      'audio/mp4',
    )
    expect(resolveMediaMimeType({ name: 'beat.m4a', type: '' } as File)).toBe('audio/mp4')
    expect(
      resolveMediaMimeType({ name: 'beat.m4a', type: 'application/octet-stream' } as File),
    ).toBe('audio/mp4')
    expect(resolveMediaMimeType({ name: 'beat.m4a', type: 'video/mp4' } as File)).toBe('audio/mp4')
    expect(isAudioMediaFile({ name: 'beat.m4a', type: 'audio/x-m4a' } as File)).toBe(true)
  })

  it('maps GarageBand uncompressed exports', () => {
    expect(resolveMediaMimeType({ name: 'beat.wav', type: 'audio/x-wav' } as File)).toBe(
      'audio/wav',
    )
    expect(resolveMediaMimeType({ name: 'beat.aiff', type: '' } as File)).toBe('audio/aiff')
  })
})
