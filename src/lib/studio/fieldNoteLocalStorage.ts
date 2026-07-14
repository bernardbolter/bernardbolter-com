import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { mediaAltFromObjectKey, sanitizeUploadFilename } from '@/lib/studio/r2'

export const FIELDNOTE_LOCAL_URL_PREFIX = 'fieldnote-local:'
export const INBOX_PREFIX = 'inbox/'

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

export function toLocalFieldNoteUrl(relativePath: string): string {
  return `${FIELDNOTE_LOCAL_URL_PREFIX}${relativePath}`
}

export function isLocalFieldNoteMedia(media: {
  url?: string | null
  filename?: string | null
}): boolean {
  if (media.url?.startsWith(FIELDNOTE_LOCAL_URL_PREFIX)) return true
  return Boolean(media.filename?.startsWith(INBOX_PREFIX))
}

export function resolveLocalFieldNoteRelativePath(media: {
  url?: string | null
  filename?: string | null
}): string {
  if (media.url?.startsWith(FIELDNOTE_LOCAL_URL_PREFIX)) {
    return media.url.slice(FIELDNOTE_LOCAL_URL_PREFIX.length)
  }
  if (media.filename?.startsWith(INBOX_PREFIX)) {
    return media.filename
  }
  throw new Error('Not a local field note media path')
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
