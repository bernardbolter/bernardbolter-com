import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/studio/requireStudio', () => ({
  requireStudio: vi.fn(),
}))

import { requireStudio } from '@/lib/studio/requireStudio'
import { GET, POST } from '@/app/(payload)/api/studio/lines/route'

const requireStudioMock = vi.mocked(requireStudio)

describe('studio lines API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('GET returns 401 when not authenticated', async () => {
    requireStudioMock.mockResolvedValue({
      ok: false,
      payload: {} as never,
      user: null,
    })
    const response = await GET(new NextRequest('http://localhost:3000/api/studio/lines?q=light'))
    expect(response.status).toBe(401)
  })

  it('GET searches active lines', async () => {
    const find = vi.fn(async () => ({
      docs: [{ id: 1, name: 'Light on old surfaces' }],
    }))
    requireStudioMock.mockResolvedValue({
      ok: true,
      payload: { find } as never,
      user: { id: 1 } as never,
    })

    const response = await GET(new NextRequest('http://localhost:3000/api/studio/lines?q=light'))
    expect(response.status).toBe(200)
    const json = (await response.json()) as { docs: Array<{ id: number; name: string }> }
    expect(json.docs).toHaveLength(1)
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'lines',
        where: {
          and: [{ status: { equals: 'active' } }, { name: { contains: 'light' } }],
        },
      }),
    )
  })

  it('POST creates an active line', async () => {
    const create = vi.fn(async () => ({ id: 9, name: 'New investigation' }))
    requireStudioMock.mockResolvedValue({
      ok: true,
      payload: { create } as never,
      user: { id: 1 } as never,
    })

    const request = new NextRequest('http://localhost:3000/api/studio/lines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New investigation' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(200)
    const json = (await response.json()) as { id: number; name: string }
    expect(json).toEqual({ id: 9, name: 'New investigation' })
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'lines',
        data: expect.objectContaining({
          name: 'New investigation',
          status: 'active',
          recordOrigin: 'user',
        }),
      }),
    )
  })
})
