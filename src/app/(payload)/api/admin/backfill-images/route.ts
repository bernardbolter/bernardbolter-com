import { NextResponse } from 'next/server'

import { enqueueResizeImageBackfill } from '@/lib/queue/enqueue'

function isAuthorized(request: Request): boolean {
  const token = process.env.ADMIN_BACKFILL_TOKEN?.trim()
  if (!token) return false

  const header = request.headers.get('authorization')?.trim()
  if (!header?.startsWith('Bearer ')) return false
  return header.slice('Bearer '.length) === token
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const jobId = await enqueueResizeImageBackfill()
    return NextResponse.json({
      ok: true,
      jobId,
      message: 'resize-image-backfill queued',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
