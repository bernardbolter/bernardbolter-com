import { describe, expect, it, vi } from 'vitest'

import {
  buildFieldNoteObjectKey,
  mediaAltFromObjectKey,
  sanitizeUploadFilename,
} from '@/lib/studio/r2'

describe('studio R2 helpers', () => {
  it('sanitizes unsafe filename characters', () => {
    expect(sanitizeUploadFilename('../../evil name?.jpg')).toBe('evil name_.jpg')
  })

  it('builds field-notes key with year/month prefix', () => {
    vi.stubGlobal('crypto', {
      randomUUID: () => '11111111-2222-4333-8444-555555555555',
    })
    const key = buildFieldNoteObjectKey('studio clip.mp4', new Date('2026-05-28T12:00:00Z'))
    expect(key).toBe(
      'field-notes/2026/05/11111111-2222-4333-8444-555555555555-studio clip.mp4',
    )
    vi.unstubAllGlobals()
  })

  it('derives media alt from object key', () => {
    expect(
      mediaAltFromObjectKey('field-notes/2026/05/11111111-2222-4333-8444-555555555555-gate.jpg'),
    ).toBe('gate')
  })
})
