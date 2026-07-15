import { requireStudio } from '@/lib/studio/requireStudio'
import { applyEnvelopeImport } from '@/lib/studio/applyEnvelopeImport'
import { envelopeImportSchema } from '@/lib/studio/archiveImportSchemas'

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

  const parsed = envelopeImportSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 })
  }

  const results = await applyEnvelopeImport(payload, user, parsed.data)
  const failed = results.filter((row) => row.status === 'failed')
  return Response.json(
    { ok: failed.length === 0, results },
    { status: failed.length === results.length ? 412 : 200 },
  )
}
