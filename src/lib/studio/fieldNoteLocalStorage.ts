import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import type { Payload, TypedUser } from 'payload'

import {
  INBOX_PREFIX,
  isLocalFieldNoteMedia,
  resolveLocalFieldNoteRelativePath,
  toLocalFieldNoteUrl,
} from '@/lib/studio/fieldNoteLocalPaths'
import { mediaAltFromObjectKey, sanitizeUploadFilename } from '@/lib/studio/r2'

export {
  FIELDNOTE_LOCAL_URL_PREFIX,
  INBOX_PREFIX,
  isLocalFieldNoteMedia,
  resolveLocalFieldNoteRelativePath,
  resolveMediaStorageUrl,
  studioLocalMediaApiPath,
  toLocalFieldNoteUrl,
} from '@/lib/studio/fieldNoteLocalPaths'

const DEFAULT_MAX_UPLOAD_BYTES = 500 * 1024 * 1024

export function getFieldNotesMediaRoot(): string {
  const root = process.env.FIELDNOTES_MEDIA_ROOT?.trim()
  if (root) return path.resolve(root)
  return path.join(os.homedir(), 'data', 'fieldnotes')
}

export function getFieldNotesMaxUploadBytes(): number {
  const raw = process.env.FIELDNOTES_MAX_UPLOAD_BYTES?.trim()
  if (!raw) return DEFAULT_MAX_UPLOAD_BYTES
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_UPLOAD_BYTES
}

/** `inbox/{YYYY}/{MM}/{uuid}-{filename}` */
export function buildInboxRelativePath(filename: string, now = new Date()): string {
  const year = String(now.getUTCFullYear())
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const safeName = sanitizeUploadFilename(filename)
  return `${INBOX_PREFIX}${year}/${month}/${crypto.randomUUID()}-${safeName}`
}

export function resolveAbsolutePathUnderRoot(root: string, relativePath: string): string {
  const resolvedRoot = path.resolve(root)
  const absolute = path.resolve(resolvedRoot, relativePath)
  if (absolute !== resolvedRoot && !absolute.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error('Invalid local media path')
  }
  return absolute
}

export async function writeInboxFile(bytes: Buffer, relativePath: string): Promise<string> {
  if (!relativePath.startsWith(INBOX_PREFIX)) {
    throw new Error('Inbox path must start with inbox/')
  }

  const root = getFieldNotesMediaRoot()
  const absolute = resolveAbsolutePathUnderRoot(root, relativePath)
  await fs.mkdir(path.dirname(absolute), { recursive: true })
  await fs.writeFile(absolute, bytes)
  return relativePath
}

export function mediaAltFromInboxPath(relativePath: string): string {
  return mediaAltFromObjectKey(relativePath)
}

/** Register an inbox file already on disk as a Payload media doc (no re-upload). */
export async function createLocalFieldNoteMediaDoc(args: {
  payload: Payload
  user: TypedUser
  relativePath: string
  mimeType: string
  filesize: number
  alt: string
}) {
  if (!args.relativePath.startsWith(INBOX_PREFIX)) {
    throw new Error('relativePath must start with inbox/')
  }

  return args.payload.create({
    collection: 'media',
    data: {
      alt: args.alt,
      filename: args.relativePath,
      mimeType: args.mimeType,
      filesize: args.filesize,
    },
    overrideAccess: false,
    user: args.user,
  })
}
