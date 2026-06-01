/** Default alt text for Art/Official media uploads (Media.alt is required). */
import { isVideoMediaFile } from './mediaMime'

export function defaultMediaAlt(file: File, label?: string): string {
  const base = file.name.replace(/\.[^.]+$/, '').trim()
  return base || label || (isVideoMediaFile(file) ? 'Artwork video' : 'Artwork image')
}

async function uploadImageViaPayloadApi(file: File, altLabel?: string): Promise<number> {
  const form = new FormData()
  form.append('file', file)
  form.append(
    '_payload',
    JSON.stringify({
      alt: defaultMediaAlt(file, altLabel),
    }),
  )

  const res = await fetch('/api/media', {
    method: 'POST',
    credentials: 'include',
    body: form,
  })

  const data = (await res.json().catch(() => ({}))) as {
    doc?: { id?: number | string }
    id?: number | string
    errors?: Array<{ message?: string }>
    message?: string
  }

  if (!res.ok) {
    const detail =
      data.errors?.map((e) => e.message).filter(Boolean).join('; ') ||
      data.message ||
      `HTTP ${res.status}`
    throw new Error(`Upload failed (${res.status}): ${detail}`)
  }

  const id = data.doc?.id ?? data.id
  if (id == null) {
    throw new Error('Upload succeeded but no media id was returned.')
  }

  return Number(id)
}

/**
 * Video files bypass Payload REST upload (Sharp/imageSizes).
 * Upload goes to our API then R2 server-side — avoids browser CORS on presigned PUT.
 */
async function uploadVideoViaServer(file: File, altLabel?: string): Promise<number> {
  const form = new FormData()
  form.append('file', file)
  form.append('alt', defaultMediaAlt(file, altLabel))

  let res: Response
  try {
    res = await fetch('/api/art-official/media-upload/direct', {
      method: 'POST',
      credentials: 'include',
      body: form,
    })
  } catch {
    throw new Error('Video upload failed: could not reach the server. Check your connection and try again.')
  }

  const data = (await res.json().catch(() => ({}))) as {
    id?: number | string
    error?: string
  }

  if (!res.ok || data.id == null) {
    throw new Error(data.error || `Video upload failed (${res.status}).`)
  }

  return Number(data.id)
}

/**
 * Upload a file to the Payload `media` collection from the admin panel.
 * Images use multipart `/api/media`; videos use presigned R2 (Payload Sharp cannot process MP4).
 */
export async function uploadMediaFile(file: File, altLabel?: string): Promise<number> {
  if (isVideoMediaFile(file)) {
    return uploadVideoViaServer(file, altLabel)
  }
  return uploadImageViaPayloadApi(file, altLabel)
}
