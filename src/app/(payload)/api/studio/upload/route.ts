import fs from 'node:fs/promises'
import path from 'node:path'

import { requireStudio } from '@/lib/studio/requireStudio'
import { resolveMediaMimeType } from '@/lib/artOfficial/mediaMime'
import { maybeTranscodeInboxVideo } from '@/lib/studio/ingestStudioVideo'
import {
  buildInboxRelativePath,
  createLocalFieldNoteMediaDoc,
  getFieldNotesMaxUploadBytes,
  getFieldNotesMediaRoot,
  mediaAltFromInboxPath,
  resolveAbsolutePathUnderRoot,
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

  let relativePath: string | null = null
  const root = getFieldNotesMediaRoot()

  try {
    const bytes = Buffer.from(await entry.arrayBuffer())
    const originalName = entry instanceof File ? entry.name : 'upload'
    const reportedType =
      typeof (entry as { type?: unknown }).type === 'string'
        ? ((entry as { type: string }).type || '').trim()
        : ''
    relativePath = buildInboxRelativePath(originalName)
    console.log(
      `[studio/upload] writing ${originalName} (${bytes.length} bytes) → ${relativePath}`,
    )
    await writeInboxFile(bytes, relativePath)

    let mimeType = resolveMediaMimeType(
      new File([bytes], originalName, { type: reportedType || undefined }),
    )

    if (mimeType.startsWith('video/')) {
      console.log(`[studio/upload] video received; checking whether to convert…`)
      const transcoded = await maybeTranscodeInboxVideo({
        root,
        relativePath,
        mimeType,
      })
      relativePath = transcoded.relativePath
      mimeType = transcoded.mimeType

      const media = await createLocalFieldNoteMediaDoc({
        payload,
        user,
        relativePath,
        mimeType,
        filesize: transcoded.filesize,
        alt: mediaAltFromInboxPath(relativePath),
      })

      console.log(`[studio/upload] media #${media.id} ready (${mimeType})`)
      return Response.json({
        id: media.id,
        relativePath,
        mimeType,
        transcoded: mimeType === 'video/mp4' && originalName.toLowerCase().endsWith('.mov'),
      })
    }

    const absolute = resolveAbsolutePathUnderRoot(root, relativePath)
    const filesize = (await fs.stat(absolute)).size

    const media = await createLocalFieldNoteMediaDoc({
      payload,
      user,
      relativePath,
      mimeType,
      filesize,
      alt: mediaAltFromInboxPath(relativePath),
    })

    return Response.json({ id: media.id, relativePath, mimeType })
  } catch (error) {
    if (relativePath) {
      try {
        const absolute = resolveAbsolutePathUnderRoot(root, relativePath)
        await fs.unlink(absolute)
        // If .mov was replaced by .mp4 mid-flight, also try the sibling mp4.
        const parsed = path.parse(relativePath)
        if (parsed.ext.toLowerCase() === '.mov') {
          const mp4Relative = path.posix.join(parsed.dir, `${parsed.name}.mp4`)
          await fs.unlink(resolveAbsolutePathUnderRoot(root, mp4Relative)).catch(() => {})
        }
      } catch {
        // Best-effort cleanup if media registration failed.
      }
    }
    const message = error instanceof Error ? error.message : 'Failed to save upload'
    return Response.json({ error: message }, { status: 500 })
  }
}
