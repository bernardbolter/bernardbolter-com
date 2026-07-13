import fs from 'node:fs/promises'
import path from 'node:path'

import type { Payload } from 'payload'

import { fetchR2ObjectBufferFromUrl } from '@/lib/media/r2Object'

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

  if (!media.url) {
    throw new Error(`Media ${mediaFileId} has no url`)
  }

  const buffer = await fetchR2ObjectBufferFromUrl(media.url)
  const filename = media.filename?.trim() || `media-${mediaFileId}`
  const localPath = path.join(scratchDir, path.basename(filename))
  await fs.writeFile(localPath, buffer)
  return localPath
}
