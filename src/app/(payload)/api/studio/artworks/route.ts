import { z } from 'zod'

import { createStudioArtwork } from '@/lib/studio/artworks'
import { requireStudio } from '@/lib/studio/requireStudio'

const bodySchema = z.object({
  title: z.string().min(1),
  medium: z.string().optional(),
  seriesId: z.number().int().positive().optional(),
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
    const artwork = await createStudioArtwork(payload, user, parsed.data)
    return Response.json({ id: artwork.id, slug: artwork.slug })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create painting'
    return Response.json({ error: message }, { status: 500 })
  }
}
