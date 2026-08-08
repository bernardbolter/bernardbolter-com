import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'

import { requireStudio } from '@/lib/studio/requireStudio'
import {
  INBOX_PREFIX,
  getFieldNotesMediaRoot,
  resolveAbsolutePathUnderRoot,
} from '@/lib/studio/fieldNoteLocalStorage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function mimeTypeFromPath(relativePath: string): string {
  switch (path.extname(relativePath).toLowerCase()) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.png':
      return 'image/png'
    case '.webp':
      return 'image/webp'
    case '.mp4':
      return 'video/mp4'
    case '.mov':
      return 'video/quicktime'
    case '.webm':
      return 'video/webm'
    case '.m4a':
      return 'audio/mp4'
    case '.mp3':
      return 'audio/mpeg'
    case '.wav':
      return 'audio/wav'
    default:
      return 'application/octet-stream'
  }
}

function parseBytesRange(
  rangeHeader: string | null,
  size: number,
): { start: number; end: number } | null {
  if (!rangeHeader || !rangeHeader.startsWith('bytes=') || size <= 0) return null
  const spec = rangeHeader.slice('bytes='.length).split(',')[0]?.trim()
  if (!spec) return null

  const [startRaw, endRaw] = spec.split('-', 2)
  let start: number
  let end: number

  if (startRaw === '') {
    // suffix form: bytes=-500
    const suffix = Number.parseInt(endRaw ?? '', 10)
    if (!Number.isFinite(suffix) || suffix <= 0) return null
    start = Math.max(0, size - suffix)
    end = size - 1
  } else {
    start = Number.parseInt(startRaw, 10)
    end = endRaw ? Number.parseInt(endRaw, 10) : size - 1
    if (!Number.isFinite(start) || start < 0 || start >= size) return null
    if (!Number.isFinite(end) || end < start) end = size - 1
    end = Math.min(end, size - 1)
  }

  return { start, end }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { ok } = await requireStudio()
  if (!ok) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { path: segments } = await context.params
  const relativePath = segments.map((segment) => decodeURIComponent(segment)).join('/')
  if (!relativePath.startsWith(INBOX_PREFIX)) {
    return new Response('Not found', { status: 404 })
  }

  try {
    const absolute = resolveAbsolutePathUnderRoot(getFieldNotesMediaRoot(), relativePath)
    const fileStat = await stat(absolute)
    const contentType = mimeTypeFromPath(relativePath)
    const range = parseBytesRange(request.headers.get('range'), fileStat.size)

    if (range) {
      const { start, end } = range
      const chunkSize = end - start + 1
      const nodeStream = createReadStream(absolute, { start, end })
      return new Response(Readable.toWeb(nodeStream) as ReadableStream, {
        status: 206,
        headers: {
          'Content-Type': contentType,
          'Content-Length': String(chunkSize),
          'Content-Range': `bytes ${start}-${end}/${fileStat.size}`,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'private, max-age=3600',
        },
      })
    }

    const nodeStream = createReadStream(absolute)
    return new Response(Readable.toWeb(nodeStream) as ReadableStream, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(fileStat.size),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
