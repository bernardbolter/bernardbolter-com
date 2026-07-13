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

/** Local Moondream HTTP sidecar — see workers/README.md for the expected contract. */
export function getMoondreamUrl(): string {
  return process.env.MOONDREAM_URL?.replace(/\/$/, '') || 'http://127.0.0.1:2020'
}

export function parseMoondreamResponse(body: MoondreamJsonResponse): MoondreamTagResult {
  const raw = (body.text ?? body.answer ?? body.response ?? '').trim()
  return { raw, tags: parseMoondreamTags(raw) }
}

/**
 * Tag a keyframe image with a shot-type-specific Moondream prompt.
 *
 * Sidecar contract:
 *   POST /v1/query
 *   multipart: image (file), prompt (string)
 *   JSON response: { "text": "tag1, tag2, ..." }
 */
export async function queryMoondreamImage(
  imagePath: string,
  prompt: string,
): Promise<MoondreamTagResult> {
  const imageBytes = await fs.readFile(imagePath)
  const form = new FormData()
  form.append('image', new Blob([imageBytes]), path.basename(imagePath))
  form.append('prompt', prompt)

  const url = `${getMoondreamUrl()}/v1/query`
  const response = await fetch(url, { method: 'POST', body: form })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(
      `Moondream sidecar failed (${response.status}): ${detail.slice(0, 500) || response.statusText}`,
    )
  }

  const body = (await response.json()) as MoondreamJsonResponse
  return parseMoondreamResponse(body)
}
