import { z } from 'zod'

import { requireStudio } from '@/lib/studio/requireStudio'
import { createChunkUploadSession, STUDIO_CHUNK_SIZE_BYTES } from '@/lib/studio/chunkedUpload'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  totalBytes: z.number().int().positive(),
})

export async function POST(request: Request) {
  const { ok, user } = await requireStudio()
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

  try {
    const meta = await createChunkUploadSession({
      filename: parsed.data.filename,
      mimeType: parsed.data.contentType,
      totalBytes: parsed.data.totalBytes,
      userId: user.id,
    })
    return Response.json({
      uploadId: meta.uploadId,
      chunkSize: STUDIO_CHUNK_SIZE_BYTES,
      totalChunks: meta.totalChunks,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start upload'
    return Response.json({ error: message }, { status: 400 })
  }
}
