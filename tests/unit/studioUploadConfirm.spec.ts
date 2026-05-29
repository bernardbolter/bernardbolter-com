import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/studio/requireStudio', () => ({
  requireStudio: vi.fn(),
}))

vi.mock('@/lib/studio/r2', () => ({
  getPublicUrlForObjectKey: vi.fn(() => 'https://cdn.example/field-notes/2026/05/a.jpg'),
  mediaAltFromObjectKey: vi.fn(() => 'a'),
}))

import { requireStudio } from '@/lib/studio/requireStudio'
import { POST } from '@/app/(payload)/api/studio/upload-confirm/route'

const requireStudioMock = vi.mocked(requireStudio)

describe('POST /api/studio/upload-confirm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('registers media for a field-notes object key', async () => {
    const create = vi.fn(async () => ({ id: 7 }))
    requireStudioMock.mockResolvedValue({
      ok: true,
      payload: { create } as never,
      user: { id: 1 } as never,
    })

    const request = new NextRequest('http://localhost:3000/api/studio/upload-confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        objectKey: 'field-notes/2026/05/uuid-photo.jpg',
        filename: 'photo.jpg',
        mimeType: 'image/jpeg',
        size: 1200,
      }),
    })
    const response = await POST(request)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ id: 7 })
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'media',
        data: expect.objectContaining({
          filename: 'field-notes/2026/05/uuid-photo.jpg',
          mimeType: 'image/jpeg',
          filesize: 1200,
        }),
      }),
    )
  })

  it('rejects keys outside field-notes prefix', async () => {
    requireStudioMock.mockResolvedValue({
      ok: true,
      payload: { create: vi.fn() } as never,
      user: { id: 1 } as never,
    })

    const request = new NextRequest('http://localhost:3000/api/studio/upload-confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        objectKey: 'media/other.jpg',
        filename: 'other.jpg',
        mimeType: 'image/jpeg',
        size: 1,
      }),
    })
    const response = await POST(request)
    expect(response.status).toBe(400)
  })
})
