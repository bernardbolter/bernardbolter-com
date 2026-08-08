import type { Job, PgBoss } from 'pg-boss'
import { getPayload } from 'payload'

import config from '@payload-config'
import { JOB_NAMES, type TranscodeStudioVideoPayload } from '@/lib/queue/jobs'
import { maybeTranscodeInboxVideo } from '@/lib/studio/ingestStudioVideo'
import { getFieldNotesMediaRoot } from '@/lib/studio/fieldNoteLocalStorage'

export async function handleTranscodeStudioVideo(jobs: Job<TranscodeStudioVideoPayload>[]) {
  const payload = await getPayload({ config })
  const root = getFieldNotesMediaRoot()

  for (const job of jobs) {
    const { mediaId, relativePath, mimeType } = job.data
    const started = Date.now()
    console.log(
      `[transcode-studio-video] start media #${mediaId} (${relativePath})`,
    )

    const result = await maybeTranscodeInboxVideo({ root, relativePath, mimeType })
    if (result.relativePath === relativePath && result.mimeType === mimeType) {
      console.log(`[transcode-studio-video] noop media #${mediaId}`)
      continue
    }

    await payload.update({
      collection: 'media',
      id: mediaId,
      data: {
        filename: result.relativePath,
        mimeType: result.mimeType,
        filesize: result.filesize,
      },
      overrideAccess: true,
    })

    console.log(
      `[transcode-studio-video] done media #${mediaId} → ${result.relativePath} in ${Date.now() - started}ms`,
    )
  }
}

export async function registerTranscodeStudioVideoWorker(boss: PgBoss): Promise<void> {
  // One convert at a time — dual-cam HEVC is CPU-heavy and was wedging the web process.
  await boss.work(
    JOB_NAMES.TRANSCODE_STUDIO_VIDEO,
    { batchSize: 1, localConcurrency: 1 },
    handleTranscodeStudioVideo,
  )
}
