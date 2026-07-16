import fs from 'node:fs/promises'
import path from 'node:path'

import sharp from 'sharp'

import {
  derivativePublicUrl,
} from '@/lib/media/artworkR2Images'
import { parseMoondreamTags } from '@/lib/workers/moondreamPrompts'

export type MoondreamTagResult = {
  tags: string[]
  raw: string
}

type MoondreamJsonResponse = {
  text?: string
  answer?: string
  response?: string
  error?: string
  status?: string
}

type MoondreamQueryRequest = {
  image_url: string
  question: string
  stream: false
}

/** Max long edge for Moondream catalogue queries (smaller = fewer Station timeouts). */
const MOONDREAM_MAX_EDGE = Number.parseInt(process.env.MOONDREAM_MAX_EDGE || '800', 10) || 800
const MOONDREAM_JPEG_QUALITY =
  Number.parseInt(process.env.MOONDREAM_JPEG_QUALITY || '75', 10) || 75
const MOONDREAM_MAX_ATTEMPTS =
  Number.parseInt(process.env.MOONDREAM_MAX_ATTEMPTS || '3', 10) || 3

/** Local Moondream Station — see workers/README.md for install and contract. */
export function getMoondreamUrl(): string {
  return process.env.MOONDREAM_URL?.replace(/\/$/, '') || 'http://127.0.0.1:2020'
}

export function imageMimeTypeFromPath(imagePath: string): string {
  switch (path.extname(imagePath).toLowerCase()) {
    case '.png':
      return 'image/png'
    case '.webp':
      return 'image/webp'
    default:
      return 'image/jpeg'
  }
}

export function toMoondreamDataUri(imageBytes: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${imageBytes.toString('base64')}`
}

export function parseMoondreamResponse(body: MoondreamJsonResponse): MoondreamTagResult {
  const raw = (body.text ?? body.answer ?? body.response ?? '').trim()
  return { raw, tags: parseMoondreamTags(raw) }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isTimeoutBody(body: MoondreamJsonResponse): boolean {
  const status = (body.status ?? '').toLowerCase()
  const error = (body.error ?? '').toLowerCase()
  return status === 'timeout' || error.includes('timeout')
}

async function postMoondreamQuery(
  imagePayload: string,
  prompt: string,
): Promise<MoondreamTagResult> {
  const payload: MoondreamQueryRequest = {
    image_url: imagePayload,
    question: prompt,
    stream: false,
  }

  const url = `${getMoondreamUrl()}/v1/query`
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= MOONDREAM_MAX_ATTEMPTS; attempt++) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      lastError = new Error(
        `Moondream sidecar failed (${response.status}): ${detail.slice(0, 500) || response.statusText}`,
      )
      if (attempt < MOONDREAM_MAX_ATTEMPTS) {
        await sleep(1500 * attempt)
        continue
      }
      throw lastError
    }

    const body = (await response.json()) as MoondreamJsonResponse
    if (isTimeoutBody(body)) {
      lastError = new Error(
        `Moondream timeout (attempt ${attempt}/${MOONDREAM_MAX_ATTEMPTS}): ${JSON.stringify(body).slice(0, 200)}`,
      )
      if (attempt < MOONDREAM_MAX_ATTEMPTS) {
        console.warn(`  moondream timeout — retrying in ${attempt * 2}s…`)
        await sleep(2000 * attempt)
        continue
      }
      throw lastError
    }

    const parsed = parseMoondreamResponse(body)
    if (!parsed.raw) {
      throw new Error(
        `Empty Moondream response body keys=[${Object.keys(body).join(',')}] sample=${JSON.stringify(body).slice(0, 300)}`,
      )
    }
    return parsed
  }

  throw lastError ?? new Error('Moondream query failed')
}

async function toResizedJpegDataUri(bytes: Buffer, fallbackMime: string): Promise<string> {
  try {
    const resized = await sharp(bytes)
      .resize(MOONDREAM_MAX_EDGE, MOONDREAM_MAX_EDGE, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: MOONDREAM_JPEG_QUALITY, progressive: true })
      .toBuffer()
    return toMoondreamDataUri(resized, 'image/jpeg')
  } catch {
    return toMoondreamDataUri(bytes, fallbackMime)
  }
}

/**
 * Tag a keyframe image with a shot-type-specific Moondream prompt.
 *
 * Moondream Station contract:
 *   POST /v1/query
 *   JSON: { image_url: "data:image/jpeg;base64,...", question: "...", stream: false }
 *   JSON response: { "answer": "tag1, tag2, ..." }
 */
export async function queryMoondreamImage(
  imagePath: string,
  prompt: string,
): Promise<MoondreamTagResult> {
  const imageBytes = await fs.readFile(imagePath)
  const mime = imageMimeTypeFromPath(imagePath)
  const imagePayload = await toResizedJpegDataUri(imageBytes, mime)
  return postMoondreamQuery(imagePayload, prompt)
}

/**
 * Query Moondream with a remote HTTPS URL.
 * Station expects a data URI (same as FieldNotes keyframe path) — remote URLs
 * often return empty / "Incorrect padding", so we download and re-encode.
 */
export async function queryMoondreamImageUrl(
  imageUrl: string,
  prompt: string,
): Promise<MoondreamTagResult> {
  let imagePayload = imageUrl
  if (!imageUrl.startsWith('data:')) {
    const cacheKey = imageUrl
    const cached = moondreamImageDataUriCache.get(cacheKey)
    if (cached) {
      imagePayload = cached
    } else {
      const imageRes = await fetch(imageUrl)
      if (!imageRes.ok) {
        throw new Error(
          `Failed to download image for Moondream (${imageRes.status}): ${imageUrl.slice(0, 120)}`,
        )
      }

      const bytes = Buffer.from(await imageRes.arrayBuffer())
      const contentType = imageRes.headers.get('content-type')?.split(';')[0]?.trim()
      const mime =
        contentType && contentType.startsWith('image/')
          ? contentType
          : imageMimeTypeFromPath(new URL(imageUrl).pathname)

      imagePayload = await toResizedJpegDataUri(bytes, mime)
      moondreamImageDataUriCache.set(cacheKey, imagePayload)
    }
  }

  return postMoondreamQuery(imagePayload, prompt)
}

/** Prefer prebuilt 800w R2 derivative when present; else original. */
export async function resolveMoondreamArtworkImageUrl(args: {
  slug?: string | null
  originalUrl: string
}): Promise<string> {
  const slug = args.slug?.trim()
  if (!slug) return args.originalUrl

  const derivative = derivativePublicUrl(slug, '800w')
  try {
    const head = await fetch(derivative, { method: 'HEAD' })
    if (head.ok) return derivative
  } catch {
    // fall through to original
  }
  return args.originalUrl
}

// Cache resized data URIs for the duration of a backfill run to avoid repeatedly
// downloading and re-encoding the same remote artwork image.
const moondreamImageDataUriCache = new Map<string, string>()
