import { describe, expect, it } from 'vitest'

import {
  buildKeyframeFpsFilter,
  keyframeTimestampForIndex,
  parseFfprobeDurationOutput,
} from '@/lib/workers/ffmpeg'

describe('ffmpeg helpers', () => {
  it('builds fps filter from interval seconds', () => {
    expect(buildKeyframeFpsFilter(10)).toBe('fps=1/10')
    expect(buildKeyframeFpsFilter(5)).toBe('fps=1/5')
  })

  it('rejects invalid keyframe interval', () => {
    expect(() => buildKeyframeFpsFilter(0)).toThrow(/positive number/)
  })

  it('maps frame index to timestamp', () => {
    expect(keyframeTimestampForIndex(1, 10)).toBe(0)
    expect(keyframeTimestampForIndex(2, 10)).toBe(10)
    expect(keyframeTimestampForIndex(4, 5)).toBe(15)
  })

  it('parses ffprobe duration output', () => {
    expect(parseFfprobeDurationOutput('94.12\n')).toBe(94.12)
  })

  it('rejects invalid ffprobe duration', () => {
    expect(() => parseFfprobeDurationOutput('n/a')).toThrow(/Invalid ffprobe/)
  })
})

describe('ffmpeg integration', () => {
  it.skipIf(!process.env.HAS_FFMPEG)('extracts keyframes and audio from a sample clip', async () => {
    const { extractKeyframesAndAudio } = await import('@/lib/workers/ffmpeg')
    const fs = await import('node:fs/promises')
    const os = await import('node:os')
    const path = await import('node:path')

    const samplePath = process.env.FFMPEG_SAMPLE_VIDEO
    if (!samplePath) {
      throw new Error('Set FFMPEG_SAMPLE_VIDEO to run ffmpeg integration test')
    }

    const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ffmpeg-test-'))
    try {
      const result = await extractKeyframesAndAudio(samplePath, {
        intervalSec: 10,
        workDir,
      })

      expect(result.durationSec).toBeGreaterThan(0)
      expect(result.keyframes.length).toBeGreaterThan(0)
      await fs.access(result.audioPath)
    } finally {
      await fs.rm(workDir, { recursive: true, force: true })
    }
  })
})
