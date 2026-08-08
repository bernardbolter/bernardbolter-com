import { requireStudio } from '@/lib/studio/requireStudio'
import { writeChunk } from '@/lib/studio/chunkedUpload'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { ok, user } = await requireStudio()
  if (!ok || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: uploadId } = await context.params
  const indexRaw = new URL(request.url).searchParams.get('index')
  const index = Number.parseInt(indexRaw ?? '', 10)
  if (!Number.isInteger(index) || index < 0) {
    return Response.json({ error: 'Missing or invalid chunk index' }, { status: 400 })
  }

  try {
    const bytes = Buffer.from(await request.arrayBuffer())
    const result = await writeChunk({
      uploadId,
      index,
      bytes,
      userId: user.id,
    })
    return Response.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to store chunk'
    const status = message.includes('not found') ? 404 : 400
    return Response.json({ error: message }, { status })
  }
}
