import { z } from 'zod'

import { createRemoteMediaDoc } from '@/lib/artOfficial/createRemoteMediaDoc'
import { normalizeVideoMimeType } from '@/lib/artOfficial/mediaMime'
import { requireStaff } from '@/lib/artOfficial/requireStaff'
import { mediaAltFromObjectKey } from '@/lib/studio/r2'

const bodySchema = z.object({
  objectKey: z.string().min(1),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().int().nonnegative(),
  alt: z.string().optional(),
})

export async function POST(request: Request) {
  const { ok, payload, user } = await requireStaff()
  if (!ok || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 })
  }

  if (!parsed.data.objectKey.startsWith('art-official-media/')) {
    return Response.json({ error: 'Invalid object key' }, { status: 400 })
  }

  if (!parsed.data.mimeType.startsWith('video/')) {
    return Response.json({ error: 'mimeType must be a video type' }, { status: 400 })
  }

  const mimeType = normalizeVideoMimeType(parsed.data.mimeType)

  try {
    const alt =
      parsed.data.alt?.trim() ||
      mediaAltFromObjectKey(parsed.data.objectKey) ||
      parsed.data.filename.replace(/\.[^.]+$/, '')

    const media = await createRemoteMediaDoc({
      payload,
      user,
      objectKey: parsed.data.objectKey,
      mimeType,
      filesize: parsed.data.size,
      alt,
    })

    return Response.json({ id: media.id })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to register upload'
    return Response.json({ error: message }, { status: 500 })
  }
}
