'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { rapCriticShotTypes } from '@/lib/studio/fieldNoteSchema'

const SHOT_LABELS: Record<(typeof rapCriticShotTypes)[number], string> = {
  ARRIVE: 'Arrive (roll-in)',
  HOOK: 'Hook (intro)',
  VERSE: 'Verse (freestyle)',
  DEPART: 'Depart (roll-out)',
}

export type EpisodeClipTakeInfo = {
  shotType?: string | null
  take?: number | null
  cameraAngle?: string | null
}

type EpisodeClipUploadProps = {
  episodeId: number
  capturePresetId: number | null
  clips: EpisodeClipTakeInfo[]
  /** How many beat tracks are already on the episode (0–3). */
  beatTrackCount?: number
}

type UploadProgress = {
  phase: 'uploading' | 'processing'
  loaded: number
  total: number
}

function maxTakeForShot(clips: EpisodeClipTakeInfo[], shotType: string): number {
  let max = 0
  for (const clip of clips) {
    if (clip.shotType !== shotType) continue
    const take = typeof clip.take === 'number' ? clip.take : Number(clip.take)
    if (Number.isFinite(take) && take > max) max = take
  }
  return max
}

/** Next take number when uploading front + rear together. */
function nextDualVerseTake(clips: EpisodeClipTakeInfo[]): number {
  return maxTakeForShot(clips, 'VERSE') + 1 || 1
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

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function looksLikeMov(file: File): boolean {
  const name = file.name.toLowerCase()
  return name.endsWith('.mov') || file.type === 'video/quicktime'
}

function uploadStudioFile(
  file: File,
  onProgress?: (progress: UploadProgress) => void,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/studio/upload')
    xhr.withCredentials = true
    xhr.timeout = 30 * 60 * 1000

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return
      onProgress?.({
        phase: 'uploading',
        loaded: event.loaded,
        total: event.total,
      })
    }

    xhr.upload.onload = () => {
      onProgress?.({
        phase: 'processing',
        loaded: file.size,
        total: file.size,
      })
    }

    xhr.onload = () => {
      let payload: { id?: number; error?: string } = {}
      try {
        payload = JSON.parse(xhr.responseText) as { id?: number; error?: string }
      } catch {
        // ignore parse errors — fall through to status message
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(payload.error || `Could not upload ${file.name} (HTTP ${xhr.status}).`))
        return
      }
      if (typeof payload.id !== 'number') {
        reject(new Error(`Could not upload ${file.name}.`))
        return
      }
      resolve(payload.id)
    }

    xhr.onerror = () => reject(new Error(`Network error uploading ${file.name}.`))
    xhr.ontimeout = () =>
      reject(new Error(`Upload timed out for ${file.name} (server may still be converting).`))

    const formData = new FormData()
    formData.append('file', file)
    xhr.send(formData)
  })
}

async function createFieldNote(body: Record<string, unknown>): Promise<{
  id: number
  processingStatus: string
  queueWarning?: string
}> {
  const createRes = await fetch('/api/studio/field-notes', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!createRes.ok) {
    const payload = (await createRes.json().catch(() => ({}))) as { error?: string }
    throw new Error(payload.error || 'Could not create field note.')
  }
  return (await createRes.json()) as {
    id: number
    processingStatus: string
    queueWarning?: string
  }
}

async function addEpisodeBeatTrack(episodeId: number, beatTrackId: number): Promise<void> {
  const res = await fetch(`/api/studio/episodes/${episodeId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ addBeatTrackId: beatTrackId }),
  })
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(payload.error || 'Could not save beat track on episode.')
  }
}

export function EpisodeClipUpload({
  episodeId,
  capturePresetId,
  clips,
  beatTrackCount = 0,
}: EpisodeClipUploadProps) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const frontRef = useRef<HTMLInputElement>(null)
  const rearRef = useRef<HTMLInputElement>(null)
  const beatRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [frontFile, setFrontFile] = useState<File | null>(null)
  const [rearFile, setRearFile] = useState<File | null>(null)
  const [beatFile, setBeatFile] = useState<File | null>(null)
  const [shotType, setShotType] = useState<(typeof rapCriticShotTypes)[number]>('ARRIVE')
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [detail, setDetail] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [elapsedSec, setElapsedSec] = useState(0)
  const startedAtRef = useRef<number>(0)

  const isVerse = shotType === 'VERSE'
  const canAddBeat = beatTrackCount < 3

  const nextTake = useMemo(() => {
    if (isVerse) return nextDualVerseTake(clips)
    return maxTakeForShot(clips, shotType) + 1 || 1
  }, [clips, shotType, isVerse])

  useEffect(() => {
    if (!submitting) {
      setElapsedSec(0)
      return
    }
    startedAtRef.current = Date.now()
    const id = window.setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAtRef.current) / 1000))
    }, 1000)
    return () => window.clearInterval(id)
  }, [submitting])

  useEffect(() => {
    if (!submitting || !status?.includes('converting')) return
    setDetail(
      `Server is remuxing/transcoding for browser playback. Dual-cam HEVC can take several minutes. Elapsed ${formatElapsed(elapsedSec)}.`,
    )
  }, [elapsedSec, submitting, status])

  function clearInputs() {
    setFile(null)
    setFrontFile(null)
    setRearFile(null)
    setBeatFile(null)
    if (fileRef.current) fileRef.current.value = ''
    if (frontRef.current) frontRef.current.value = ''
    if (rearRef.current) rearRef.current.value = ''
    if (beatRef.current) beatRef.current.value = ''
  }

  function elapsedLabel(): string {
    const sec =
      startedAtRef.current > 0
        ? Math.floor((Date.now() - startedAtRef.current) / 1000)
        : elapsedSec
    return formatElapsed(sec)
  }

  function reportFileProgress(label: string, fileToUpload: File, progress: UploadProgress) {
    if (progress.phase === 'uploading') {
      const pct =
        progress.total > 0 ? Math.min(100, Math.round((progress.loaded / progress.total) * 100)) : 0
      setStatus(`Uploading ${label}… ${pct}%`)
      setDetail(
        `${formatBytes(progress.loaded)} / ${formatBytes(progress.total)} · elapsed ${elapsedLabel()}`,
      )
      return
    }

    if (looksLikeMov(fileToUpload)) {
      setStatus(`Uploaded ${label} — converting .mov to MP4…`)
      setDetail(
        `Server is remuxing/transcoding for browser playback. Dual-cam HEVC can take several minutes. Elapsed ${elapsedLabel()}.`,
      )
    } else {
      setStatus(`Uploaded ${label} — saving on server…`)
      setDetail(`Elapsed ${elapsedLabel()}.`)
    }
  }

  async function uploadWithProgress(label: string, fileToUpload: File): Promise<number> {
    setStatus(`Uploading ${label}… 0%`)
    setDetail(`${formatBytes(0)} / ${formatBytes(fileToUpload.size)}`)
    return uploadStudioFile(fileToUpload, (progress) => {
      reportFileProgress(label, fileToUpload, progress)
    })
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    setStatus(null)
    setDetail(null)

    try {
      if (capturePresetId == null) {
        setError(
          'Rap Critic — TikTok capture preset is missing. Run npm run seed:capture-presets on the server.',
        )
        return
      }

      if (isVerse) {
        if (!frontFile || !rearFile) {
          setError('Choose both front and rear freestyle videos.')
          return
        }

        const take = nextDualVerseTake(clips)
        const createdIds: number[] = []
        let queueNote = ''

        const frontMediaId = await uploadWithProgress('front', frontFile)
        setStatus('Saving front clip note…')
        setDetail(null)
        const frontNote = await createFieldNote({
          mediaType: 'video-performance',
          mediaFileId: frontMediaId,
          relatedEpisode: episodeId,
          shotType: 'VERSE',
          take,
          cameraAngle: 'front',
          capturePresetId,
        })
        createdIds.push(frontNote.id)
        if (frontNote.queueWarning) queueNote = ' Queue warning — notes saved; worker may pick up later.'

        const rearMediaId = await uploadWithProgress('rear', rearFile)
        setStatus('Saving rear clip note…')
        setDetail(null)
        const rearNote = await createFieldNote({
          mediaType: 'video-performance',
          mediaFileId: rearMediaId,
          relatedEpisode: episodeId,
          shotType: 'VERSE',
          take,
          cameraAngle: 'rear',
          capturePresetId,
        })
        createdIds.push(rearNote.id)
        if (rearNote.queueWarning) queueNote = ' Queue warning — notes saved; worker may pick up later.'

        if (beatFile) {
          if (!canAddBeat) {
            throw new Error('Episode already has 3 beat tracks.')
          }
          const beatMediaId = await uploadWithProgress('beat', beatFile)
          setStatus('Saving beat on episode…')
          setDetail(null)
          await addEpisodeBeatTrack(episodeId, beatMediaId)
        }

        setSuccess(
          `Take ${take} saved: front #${createdIds[0]}, rear #${createdIds[1]}${
            beatFile ? ' · beat added to episode' : ''
          }.${queueNote}`,
        )
        clearInputs()
        router.refresh()
        return
      }

      if (!file) {
        setError('Choose a video clip.')
        return
      }

      const mediaFileId = await uploadWithProgress(shotType.toLowerCase(), file)
      setStatus('Saving clip note…')
      setDetail(null)
      const created = await createFieldNote({
        mediaType: 'video-performance',
        mediaFileId,
        relatedEpisode: episodeId,
        shotType,
        take: nextTake,
        cameraAngle: 'single',
        capturePresetId,
      })
      const queueNote = created.queueWarning
        ? ' Queue warning — note saved; worker may pick it up later.'
        : ''
      setSuccess(
        `Clip #${created.id} saved as ${shotType} take ${nextTake} (${created.processingStatus}).${queueNote}`,
      )
      clearInputs()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setSubmitting(false)
      setStatus(null)
      setDetail(null)
    }
  }

  return (
    <form className="studio-form" onSubmit={onSubmit}>
      <div className="studio-form__field">
        <label htmlFor={`episode-clip-shot-${episodeId}`}>Shot type</label>
        <select
          id={`episode-clip-shot-${episodeId}`}
          value={shotType}
          disabled={submitting}
          onChange={(e) => setShotType(e.target.value as (typeof rapCriticShotTypes)[number])}
        >
          {rapCriticShotTypes.map((value) => (
            <option key={value} value={value}>
              {SHOT_LABELS[value]}
            </option>
          ))}
        </select>
        <p className="studio-muted">Next take for this shot: {nextTake}</p>
      </div>

      {isVerse ? (
        <>
          <div className="studio-form__field">
            <label htmlFor={`episode-clip-front-${episodeId}`}>Front (performer)</label>
            <input
              ref={frontRef}
              id={`episode-clip-front-${episodeId}`}
              type="file"
              accept="video/*"
              disabled={submitting}
              onChange={(e) => setFrontFile(e.target.files?.[0] ?? null)}
            />
            {frontFile ? (
              <p className="studio-muted">
                {frontFile.name} · {formatBytes(frontFile.size)}
              </p>
            ) : null}
          </div>
          <div className="studio-form__field">
            <label htmlFor={`episode-clip-rear-${episodeId}`}>Rear (artwork)</label>
            <input
              ref={rearRef}
              id={`episode-clip-rear-${episodeId}`}
              type="file"
              accept="video/*"
              disabled={submitting}
              onChange={(e) => setRearFile(e.target.files?.[0] ?? null)}
            />
            {rearFile ? (
              <p className="studio-muted">
                {rearFile.name} · {formatBytes(rearFile.size)}
              </p>
            ) : null}
          </div>
          <div className="studio-form__field">
            <label htmlFor={`episode-clip-beat-${episodeId}`}>
              Beat track {canAddBeat ? `(optional — ${beatTrackCount}/3 on episode)` : '(full — 3/3)'}
            </label>
            <input
              ref={beatRef}
              id={`episode-clip-beat-${episodeId}`}
              type="file"
              accept="audio/*"
              disabled={submitting || !canAddBeat}
              onChange={(e) => setBeatFile(e.target.files?.[0] ?? null)}
            />
            {beatFile ? (
              <p className="studio-muted">
                {beatFile.name} · {formatBytes(beatFile.size)}
              </p>
            ) : null}
            <p className="studio-muted">
              {canAddBeat
                ? 'Adds one instrumental to this episode (max 3). Not sent to Whisper.'
                : 'This episode already has 3 beats. Remove one in admin to add another.'}
            </p>
          </div>
        </>
      ) : (
        <div className="studio-form__field">
          <label htmlFor={`episode-clip-file-${episodeId}`}>Video clip</label>
          <input
            ref={fileRef}
            id={`episode-clip-file-${episodeId}`}
            type="file"
            accept="video/*"
            disabled={submitting}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <p className="studio-muted">
              {file.name} · {formatBytes(file.size)}
            </p>
          ) : null}
        </div>
      )}

      {error ? <p className="studio-form__error">{error}</p> : null}
      {status ? <p className="studio-muted">{status}</p> : null}
      {detail ? <p className="studio-muted">{detail}</p> : null}
      {submitting ? (
        <p className="studio-muted">Total elapsed: {formatElapsed(elapsedSec)}</p>
      ) : null}
      {success ? <p className="studio-muted">{success}</p> : null}
      <button type="submit" className="studio-form__submit" disabled={submitting}>
        {submitting
          ? 'Working…'
          : isVerse
            ? 'Upload freestyle take'
            : 'Upload clip'}
      </button>
    </form>
  )
}
