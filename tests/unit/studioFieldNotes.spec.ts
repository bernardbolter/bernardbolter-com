import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/studio/requireStudio', () => ({
  requireStudio: vi.fn(),
}))

vi.mock('@/lib/studio/queueProcessFieldNote', () => ({
  queueProcessFieldNote: vi.fn(),
}))

import { requireStudio } from '@/lib/studio/requireStudio'
import { queueProcessFieldNote } from '@/lib/studio/queueProcessFieldNote'
import { POST } from '@/app/(payload)/api/studio/field-notes/route'

const requireStudioMock = vi.mocked(requireStudio)
const queueMock = vi.mocked(queueProcessFieldNote)

describe('POST /api/studio/field-notes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    requireStudioMock.mockResolvedValue({
      ok: false,
      payload: {} as never,
      user: null,
    })

    const request = new NextRequest('http://localhost:3000/api/studio/field-notes', {
      method: 'POST',
      body: JSON.stringify({ mediaType: 'text', writtenNote: 'hello' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  it('creates a text field note and queues processing', async () => {
    const create = vi.fn(async () => ({
      id: 42,
      processingStatus: 'pending',
    }))
    requireStudioMock.mockResolvedValue({
      ok: true,
      payload: { create } as never,
      user: { id: 1 } as never,
    })

    const request = new NextRequest('http://localhost:3000/api/studio/field-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mediaType: 'text',
        writtenNote: 'Quick studio note',
        lines: [3],
        register: 'exploratory',
      }),
    })
    const response = await POST(request)
    expect(response.status).toBe(200)
    const json = (await response.json()) as { id: number; processingStatus: string }
    expect(json).toEqual({ id: 42, processingStatus: 'pending' })
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'field-notes',
        data: expect.objectContaining({
          mediaType: 'text',
          writtenNote: 'Quick studio note',
          lines: [3],
          register: 'exploratory',
          processingStatus: 'pending',
          recordOrigin: 'user',
        }),
      }),
    )
    expect(queueMock).toHaveBeenCalledWith(42)
  })
})
