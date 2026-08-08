import path from 'node:path'

import { requireStudio } from '@/lib/studio/requireStudio'
import type { Media } from '@/payload-types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { ok, payload, user } = await requireStudio()
  if (!ok || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: idRaw } = await context.params
  const id = Number.parseInt(idRaw, 10)
  if (!Number.isFinite(id) || id < 1) {
    return Response.json({ error: 'Invalid media id' }, { status: 400 })
  }

  try {
    const media = (await payload.findByID({
      collection: 'media',
      id,
      depth: 0,
      overrideAccess: false,
      user,
    })) as Media

    const filename = typeof media.filename === 'string' ? media.filename : ''
    const mimeType = typeof media.mimeType === 'string' ? media.mimeType : ''
    const ext = path.extname(filename).toLowerCase()
    const converting =
      ext === '.mov' ||
      mimeType === 'video/quicktime' ||
      mimeType.includes('hevc') ||
      mimeType.includes('h265')

    return Response.json({
      id: media.id,
      status: converting ? 'converting' : 'ready',
      mimeType,
      filename,
    })
  } catch {
    return Response.json({ error: 'Media not found' }, { status: 404 })
  }
}
