import { needsBrowserVideoTranscode } from '@/lib/workers/ffmpeg'
import { enqueueTranscodeStudioVideo } from '@/lib/queue/enqueue'

export async function shouldConvertInboxVideo(
  absolutePath: string,
  mimeType: string,
): Promise<boolean> {
  return needsBrowserVideoTranscode(absolutePath, mimeType)
}

/**
 * Queue .mov/HEVC conversion on the worker process so the Next.js web app
 * stays responsive (in-process ffmpeg was pegging CPU/RAM and timing out Postgres).
 */
export async function scheduleInboxVideoTranscode(args: {
  mediaId: number
  relativePath: string
  mimeType: string
}): Promise<void> {
  const jobId = await enqueueTranscodeStudioVideo({
    mediaId: args.mediaId,
    relativePath: args.relativePath,
    mimeType: args.mimeType,
  })
  console.log(
    `[studio/ingest] queued convert media #${args.mediaId} job=${jobId ?? 'null'} (${args.relativePath})`,
  )
}
