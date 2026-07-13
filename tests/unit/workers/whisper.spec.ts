import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getWhisperUrl, parseWhisperResponse, transcribeAudioFile } from '@/lib/workers/whisper'

describe('whisper client', () => {
  it('defaults whisper URL to local sidecar', () => {
    const previous = process.env.WHISPER_URL
    delete process.env.WHISPER_URL
    expect(getWhisperUrl()).toBe('http://127.0.0.1:9000')
    if (previous) process.env.WHISPER_URL = previous
  })

  it('parses whisper JSON response', () => {
    expect(parseWhisperResponse({ text: '  Slate. Episode one.  ', language: 'en' })).toEqual({
      text: 'Slate. Episode one.',
      language: 'en',
    })
  })

  describe('transcribeAudioFile', () => {
    let tmpDir: string
    let wavPath: string

    beforeEach(async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'whisper-test-'))
      wavPath = path.join(tmpDir, 'audio.wav')
      await fs.writeFile(wavPath, Buffer.from('RIFF'))
    })

    afterEach(async () => {
      await fs.rm(tmpDir, { recursive: true, force: true })
      vi.unstubAllGlobals()
    })

    it('posts wav to sidecar and returns transcript', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ text: 'Keeper.', language: 'en' }),
      })
      vi.stubGlobal('fetch', fetchMock)

      const result = await transcribeAudioFile(wavPath)

      expect(result).toEqual({ text: 'Keeper.', language: 'en' })
      expect(fetchMock).toHaveBeenCalledOnce()

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
      expect(url).toContain('/asr?')
      expect(url).toContain('output=json')
      expect(init.method).toBe('POST')
      expect(init.body).toBeInstanceOf(FormData)
    })

    it('throws on sidecar error', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
          text: async () => 'sidecar down',
        }),
      )

      await expect(transcribeAudioFile(wavPath)).rejects.toThrow(/Whisper sidecar failed \(503\)/)
    })
  })
})
