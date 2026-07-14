// @vitest-environment node

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/studio/requireStudio', () => ({
  requireStudio: vi.fn(),
}))

vi.mock('@/lib/studio/fieldNoteLocalStorage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/studio/fieldNoteLocalStorage')>()
  return {
    ...actual,
    buildInboxRelativePath: vi.fn(() => 'inbox/2026/07/uuid-test.jpg'),
    writeInboxFile: vi.fn(async () => 'inbox/2026/07/uuid-test.jpg'),
    getFieldNotesMaxUploadBytes: vi.fn(() => 1024 * 1024),
  }
})

import { requireStudio } from '@/lib/studio/requireStudio'
import { POST } from '@/app/(payload)/api/studio/upload/route'

const requireStudioMock = vi.mocked(requireStudio)

describe('POST /api/studio/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    requireStudioMock.mockResolvedValue({
      ok: false,
      payload: {} as never,
      user: null,
    })

    const formData = new FormData()
    formData.append('file', new File(['x'], 'a.jpg', { type: 'image/jpeg' }))

    const request = new NextRequest('http://localhost:3000/api/studio/upload', {
      method: 'POST',
      body: formData,
    })
    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  it('creates media for a multipart upload', async () => {
    const create = vi.fn(async () => ({ id: 9 }))
    requireStudioMock.mockResolvedValue({
      ok: true,
      payload: { create } as never,
      user: { id: 1 } as never,
    })

    const formData = new FormData()
    formData.append('file', new File(['bytes'], 'clip.mp4', { type: 'video/mp4' }))

    const request = new NextRequest('http://localhost:3000/api/studio/upload', {
      method: 'POST',
      body: formData,
    })
    const response = await POST(request)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      id: 9,
      relativePath: 'inbox/2026/07/uuid-test.jpg',
    })
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'media',
        data: expect.objectContaining({
          filename: 'inbox/2026/07/uuid-test.jpg',
          mimeType: 'video/mp4',
          url: 'fieldnote-local:inbox/2026/07/uuid-test.jpg',
        }),
      }),
    )
  })
})
