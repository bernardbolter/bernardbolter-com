import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export type ExtractedKeyframe = {
  timestamp: number
  path: string
}

export type FfmpegExtractResult = {
  keyframes: ExtractedKeyframe[]
  audioPath: string
  durationSec: number
}

export function getFfmpegPath(): string {
  return process.env.FFMPEG_PATH || 'ffmpeg'
}

export function getFfprobePath(): string {
  return process.env.FFPROBE_PATH || 'ffprobe'
}

/** fps filter value for one frame every `intervalSec` seconds (e.g. 10 → fps=0.1). */
export function buildKeyframeFpsFilter(intervalSec: number): string {
  if (!Number.isFinite(intervalSec) || intervalSec <= 0) {
    throw new Error(`keyframe interval must be a positive number, got ${intervalSec}`)
  }
  return `fps=1/${intervalSec}`
}

export function keyframeTimestampForIndex(frameIndex: number, intervalSec: number): number {
  if (frameIndex < 1) {
    throw new Error(`frame index must be >= 1, got ${frameIndex}`)
  }
  return (frameIndex - 1) * intervalSec
}

export function parseFfprobeDurationOutput(stdout: string): number {
  const duration = Number.parseFloat(stdout.trim())
  if (!Number.isFinite(duration) || duration < 0) {
    throw new Error(`Invalid ffprobe duration output: ${stdout.trim()}`)
  }
  return duration
}

export async function probeMediaDurationSec(inputPath: string): Promise<number> {
  const { stdout } = await execFileAsync(getFfprobePath(), [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    inputPath,
  ])
  return parseFfprobeDurationOutput(stdout)
}

async function listKeyframeFiles(keyframesDir: string): Promise<string[]> {
  const entries = await fs.readdir(keyframesDir)
  return entries.filter((name) => /^frame_\d+\.jpe?g$/i.test(name)).sort()
}

/**
 * Single ffmpeg pass: extract keyframes at a fixed interval + 16 kHz mono WAV for Whisper.
 * See brief-07-footage-pipeline.md — one read, both outputs.
 */
export async function extractKeyframesAndAudio(
  inputPath: string,
  options: { intervalSec: number; workDir: string },
): Promise<FfmpegExtractResult> {
  const { intervalSec, workDir } = options
  const keyframesDir = path.join(workDir, 'keyframes')
  const audioPath = path.join(workDir, 'audio.wav')
  const framePattern = path.join(keyframesDir, 'frame_%04d.jpg')

  await fs.mkdir(keyframesDir, { recursive: true })

  const fpsFilter = buildKeyframeFpsFilter(intervalSec)

  await execFileAsync(getFfmpegPath(), [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-i',
    inputPath,
    '-map',
    '0:v:0',
    '-vf',
    fpsFilter,
    '-q:v',
    '2',
    framePattern,
    '-map',
    '0:a:0?',
    '-ar',
    '16000',
    '-ac',
    '1',
    '-c:a',
    'pcm_s16le',
    audioPath,
  ])

  const durationSec = await probeMediaDurationSec(inputPath)
  const frameFiles = await listKeyframeFiles(keyframesDir)

  const keyframes: ExtractedKeyframe[] = frameFiles.map((filename) => {
    const match = filename.match(/frame_(\d+)\./i)
    const index = match ? Number.parseInt(match[1]!, 10) : 1
    return {
      timestamp: keyframeTimestampForIndex(index, intervalSec),
      path: path.join(keyframesDir, filename),
    }
  })

  return { keyframes, audioPath, durationSec }
}

/** Voice memo / audio-only source — 16 kHz mono WAV for Whisper. */
export async function extractAudioOnly(
  inputPath: string,
  workDir: string,
): Promise<{ audioPath: string; durationSec: number }> {
  const audioPath = path.join(workDir, 'audio.wav')

  await execFileAsync(getFfmpegPath(), [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-i',
    inputPath,
    '-ar',
    '16000',
    '-ac',
    '1',
    '-c:a',
    'pcm_s16le',
    audioPath,
  ])

  const durationSec = await probeMediaDurationSec(inputPath)
  return { audioPath, durationSec }
}
