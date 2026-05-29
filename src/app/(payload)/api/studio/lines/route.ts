import { z } from 'zod'

import { requireStudio } from '@/lib/studio/requireStudio'

const createLineSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
})

export async function GET(request: Request) {
  const { ok, payload, user } = await requireStudio()
  if (!ok || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const q = new URL(request.url).searchParams.get('q')?.trim() ?? ''

  const result = await payload.find({
    collection: 'lines',
    limit: 10,
    depth: 0,
    overrideAccess: false,
    user,
    where: {
      and: [
        { status: { equals: 'active' } },
        ...(q ? [{ name: { contains: q } }] : []),
      ],
    },
    sort: 'name',
  })

  return Response.json({
    docs: result.docs.map((line) => ({ id: line.id, name: line.name })),
  })
}

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

  const parsed = createLineSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 })
  }

  const line = await payload.create({
    collection: 'lines',
    data: {
      name: parsed.data.name.trim(),
      description: parsed.data.description,
      status: 'active',
      recordOrigin: 'user',
    },
    overrideAccess: false,
    user,
  })

  return Response.json({ id: line.id, name: line.name })
}
