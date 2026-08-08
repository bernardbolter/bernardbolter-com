import type { Payload } from 'payload'

import { needsBrowserVideoTranscode } from '@/lib/workers/ffmpeg'
import { maybeTranscodeInboxVideo } from '@/lib/studio/ingestStudioVideo'

export async function shouldConvertInboxVideo(
  absolutePath: string,
  mimeType: string,
): Promise<boolean> {
  return needsBrowserVideoTranscode(absolutePath, mimeType)
}

/**
 * Convert .mov/HEVC after the upload response is sent so Cloudflare/proxy
 * timeouts (~100s) do not kill the client connection mid-ffmpeg.
 */
export function scheduleInboxVideoTranscode(args: {
  payload: Payload
  mediaId: number
  root: string
  relativePath: string
  mimeType: string
}): void {
  const { payload, mediaId, root, relativePath, mimeType } = args

  setImmediate(() => {
    void (async () => {
      const started = Date.now()
      console.log(`[studio/ingest] background convert start media #${mediaId} (${relativePath})`)
      try {
        const result = await maybeTranscodeInboxVideo({ root, relativePath, mimeType })
        if (
          result.relativePath === relativePath &&
          result.mimeType === mimeType
        ) {
          console.log(`[studio/ingest] background convert noop media #${mediaId}`)
          return
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
          `[studio/ingest] background convert done media #${mediaId} → ${result.relativePath} in ${Date.now() - started}ms`,
        )
      } catch (error) {
        console.error(
          `[studio/ingest] background convert failed media #${mediaId}`,
          error,
        )
      }
    })()
  })
}
