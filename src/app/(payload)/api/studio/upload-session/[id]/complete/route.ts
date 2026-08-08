import fs from 'node:fs/promises'

import { requireStudio } from '@/lib/studio/requireStudio'
import { resolveMediaMimeType } from '@/lib/artOfficial/mediaMime'
import {
  scheduleInboxVideoTranscode,
  shouldConvertInboxVideo,
} from '@/lib/studio/backgroundTranscode'
import {
  assembleChunkUpload,
  cleanupChunkUpload,
  readChunkUploadMeta,
} from '@/lib/studio/chunkedUpload'
import {
  buildInboxRelativePath,
  createLocalFieldNoteMediaDoc,
  getFieldNotesMediaRoot,
  mediaAltFromInboxPath,
  resolveAbsolutePathUnderRoot,
} from '@/lib/studio/fieldNoteLocalStorage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { ok, payload, user } = await requireStudio()
  if (!ok || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: uploadId } = await context.params
  let relativePath: string | null = null
  const root = getFieldNotesMediaRoot()

  try {
    const meta = await readChunkUploadMeta(uploadId)
    if (meta.userId !== user.id) {
      return Response.json({ error: 'Upload session not found' }, { status: 404 })
    }

    relativePath = buildInboxRelativePath(meta.filename)
    console.log(
      `[studio/upload-session] assembling ${meta.filename} (${meta.totalBytes} bytes) → ${relativePath}`,
    )

    const assembled = await assembleChunkUpload({
      uploadId,
      userId: user.id,
      destinationRelativePath: relativePath,
    })

    const mimeType = resolveMediaMimeType(
      new File([new Uint8Array()], meta.filename, { type: assembled.mimeType || undefined }),
    )
    const absolute = resolveAbsolutePathUnderRoot(root, relativePath)

    const media = await createLocalFieldNoteMediaDoc({
      payload,
      user,
      relativePath,
      mimeType,
      filesize: assembled.filesize,
      alt: mediaAltFromInboxPath(relativePath),
    })

    let converting = false
    if (mimeType.startsWith('video/')) {
      converting = await shouldConvertInboxVideo(absolute, mimeType)
      if (converting) {
        await scheduleInboxVideoTranscode({
          mediaId: media.id,
          relativePath,
          mimeType,
        })
      }
    }

    await cleanupChunkUpload(uploadId).catch(() => {})

    console.log(
      `[studio/upload-session] media #${media.id} ready (${mimeType}${converting ? ', converting' : ''})`,
    )
    return Response.json({
      id: media.id,
      relativePath,
      mimeType,
      converting,
    })
  } catch (error) {
    if (relativePath) {
      try {
        await fs.unlink(resolveAbsolutePathUnderRoot(root, relativePath))
      } catch {
        // best-effort
      }
    }
    const message = error instanceof Error ? error.message : 'Failed to complete upload'
    const status = message.includes('not found') ? 404 : 500
    return Response.json({ error: message }, { status })
  }
}
