/** Default alt text for Art/Official media uploads (Media.alt is required). */
export function defaultMediaAlt(file: File, label?: string): string {
  const base = file.name.replace(/\.[^.]+$/, '').trim()
  return base || label || 'Artwork media'
}

/**
 * Upload a file to the Payload `media` collection from the admin panel.
 * Uses multipart `_payload` per Payload 3 REST upload docs.
 */
export async function uploadMediaFile(file: File, altLabel?: string): Promise<number> {
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
