import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/studio/requireStudio', () => ({
  requireStudio: vi.fn(),
}))

vi.mock('@/lib/studio/r2', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/studio/r2')>()
  return {
    ...actual,
    createPresignedPutUrl: vi.fn(async () => 'https://r2.example/presigned'),
    getPublicUrlForObjectKey: vi.fn(
      () => 'https://cdn.example/field-notes/2026/05/test.jpg',
    ),
    buildFieldNoteObjectKey: vi.fn(() => 'field-notes/2026/05/uuid-test.jpg'),
  }
})

import { requireStudio } from '@/lib/studio/requireStudio'
import { POST } from '@/app/(payload)/api/studio/upload-url/route'

const requireStudioMock = vi.mocked(requireStudio)

describe('POST /api/studio/upload-url', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    requireStudioMock.mockResolvedValue({
      ok: false,
      payload: {} as never,
      user: null,
    })

    const request = new NextRequest('http://localhost:3000/api/studio/upload-url', {
      method: 'POST',
      body: JSON.stringify({ filename: 'a.jpg', contentType: 'image/jpeg' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  it('returns presigned payload for valid body', async () => {
    requireStudioMock.mockResolvedValue({
      ok: true,
      payload: {} as never,
      user: { id: 1 } as never,
    })

    const request = new NextRequest('http://localhost:3000/api/studio/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: 'a.jpg', contentType: 'image/jpeg' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(200)
    const json = (await response.json()) as {
      uploadUrl: string
      objectKey: string
      publicUrl: string
    }
    expect(json.uploadUrl).toBe('https://r2.example/presigned')
    expect(json.objectKey).toMatch(/^field-notes\//)
    expect(json.publicUrl).toContain('field-notes')
  })
})
