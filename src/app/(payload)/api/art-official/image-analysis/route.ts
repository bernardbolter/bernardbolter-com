import { z } from 'zod'

import { runImageAnalysis } from '@/lib/artOfficial/runImageAnalysis'
import { requireStaff } from '@/lib/artOfficial/requireStaff'

const bodySchema = z.object({
  mediaId: z.number().int().positive(),
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
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 })
  }

  try {
    const result = await runImageAnalysis({
      mediaId: parsed.data.mediaId,
      payload,
      user,
    })
    return Response.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Image analysis failed'
    return Response.json({ error: message }, { status: 500 })
  }
}
