import { z } from 'zod'

import { runImageAnalysisStub } from '@/lib/artOfficial/imageAnalysisStub'
import { requireStaff } from '@/lib/artOfficial/requireStaff'

const bodySchema = z.object({
  mediaId: z.number().int().positive(),
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
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 })
  }

  const result = await runImageAnalysisStub({ mediaId: parsed.data.mediaId })
  return Response.json(result)
}
