import { z } from 'zod'

import { createStudioEpisode } from '@/lib/studio/episodes'
import { requireStudio } from '@/lib/studio/requireStudio'

const bodySchema = z.object({
  title: z.string().min(1),
  series: z.enum(['outsider-art-review', 'rap-critic', 'studio-fails', 'studio-series']),
  concept: z.string().optional(),
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

  try {
    const episode = await createStudioEpisode(payload, user, parsed.data)
    return Response.json({ id: episode.id })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create episode'
    return Response.json({ error: message }, { status: 500 })
  }
}
