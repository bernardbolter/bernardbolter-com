import { createRemoteMediaDoc } from '@/lib/artOfficial/createRemoteMediaDoc'
import { formatPayloadValidationError } from '@/lib/artOfficial/formatPayloadValidationError'
import { resolveMediaMimeType } from '@/lib/artOfficial/mediaMime'
import { buildArtOfficialMediaObjectKey } from '@/lib/artOfficial/r2Media'
import { requireStaff } from '@/lib/artOfficial/requireStaff'
import { mediaAltFromObjectKey, putBufferToR2 } from '@/lib/studio/r2'

export async function POST(request: Request) {
  const { ok, payload, user } = await requireStaff()
  if (!ok || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: 'file is required' }, { status: 400 })
  }

  const mimeType = resolveMediaMimeType(file)
  if (!mimeType.startsWith('video/')) {
    return Response.json({ error: 'Only video files are accepted' }, { status: 400 })
  }

  const altField = formData.get('alt')
  const altFromForm = typeof altField === 'string' ? altField.trim() : ''

  try {
    const objectKey = buildArtOfficialMediaObjectKey(file.name)
    const buffer = Buffer.from(await file.arrayBuffer())
    await putBufferToR2(objectKey, buffer, mimeType)

    const alt =
      altFromForm ||
      mediaAltFromObjectKey(objectKey) ||
      file.name.replace(/\.[^.]+$/, '').trim() ||
      'Artwork video'

    const media = await createRemoteMediaDoc({
      payload,
      user,
      objectKey,
      mimeType,
      filesize: file.size,
      alt,
    })

    return Response.json({ id: media.id })
  } catch (error) {
    const message =
      formatPayloadValidationError(error) ??
      (error instanceof Error ? error.message : 'Video upload failed')
    return Response.json({ error: message }, { status: 500 })
  }
}
