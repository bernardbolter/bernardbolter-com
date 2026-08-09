'use client'

import { FormEvent, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { resolveMediaMimeType } from '@/lib/artOfficial/mediaMime'

type EpisodeBeatUploadProps = {
  episodeId: number
  beatTrackCount: number
}

type UploadProgress = {
  phase: 'uploading' | 'processing'
  loaded: number
  total: number
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`
}

function putChunk(uploadId: string, index: number, chunk: Blob): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', `/api/studio/upload-session/${uploadId}/chunk?index=${index}`)
    xhr.withCredentials = true
    xhr.timeout = 5 * 60 * 1000
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`Chunk ${index} failed (${xhr.status})`))
    }
    xhr.onerror = () => reject(new Error(`Chunk ${index} network error`))
    xhr.ontimeout = () => reject(new Error(`Chunk ${index} timed out`))
    xhr.send(chunk)
  })
}

async function uploadStudioFile(
  file: File,
  onProgress?: (progress: UploadProgress) => void,
): Promise<number> {
  const contentType = resolveMediaMimeType(file)
  if (!contentType.startsWith('audio/')) {
    throw new Error(
      'Use a Song export from GarageBand (.m4a, .wav, .aiff, or .mp3) — not a Project file.',
    )
  }

  const initRes = await fetch('/api/studio/upload-session', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      contentType,
      totalBytes: file.size,
    }),
  })
  if (!initRes.ok) {
    const payload = (await initRes.json().catch(() => ({}))) as { error?: string }
    throw new Error(payload.error || `Could not start upload for ${file.name}.`)
  }

  const session = (await initRes.json()) as {
    uploadId: string
    chunkSize: number
    totalChunks: number
  }

  let uploaded = 0
  for (let index = 0; index < session.totalChunks; index++) {
    const start = index * session.chunkSize
    const end = Math.min(start + session.chunkSize, file.size)
    const chunk = file.slice(start, end)
    let lastError: Error | null = null
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await putChunk(session.uploadId, index, chunk)
        lastError = null
        break
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        await new Promise((resolve) => window.setTimeout(resolve, 500 * (attempt + 1)))
      }
    }
    if (lastError) throw lastError

    uploaded = end
    onProgress?.({ phase: 'uploading', loaded: uploaded, total: file.size })
  }

  onProgress?.({ phase: 'processing', loaded: file.size, total: file.size })

  const completeRes = await fetch(`/api/studio/upload-session/${session.uploadId}/complete`, {
    method: 'POST',
    credentials: 'include',
  })
  if (!completeRes.ok) {
    const payload = (await completeRes.json().catch(() => ({}))) as { error?: string }
    throw new Error(payload.error || `Could not finish upload for ${file.name}.`)
  }
  const data = (await completeRes.json()) as { id?: number }
  if (typeof data.id !== 'number') {
    throw new Error(`Could not finish upload for ${file.name}.`)
  }
  return data.id
}

export function EpisodeBeatUpload({ episodeId, beatTrackCount }: EpisodeBeatUploadProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const canAdd = beatTrackCount < 3

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!file) {
      setError('Choose a beat audio file first.')
      return
    }
    if (!canAdd) {
      setError('Episode already has 3 beat tracks.')
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccess(null)
    setStatus('Uploading beat… 0%')

    try {
      const mediaId = await uploadStudioFile(file, (progress) => {
        if (progress.phase === 'uploading') {
          const pct =
            progress.total > 0
              ? Math.min(100, Math.round((progress.loaded / progress.total) * 100))
              : 0
          setStatus(
            `Uploading beat… ${pct}% (${formatBytes(progress.loaded)} / ${formatBytes(progress.total)})`,
          )
        } else {
          setStatus('Uploaded — saving on episode…')
        }
      })

      const res = await fetch(`/api/studio/episodes/${episodeId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addBeatTrackId: mediaId }),
      })
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(payload.error || 'Could not save beat track on episode.')
      }

      setSuccess(`Beat saved on episode (media #${mediaId}).`)
      setFile(null)
      if (inputRef.current) inputRef.current.value = ''
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Beat upload failed.')
    } finally {
      setSubmitting(false)
      setStatus(null)
    }
  }

  return (
    <form className="studio-form" onSubmit={onSubmit}>
      <div className="studio-form__field">
        <label htmlFor={`episode-beat-only-${episodeId}`}>
          Add beat track ({beatTrackCount}/3)
        </label>
        <input
          ref={inputRef}
          id={`episode-beat-only-${episodeId}`}
          type="file"
          accept="audio/*,.m4a,.mp3,.wav,.aiff,.aif,.caf"
          disabled={submitting || !canAdd}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {file ? (
          <p className="studio-muted">
            {file.name} · {formatBytes(file.size)} · {resolveMediaMimeType(file)}
          </p>
        ) : null}
        <p className="studio-muted">
          From GarageBand iOS: Share → <strong>Song</strong> (not Project) → High Quality .m4a or
          Uncompressed .wav / .aiff → Save to Files. Then pick that file here.
        </p>
      </div>
      <button type="submit" className="studio-form__submit" disabled={submitting || !canAdd || !file}>
        {submitting ? 'Uploading…' : 'Upload beat'}
      </button>
      {status ? <p className="studio-muted">{status}</p> : null}
      {error ? <p className="studio-form__error">{error}</p> : null}
      {success ? <p className="studio-muted">{success}</p> : null}
    </form>
  )
}
