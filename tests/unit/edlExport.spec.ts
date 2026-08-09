import { describe, expect, it } from 'vitest'

import {
  buildEdlFromAssembly,
  buildEdlFromTakes,
  clipNameFromMediaFilename,
  formatEdlTimecode,
} from '@/lib/studio/edlExport'

describe('edlExport', () => {
  it('formats whole-second timecode with zero frames', () => {
    expect(formatEdlTimecode(0)).toBe('00:00:00:00')
    expect(formatEdlTimecode(65)).toBe('00:01:05:00')
    expect(formatEdlTimecode(3723)).toBe('01:02:03:00')
  })

  it('uses media basename as Resolve clip name', () => {
    expect(clipNameFromMediaFilename('inbox/2026/08/abc-freestyle.mp4')).toBe('abc-freestyle.mp4')
    expect(clipNameFromMediaFilename(null)).toBe('UNKNOWN')
  })

  it('builds contiguous record timeline from assembly rows', () => {
    const edl = buildEdlFromAssembly('Rap Critic 1', [
      {
        beatName: 'ARRIVE',
        fieldNoteId: 8,
        durationSec: 10,
        mediaFilename: 'inbox/2026/08/u1-arrive.mp4',
        shotType: 'ARRIVE',
        cameraAngle: 'front',
      },
      {
        beatName: 'VERSE',
        fieldNoteId: 9,
        durationSec: 32.7,
        mediaFilename: 'inbox/2026/08/u2-verse.mp4',
        shotType: 'VERSE',
        cameraAngle: 'rear',
        notes: 'keep rear',
      },
    ])

    expect(edl).toContain('TITLE: Rap Critic 1 assembly')
    expect(edl).toContain('FCM: NON-DROP FRAME')
    expect(edl).toContain(
      '001  AX       V     C        00:00:00:00 00:00:10:00 00:00:00:00 00:00:10:00',
    )
    expect(edl).toContain('* FROM CLIP NAME: u1-arrive.mp4')
    expect(edl).toContain(
      '002  AX       V     C        00:00:00:00 00:00:32:00 00:00:10:00 00:00:42:00',
    )
    expect(edl).toContain('* FROM CLIP NAME: u2-verse.mp4')
    expect(edl).toContain('* VERSE · VERSE · rear · field-note-9 · keep rear')
  })

  it('builds take EDL with accumulating record times', () => {
    const edl = buildEdlFromTakes([
      {
        id: 1,
        takeNumber: 1,
        shotId: 10,
        inPointSec: 2,
        outPointSec: 7,
        quickNote: 'good',
      },
      {
        id: 2,
        takeNumber: 2,
        shotId: 10,
        inPointSec: null,
        outPointSec: null,
        quickNote: null,
      },
    ])

    expect(edl).toContain(
      '001  AX       V     C        00:00:02:00 00:00:07:00 00:00:00:00 00:00:05:00',
    )
    expect(edl).toContain(
      '002  AX       V     C        00:00:00:00 00:00:05:00 00:00:05:00 00:00:10:00',
    )
    expect(edl).toContain('* FROM CLIP NAME: shot-10-take-1')
    expect(edl).toContain('* good')
  })
})
