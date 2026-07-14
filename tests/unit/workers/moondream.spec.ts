import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getMoondreamUrl,
  imageMimeTypeFromPath,
  parseMoondreamResponse,
  queryMoondreamImage,
  toMoondreamDataUri,
} from '@/lib/workers/moondream'

describe('moondream client', () => {
  it('defaults moondream URL to local sidecar', () => {
    const previous = process.env.MOONDREAM_URL
    delete process.env.MOONDREAM_URL
    expect(getMoondreamUrl()).toBe('http://127.0.0.1:2020')
    if (previous) process.env.MOONDREAM_URL = previous
  })

  it('parses moondream JSON and splits tags', () => {
    expect(parseMoondreamResponse({ text: 'Person, Statue, Golden Light' })).toEqual({
      raw: 'Person, Statue, Golden Light',
      tags: ['person', 'statue', 'golden light'],
    })
  })

  it('accepts answer/response field aliases', () => {
    expect(parseMoondreamResponse({ answer: 'wide, park, overcast' }).tags).toEqual([
      'wide',
      'park',
      'overcast',
    ])
  })

  it('builds data URIs for Moondream Station', () => {
    expect(toMoondreamDataUri(Buffer.from('abc'), 'image/jpeg')).toBe(
      'data:image/jpeg;base64,YWJj',
    )
    expect(imageMimeTypeFromPath('/tmp/frame.png')).toBe('image/png')
  })

  describe('queryMoondreamImage', () => {
    let tmpDir: string
    let imagePath: string

    beforeEach(async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'moondream-test-'))
      imagePath = path.join(tmpDir, 'frame_0001.jpg')
      await fs.writeFile(imagePath, Buffer.from('fake-jpeg'))
    })

    afterEach(async () => {
      await fs.rm(tmpDir, { recursive: true, force: true })
      vi.unstubAllGlobals()
    })

    it('posts image_url + question JSON to Moondream Station', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ answer: 'person, camera, blurred background' }),
      })
      vi.stubGlobal('fetch', fetchMock)

      const result = await queryMoondreamImage(imagePath, 'List: person visible.')

      expect(result.tags).toEqual(['person', 'camera', 'blurred background'])
      expect(fetchMock).toHaveBeenCalledOnce()

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
      expect(url).toMatch(/\/v1\/query$/)
      expect(init.method).toBe('POST')
      expect(init.headers).toEqual({ 'Content-Type': 'application/json' })

      const body = JSON.parse(String(init.body)) as {
        image_url: string
        question: string
        stream: boolean
      }
      expect(body.question).toBe('List: person visible.')
      expect(body.stream).toBe(false)
      expect(body.image_url).toMatch(/^data:image\/jpeg;base64,/)
    })

    it('throws on sidecar error', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: async () => 'model error',
        }),
      )

      await expect(queryMoondreamImage(imagePath, 'prompt')).rejects.toThrow(
        /Moondream sidecar failed \(500\)/,
      )
    })
  })
})
