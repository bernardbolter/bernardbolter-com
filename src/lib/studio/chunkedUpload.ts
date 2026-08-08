import fs from 'node:fs/promises'
import path from 'node:path'

import { sanitizeUploadFilename } from '@/lib/studio/r2'
import {
  getFieldNotesMaxUploadBytes,
  getFieldNotesMediaRoot,
  resolveAbsolutePathUnderRoot,
} from '@/lib/studio/fieldNoteLocalStorage'

export const CHUNK_UPLOAD_PREFIX = 'tmp-uploads/'
/** Small enough to finish through Cloudflare before proxy timeouts. */
export const STUDIO_CHUNK_SIZE_BYTES = 2 * 1024 * 1024

export type ChunkUploadMeta = {
  uploadId: string
  filename: string
  mimeType: string
  totalBytes: number
  chunkSize: number
  totalChunks: number
  createdAt: string
  userId: number
}

function uploadsRoot(): string {
  return path.join(getFieldNotesMediaRoot(), CHUNK_UPLOAD_PREFIX.replace(/\/$/, ''))
}

export function chunkUploadDir(uploadId: string): string {
  if (!/^[0-9a-f-]{36}$/i.test(uploadId)) {
    throw new Error('Invalid upload id')
  }
  return path.join(uploadsRoot(), uploadId)
}

export function chunkFilePath(uploadId: string, index: number): string {
  if (!Number.isInteger(index) || index < 0) {
    throw new Error('Invalid chunk index')
  }
  return path.join(chunkUploadDir(uploadId), 'chunks', String(index).padStart(6, '0'))
}

export function metaFilePath(uploadId: string): string {
  return path.join(chunkUploadDir(uploadId), 'meta.json')
}

export async function createChunkUploadSession(args: {
  filename: string
  mimeType: string
  totalBytes: number
  userId: number
}): Promise<ChunkUploadMeta> {
  const maxBytes = getFieldNotesMaxUploadBytes()
  if (args.totalBytes <= 0 || args.totalBytes > maxBytes) {
    throw new Error(`File size must be between 1 and ${maxBytes} bytes`)
  }

  const uploadId = crypto.randomUUID()
  const chunkSize = STUDIO_CHUNK_SIZE_BYTES
  const totalChunks = Math.ceil(args.totalBytes / chunkSize)
  const meta: ChunkUploadMeta = {
    uploadId,
    filename: sanitizeUploadFilename(args.filename),
    mimeType: args.mimeType || 'application/octet-stream',
    totalBytes: args.totalBytes,
    chunkSize,
    totalChunks,
    createdAt: new Date().toISOString(),
    userId: args.userId,
  }

  const dir = chunkUploadDir(uploadId)
  await fs.mkdir(path.join(dir, 'chunks'), { recursive: true })
  await fs.writeFile(metaFilePath(uploadId), JSON.stringify(meta), 'utf8')
  return meta
}

export async function readChunkUploadMeta(uploadId: string): Promise<ChunkUploadMeta> {
  const raw = await fs.readFile(metaFilePath(uploadId), 'utf8')
  return JSON.parse(raw) as ChunkUploadMeta
}

export async function writeChunk(args: {
  uploadId: string
  index: number
  bytes: Buffer
  userId: number
}): Promise<{ receivedBytes: number; totalBytes: number; index: number }> {
  const meta = await readChunkUploadMeta(args.uploadId)
  if (meta.userId !== args.userId) {
    throw new Error('Upload session not found')
  }
  if (args.index < 0 || args.index >= meta.totalChunks) {
    throw new Error('Chunk index out of range')
  }

  const expected =
    args.index === meta.totalChunks - 1
      ? meta.totalBytes - meta.chunkSize * (meta.totalChunks - 1)
      : meta.chunkSize
  if (args.bytes.length !== expected) {
    throw new Error(`Chunk ${args.index} expected ${expected} bytes, got ${args.bytes.length}`)
  }

  const filePath = chunkFilePath(args.uploadId, args.index)
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, args.bytes)

  return {
    index: args.index,
    receivedBytes: args.bytes.length,
    totalBytes: meta.totalBytes,
  }
}

export async function assembleChunkUpload(args: {
  uploadId: string
  userId: number
  destinationRelativePath: string
}): Promise<{ filesize: number; mimeType: string; filename: string }> {
  const meta = await readChunkUploadMeta(args.uploadId)
  if (meta.userId !== args.userId) {
    throw new Error('Upload session not found')
  }

  const root = getFieldNotesMediaRoot()
  const absolute = resolveAbsolutePathUnderRoot(root, args.destinationRelativePath)
  await fs.mkdir(path.dirname(absolute), { recursive: true })

  const handle = await fs.open(absolute, 'w')
  try {
    for (let i = 0; i < meta.totalChunks; i++) {
      const chunkPath = chunkFilePath(args.uploadId, i)
      const bytes = await fs.readFile(chunkPath)
      await handle.write(bytes)
    }
  } finally {
    await handle.close()
  }

  const stat = await fs.stat(absolute)
  if (stat.size !== meta.totalBytes) {
    throw new Error(`Assembled size ${stat.size} does not match expected ${meta.totalBytes}`)
  }

  return {
    filesize: stat.size,
    mimeType: meta.mimeType,
    filename: meta.filename,
  }
}

export async function cleanupChunkUpload(uploadId: string): Promise<void> {
  await fs.rm(chunkUploadDir(uploadId), { recursive: true, force: true })
}
