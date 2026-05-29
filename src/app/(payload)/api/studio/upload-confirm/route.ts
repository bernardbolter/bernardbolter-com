import { z } from 'zod'

import { requireStudio } from '@/lib/studio/requireStudio'
import { getPublicUrlForObjectKey, mediaAltFromObjectKey } from '@/lib/studio/r2'

const bodySchema = z.object({
  objectKey: z.string().min(1),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().int().nonnegative(),
})

export async function POST(request: Request) {
  const { ok, payload, user } = await requireStudio()
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

  if (!parsed.data.objectKey.startsWith('field-notes/')) {
    return Response.json({ error: 'Invalid object key' }, { status: 400 })
  }

  try {
    const publicUrl = getPublicUrlForObjectKey(parsed.data.objectKey)
    const media = await payload.create({
      collection: 'media',
      data: {
        alt: mediaAltFromObjectKey(parsed.data.objectKey),
        filename: parsed.data.objectKey,
        mimeType: parsed.data.mimeType,
        filesize: parsed.data.size,
        url: publicUrl,
      },
      overrideAccess: false,
      user,
    })

    return Response.json({ id: media.id })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to register upload'
    return Response.json({ error: message }, { status: 500 })
  }
}
