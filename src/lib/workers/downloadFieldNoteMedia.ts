import fs from 'node:fs/promises'
import path from 'node:path'

import type { Payload } from 'payload'

import { fetchR2ObjectBufferFromUrl } from '@/lib/media/r2Object'
import {
  getFieldNotesMediaRoot,
  isLocalFieldNoteMedia,
  resolveAbsolutePathUnderRoot,
  resolveLocalFieldNoteRelativePath,
} from '@/lib/studio/fieldNoteLocalStorage'

export async function downloadMediaFileToScratch(
  payload: Payload,
  mediaFileId: number,
  scratchDir: string,
): Promise<string> {
  const media = await payload.findByID({
    collection: 'media',
    id: mediaFileId,
    depth: 0,
    overrideAccess: true,
  })

  const filename = media.filename?.trim() || `media-${mediaFileId}`
  const scratchPath = path.join(scratchDir, path.basename(filename))

  if (isLocalFieldNoteMedia(media)) {
    const relativePath = resolveLocalFieldNoteRelativePath(media)
    const sourcePath = resolveAbsolutePathUnderRoot(getFieldNotesMediaRoot(), relativePath)
    await fs.copyFile(sourcePath, scratchPath)
    return scratchPath
  }

  if (!media.url) {
    throw new Error(`Media ${mediaFileId} has no url`)
  }

  const buffer = await fetchR2ObjectBufferFromUrl(media.url)
  await fs.writeFile(scratchPath, buffer)
  return scratchPath
}
