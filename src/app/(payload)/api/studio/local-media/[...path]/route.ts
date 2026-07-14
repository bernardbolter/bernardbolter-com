import fs from 'node:fs/promises'
import path from 'node:path'

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

export async function GET(
  _request: Request,
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
    const buffer = await fs.readFile(absolute)
    return new Response(buffer, {
      headers: {
        'Content-Type': mimeTypeFromPath(relativePath),
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
