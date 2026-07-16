import fs from 'node:fs/promises'
import path from 'node:path'

import { parseMoondreamTags } from '@/lib/workers/moondreamPrompts'

export type MoondreamTagResult = {
  tags: string[]
  raw: string
}

type MoondreamJsonResponse = {
  text?: string
  answer?: string
  response?: string
}

type MoondreamQueryRequest = {
  image_url: string
  question: string
  stream: false
}

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
  const payload: MoondreamQueryRequest = {
    image_url: toMoondreamDataUri(imageBytes, imageMimeTypeFromPath(imagePath)),
    question: prompt,
    stream: false,
  }

  const url = `${getMoondreamUrl()}/v1/query`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(
      `Moondream sidecar failed (${response.status}): ${detail.slice(0, 500) || response.statusText}`,
    )
  }

  const body = (await response.json()) as MoondreamJsonResponse
  return parseMoondreamResponse(body)
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
    imagePayload = toMoondreamDataUri(bytes, mime)
  }

  const payload: MoondreamQueryRequest = {
    image_url: imagePayload,
    question: prompt,
    stream: false,
  }

  const url = `${getMoondreamUrl()}/v1/query`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(
      `Moondream sidecar failed (${response.status}): ${detail.slice(0, 500) || response.statusText}`,
    )
  }

  const body = (await response.json()) as MoondreamJsonResponse
  const parsed = parseMoondreamResponse(body)
  if (!parsed.raw) {
    throw new Error(
      `Empty Moondream response body keys=[${Object.keys(body).join(',')}] sample=${JSON.stringify(body).slice(0, 300)}`,
    )
  }
  return parsed
}
