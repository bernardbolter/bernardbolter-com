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
