import { z } from 'zod'

import { slugifyArtworkTitle } from '@/lib/artOfficial/quickUploadDerived'
import { requireStaff } from '@/lib/artOfficial/requireStaff'
import { localizedText } from '@/lib/artOfficial/seriesLabel'

/** Quick Upload series picker — not Payload's `/api/series` collection REST. */
export async function GET() {
  const { ok, payload, user } = await requireStaff()
  if (!ok || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await payload.find({
    collection: 'series',
    limit: 200,
    sort: 'name',
    depth: 0,
    locale: 'en',
    overrideAccess: false,
    user,
  })

  return Response.json({
    docs: result.docs.map((s) => ({
      id: s.id,
      name: localizedText(s.name),
      slug: s.slug,
    })),
  })
}

const createSeriesSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
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

  const parsed = createSeriesSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 })
  }

  const name = parsed.data.name.trim()
  const slug = parsed.data.slug?.trim() || slugifyArtworkTitle(name)

  try {
    const created = await payload.create({
      collection: 'series',
      data: {
        name,
        slug,
        status: 'published',
      },
      locale: 'en',
      overrideAccess: false,
      user,
    })

    return Response.json({
      id: created.id,
      name: localizedText(created.name),
      slug: created.slug,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not create series'
    return Response.json({ error: message }, { status: 412 })
  }
}
