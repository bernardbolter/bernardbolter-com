import fs from 'node:fs/promises'
import path from 'node:path'

import {
  needsBrowserVideoTranscode,
  probeVideoCodecName,
  transcodeToBrowserMp4,
} from '@/lib/workers/ffmpeg'

/**
 * If the inbox video won't play reliably in browsers (e.g. Rode dual-cam .mov / HEVC),
 * replace it in-place with an H.264 MP4 and return the new relative path + mime.
 */
export async function maybeTranscodeInboxVideo(args: {
  root: string
  relativePath: string
  mimeType: string
}): Promise<{ relativePath: string; mimeType: string; filesize: number }> {
  const absolute = path.resolve(args.root, args.relativePath)
  const shouldTranscode = await needsBrowserVideoTranscode(absolute, args.mimeType)
  if (!shouldTranscode) {
    const stat = await fs.stat(absolute)
    return {
      relativePath: args.relativePath,
      mimeType: args.mimeType,
      filesize: stat.size,
    }
  }

  const codec = await probeVideoCodecName(absolute)
  console.log(
    `[studio/ingest] converting ${args.relativePath} (codec=${codec ?? 'unknown'}) to browser MP4…`,
  )
  const started = Date.now()

  const parsed = path.parse(args.relativePath)
  const mp4Relative = path.posix.join(parsed.dir, `${parsed.name}.mp4`)
  const mp4Absolute = path.resolve(args.root, mp4Relative)

  if (mp4Absolute === absolute) {
    // Already .mp4 path but unfriendly codec — write beside then replace.
    const tmpAbsolute = `${absolute}.transcode-tmp.mp4`
    await transcodeToBrowserMp4(absolute, tmpAbsolute)
    await fs.rename(tmpAbsolute, absolute)
    const stat = await fs.stat(absolute)
    console.log(`[studio/ingest] done ${args.relativePath} in ${Date.now() - started}ms`)
    return {
      relativePath: args.relativePath,
      mimeType: 'video/mp4',
      filesize: stat.size,
    }
  }

  await transcodeToBrowserMp4(absolute, mp4Absolute)
  await fs.unlink(absolute).catch(() => {
    // Best-effort: keep MP4 even if original delete fails.
  })

  const stat = await fs.stat(mp4Absolute)
  console.log(`[studio/ingest] done ${mp4Relative} in ${Date.now() - started}ms`)
  return {
    relativePath: mp4Relative,
    mimeType: 'video/mp4',
    filesize: stat.size,
  }
}
