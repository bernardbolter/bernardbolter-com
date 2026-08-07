'use client'

import { FormEvent, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { rapCriticShotTypes } from '@/lib/studio/fieldNoteSchema'

const SHOT_LABELS: Record<(typeof rapCriticShotTypes)[number], string> = {
  ARRIVE: 'Arrive (roll-in)',
  HOOK: 'Hook (intro)',
  VERSE: 'Verse (freestyle)',
  DEPART: 'Depart (roll-out)',
}

type VerseCameraAngle = 'front' | 'rear'

export type EpisodeClipTakeInfo = {
  shotType?: string | null
  take?: number | null
  cameraAngle?: string | null
}

type EpisodeClipUploadProps = {
  episodeId: number
  capturePresetId: number | null
  clips: EpisodeClipTakeInfo[]
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

/** Prefer an incomplete VERSE take missing this angle; else open a new take. */
function nextVerseTake(
  clips: EpisodeClipTakeInfo[],
  cameraAngle: VerseCameraAngle,
): number {
  const byTake = new Map<number, Set<string>>()
  for (const clip of clips) {
    if (clip.shotType !== 'VERSE') continue
    const take = typeof clip.take === 'number' ? clip.take : Number(clip.take)
    if (!Number.isFinite(take) || take < 1) continue
    const angles = byTake.get(take) ?? new Set<string>()
    if (clip.cameraAngle) angles.add(clip.cameraAngle)
    byTake.set(take, angles)
  }

  const incomplete = [...byTake.entries()]
    .filter(([, angles]) => !angles.has(cameraAngle))
    .map(([take]) => take)
    .sort((a, b) => a - b)

  if (incomplete[0] != null) return incomplete[0]
  return maxTakeForShot(clips, 'VERSE') + 1 || 1
}

export function EpisodeClipUpload({
  episodeId,
  capturePresetId,
  clips,
}: EpisodeClipUploadProps) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [shotType, setShotType] = useState<(typeof rapCriticShotTypes)[number]>('ARRIVE')
  const [cameraAngle, setCameraAngle] = useState<VerseCameraAngle>('front')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const isVerse = shotType === 'VERSE'
  const resolvedCameraAngle = isVerse ? cameraAngle : 'single'

  const nextTake = useMemo(() => {
    if (isVerse) return nextVerseTake(clips, cameraAngle)
    return maxTakeForShot(clips, shotType) + 1 || 1
  }, [clips, shotType, cameraAngle, isVerse])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      if (!file) {
        setError('Choose a video clip.')
        return
      }
      if (capturePresetId == null) {
        setError(
          'Rap Critic — TikTok capture preset is missing. Run npm run seed:capture-presets on the server.',
        )
        return
      }

      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      const uploadRes = await fetch('/api/studio/upload', {
        method: 'POST',
        credentials: 'include',
        body: uploadFormData,
      })
      if (!uploadRes.ok) {
        const payload = (await uploadRes.json().catch(() => ({}))) as { error?: string }
        throw new Error(payload.error || 'Could not upload file.')
      }
      const uploadData = (await uploadRes.json()) as { id: number }

      const createRes = await fetch('/api/studio/field-notes', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaType: 'video-performance',
          mediaFileId: uploadData.id,
          relatedEpisode: episodeId,
          shotType,
          take: nextTake,
          cameraAngle: resolvedCameraAngle,
          capturePresetId,
        }),
      })
      if (!createRes.ok) {
        const payload = (await createRes.json().catch(() => ({}))) as { error?: string }
        throw new Error(payload.error || 'Could not create field note.')
      }

      const created = (await createRes.json()) as {
        id: number
        processingStatus: string
        queueWarning?: string
      }
      const queueNote = created.queueWarning
        ? ' Queue warning — note saved; worker may pick it up later.'
        : ''
      const angleNote = isVerse ? ` ${cameraAngle}` : ''
      setSuccess(
        `Clip #${created.id} saved as ${shotType}${angleNote} take ${nextTake} (${created.processingStatus}).${queueNote}`,
      )
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setSubmitting(false)
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
        <div className="studio-form__field">
          <label htmlFor={`episode-clip-angle-${episodeId}`}>Camera angle</label>
          <select
            id={`episode-clip-angle-${episodeId}`}
            value={cameraAngle}
            disabled={submitting}
            onChange={(e) => setCameraAngle(e.target.value as VerseCameraAngle)}
          >
            <option value="front">Front (performer)</option>
            <option value="rear">Rear (artwork)</option>
          </select>
        </div>
      ) : null}
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
        {file ? <p className="studio-muted">{file.name}</p> : null}
      </div>
      {error ? <p className="studio-form__error">{error}</p> : null}
      {success ? <p className="studio-muted">{success}</p> : null}
      <button type="submit" className="studio-form__submit" disabled={submitting}>
        {submitting ? 'Uploading…' : 'Upload clip'}
      </button>
    </form>
  )
}
