import { z } from 'zod'

import { buildArtOfficialMediaObjectKey } from '@/lib/artOfficial/r2Media'
import { requireStaff } from '@/lib/artOfficial/requireStaff'
import { createPresignedPutUrl, getPublicUrlForObjectKey } from '@/lib/studio/r2'

const bodySchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
})

export async function POST(request: Request) {
  const { ok } = await requireStaff()
  if (!ok) {
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

  if (!parsed.data.contentType.startsWith('video/')) {
    return Response.json({ error: 'This endpoint is for video uploads only.' }, { status: 400 })
  }

  try {
    const objectKey = buildArtOfficialMediaObjectKey(parsed.data.filename)
    const uploadUrl = await createPresignedPutUrl(objectKey, parsed.data.contentType)
    const publicUrl = getPublicUrlForObjectKey(objectKey)

    return Response.json({ uploadUrl, objectKey, publicUrl })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create upload URL'
    return Response.json({ error: message }, { status: 500 })
  }
}
