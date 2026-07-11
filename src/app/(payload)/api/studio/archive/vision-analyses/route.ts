import { requireStudio } from '@/lib/studio/requireStudio'
import { applyVisionAnalysisImport } from '@/lib/studio/applyVisionAnalysisImport'
import { visionAnalysisImportSchema } from '@/lib/studio/archiveImportSchemas'

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

  const parsed = visionAnalysisImportSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 })
  }

  try {
    const results = await applyVisionAnalysisImport(payload, user, parsed.data)
    return Response.json({ ok: true, results })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return Response.json({ error: message }, { status: 412 })
  }
}
