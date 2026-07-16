import { NextResponse } from 'next/server'

import { enqueueGenerateTimelapse } from '@/lib/queue/enqueue'
import { requireStudio } from '@/lib/studio/requireStudio'

export async function POST(request: Request) {
  const auth = await requireStudio()
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as { artworkId?: number } | null
  const artworkId = body?.artworkId
  if (!artworkId || !Number.isFinite(artworkId)) {
    return NextResponse.json({ error: 'artworkId is required' }, { status: 400 })
  }

  try {
    const jobId = await enqueueGenerateTimelapse(artworkId)
    return NextResponse.json({
      jobId,
      note: jobId
        ? undefined
        : 'Queue returned no job id — worker stub may still accept the job once registered.',
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to enqueue' },
      { status: 500 },
    )
  }
}
