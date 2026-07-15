/**
 * Create a field note for an inbox file that uploaded to disk but never got a note.
 *
 * Usage:
 *   npx tsx src/scripts/recoverOrphanInboxFieldNote.ts inbox/2026/07/uuid-file.mov
 *   npx tsx src/scripts/recoverOrphanInboxFieldNote.ts --latest
 */
import fs from 'node:fs/promises'
import path from 'node:path'

import dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

import { getPayload } from 'payload'

import config from '@payload-config'
import { isArtistOrAdmin } from '@/access/isArtistOrAdmin'
import { buildFieldNoteCreateData } from '@/lib/studio/applyCapturePreset'
import {
  INBOX_PREFIX,
  getFieldNotesMediaRoot,
  mediaAltFromInboxPath,
  resolveAbsolutePathUnderRoot,
  createLocalFieldNoteMediaDoc,
} from '@/lib/studio/fieldNoteLocalStorage'
import { normalizeVideoMimeType } from '@/lib/artOfficial/mediaMime'
import { queueProcessFieldNote } from '@/lib/studio/queueProcessFieldNote'
import type { User } from '@/payload-types'

function mimeTypeFromPath(relativePath: string): string {
  switch (path.extname(relativePath).toLowerCase()) {
    case '.mov':
      return 'video/quicktime'
    case '.mp4':
      return 'video/mp4'
    case '.webm':
      return 'video/webm'
    case '.m4a':
      return 'audio/mp4'
    case '.mp3':
      return 'audio/mpeg'
    case '.wav':
      return 'audio/wav'
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.png':
      return 'image/png'
    default:
      return 'application/octet-stream'
  }
}

function inferMediaType(relativePath: string, mimeType: string) {
  if (mimeType.startsWith('image/')) return 'photo' as const
  if (mimeType.startsWith('audio/')) return 'voice-memo' as const
  if (mimeType.startsWith('video/')) return 'video-broll' as const
  if (relativePath.toLowerCase().endsWith('.mov')) return 'video-broll' as const
  return 'photo' as const
}

async function findStaffUser(payload: Awaited<ReturnType<typeof getPayload>>): Promise<User> {
  const { docs } = await payload.find({
    collection: 'users',
    limit: 50,
    depth: 0,
    overrideAccess: true,
  })
  const staff = docs.find((doc) => isArtistOrAdmin(doc))
  if (!staff) {
    throw new Error('No admin/artist user found for recovery')
  }
  return staff
}

async function resolveRelativePath(arg: string): Promise<string> {
  if (arg !== '--latest') {
    if (!arg.startsWith(INBOX_PREFIX)) {
      throw new Error(`Path must start with ${INBOX_PREFIX}`)
    }
    return arg
  }

  const inboxDir = path.join(getFieldNotesMediaRoot(), 'inbox')
  let latest: { relativePath: string; mtimeMs: number } | null = null

  async function walk(dir: string, prefix: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      const rel = `${prefix}${entry.name}`
      if (entry.isDirectory()) {
        await walk(full, `${rel}/`)
      } else if (entry.isFile()) {
        const stat = await fs.stat(full)
        if (!latest || stat.mtimeMs > latest.mtimeMs) {
          latest = { relativePath: rel, mtimeMs: stat.mtimeMs }
        }
      }
    }
  }

  await walk(inboxDir, INBOX_PREFIX)
  if (!latest) {
    throw new Error('No inbox files found')
  }
  return latest.relativePath
}

async function main() {
  const arg = process.argv[2]
  if (!arg) {
    console.error('Usage: recoverOrphanInboxFieldNote.ts <inbox/...> | --latest')
    process.exit(1)
  }

  const relativePath = await resolveRelativePath(arg)
  const absolute = resolveAbsolutePathUnderRoot(getFieldNotesMediaRoot(), relativePath)
  const stat = await fs.stat(absolute)
  const mimeType = normalizeVideoMimeType(mimeTypeFromPath(relativePath))

  const payload = await getPayload({ config })
  const user = await findStaffUser(payload)

  const existingMedia = await payload.find({
    collection: 'media',
    where: { filename: { equals: relativePath } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  let mediaId = existingMedia.docs[0]?.id
  if (!mediaId) {
    const media = await createLocalFieldNoteMediaDoc({
      payload,
      user,
      relativePath,
      mimeType,
      filesize: stat.size,
      alt: mediaAltFromInboxPath(relativePath),
    })
    mediaId = media.id
    console.log(`Created media #${mediaId}`)
  } else {
    console.log(`Reusing media #${mediaId}`)
  }

  const linked = await payload.find({
    collection: 'field-notes',
    where: { mediaFile: { equals: mediaId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (linked.docs[0]) {
    console.log(`Field note already exists: #${linked.docs[0].id}`)
    process.exit(0)
  }

  const fieldNote = await payload.create({
    collection: 'field-notes',
    data: buildFieldNoteCreateData({
      mediaType: inferMediaType(relativePath, mimeType),
      mediaFileId: mediaId,
    }),
    overrideAccess: false,
    user,
  })

  try {
    await queueProcessFieldNote(fieldNote.id)
  } catch (error) {
    console.warn('Queue enqueue failed (note still created):', error)
  }

  console.log(`Created field note #${fieldNote.id} (${fieldNote.processingStatus})`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
