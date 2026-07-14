import { requireStudio } from '@/lib/studio/requireStudio'
import { normalizeVideoMimeType } from '@/lib/artOfficial/mediaMime'
import {
  buildInboxRelativePath,
  getFieldNotesMaxUploadBytes,
  mediaAltFromInboxPath,
  toLocalFieldNoteUrl,
  writeInboxFile,
} from '@/lib/studio/fieldNoteLocalStorage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const { ok, payload, user } = await requireStudio()
  if (!ok || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json({ error: 'Invalid multipart body' }, { status: 400 })
  }

  const entry = formData.get('file')
  if (!(entry instanceof Blob)) {
    return Response.json({ error: 'Missing file' }, { status: 400 })
  }

  const maxBytes = getFieldNotesMaxUploadBytes()
  if (entry.size > maxBytes) {
    return Response.json({ error: `File exceeds ${maxBytes} byte limit` }, { status: 413 })
  }

  try {
    const bytes = Buffer.from(await entry.arrayBuffer())
    const originalName = entry instanceof File ? entry.name : 'upload'
    const relativePath = buildInboxRelativePath(originalName)
    await writeInboxFile(bytes, relativePath)

    const mimeType = entry.type
      ? normalizeVideoMimeType(entry.type)
      : 'application/octet-stream'

    const media = await payload.create({
      collection: 'media',
      data: {
        alt: mediaAltFromInboxPath(relativePath),
        filename: relativePath,
        mimeType,
        filesize: bytes.length,
        url: toLocalFieldNoteUrl(relativePath),
      },
      overrideAccess: false,
      user,
    })

    return Response.json({ id: media.id, relativePath })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save upload'
    return Response.json({ error: message }, { status: 500 })
  }
}
