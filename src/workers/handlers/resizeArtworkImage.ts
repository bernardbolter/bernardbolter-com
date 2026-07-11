import type { Job, PgBoss } from 'pg-boss'

import { backfillArtworkImageDerivatives } from '@/lib/media/backfillArtworkImageDerivatives'
import { resizeArtworkDerivatives } from '@/lib/media/resizeArtworkDerivatives'
import { JOB_NAMES, type ResizeImageOnUploadPayload } from '@/lib/queue/jobs'

async function processResizeJob(slug: string, imageUrl: string) {
  const result = await resizeArtworkDerivatives(slug, imageUrl)
  console.info('[resize-image]', result)
  return result
}

export async function handleResizeImageOnUpload(jobs: Job<ResizeImageOnUploadPayload>[]) {
  for (const job of jobs) {
    const { slug, imageUrl } = job.data
    if (!slug?.trim() || !imageUrl?.trim()) continue
    try {
      await processResizeJob(slug.trim(), imageUrl.trim())
    } catch (error) {
      console.error('[resize-image-on-upload] failed', { slug, error })
    }
  }
}

export async function handleResizeImageBackfill() {
  const summary = await backfillArtworkImageDerivatives({
    onArtworkResult: ({ slug, result, error }) => {
      if (error) {
        console.error('[resize-image-backfill] artwork failed', { slug, error })
        return
      }
      if (result) {
        console.info('[resize-image-backfill]', result)
      }
    },
  })
  console.info('[resize-image-backfill] complete', summary)
}

export async function registerResizeImageWorkers(boss: PgBoss): Promise<void> {
  await boss.work(JOB_NAMES.RESIZE_IMAGE_ON_UPLOAD, handleResizeImageOnUpload)
  await boss.work(JOB_NAMES.RESIZE_IMAGE_BACKFILL, async () => {
    await handleResizeImageBackfill()
  })
}
