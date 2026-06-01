import { z } from 'zod'

import { requireStaff } from '@/lib/artOfficial/requireStaff'
import { recomputeTimeline } from '@/lib/artOfficial/recomputeTimeline'

const bodySchema = z.object({
  seriesId: z.number().int().positive().optional(),
  seriesSlug: z.string().min(1).optional(),
})

export async function POST(request: Request) {
  const { ok, payload, user } = await requireStaff()
  if (!ok || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown = {}
  try {
    body = await request.json()
  } catch {
    // empty body is fine — recompute all works with sortIndex
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 })
  }

  const result = await recomputeTimeline(payload, {
    user,
    seriesId: parsed.data.seriesId,
    seriesSlug: parsed.data.seriesSlug,
  })

  return Response.json({ ok: true, ...result })
}
