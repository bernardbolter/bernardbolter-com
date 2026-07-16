'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'

import {
  fieldNoteConceptualThreads,
  fieldNoteMediaTypes,
  fieldNoteProcessStages,
  fieldNoteRegisters,
} from '@/lib/studio/fieldNoteSchema'

import { LinesPicker, type LineOption } from './LinesPicker'
import './uploadForm.scss'

const LAST_CITY_KEY = 'studio-last-city'

type TagTarget = { kind: 'artwork' | 'episode'; id: number; label: string }

function inferMediaType(file: File): (typeof fieldNoteMediaTypes)[number] {
  if (file.type.startsWith('image/')) return 'photo'
  if (file.type.startsWith('video/')) return 'video-broll'
  if (file.type.startsWith('audio/')) return 'voice-memo'
  return 'photo'
}

function mediaLabel(type: string): string {
  return type
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

type InputGroup = 'photos' | 'videos' | 'audio' | 'text'

const GROUP_MEDIA_TYPES: Record<InputGroup, readonly (typeof fieldNoteMediaTypes)[number][]> = {
  photos: ['photo'],
  videos: ['video-broll', 'video-observation', 'video-performance', 'video-process'],
  audio: ['voice-memo'],
  text: ['text'],
}

type UploadFormProps = {
  initialMediaType?: (typeof fieldNoteMediaTypes)[number]
  accept?: string
  lockMediaTypeGroup?: InputGroup
}

export function UploadForm({
  initialMediaType = 'photo',
  accept = 'image/*,video/*,audio/*',
  lockMediaTypeGroup,
}: UploadFormProps) {
  const libraryInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [mediaType, setMediaType] =
    useState<(typeof fieldNoteMediaTypes)[number]>(initialMediaType)
  const [writtenNote, setWrittenNote] = useState('')
  const [city, setCity] = useState('')
  const [locationName, setLocationName] = useState('')
  const [lines, setLines] = useState<LineOption[]>([])
  const [register, setRegister] = useState('')
  const [processStage, setProcessStage] = useState('')
  const [conceptualThread, setConceptualThread] = useState('')
  const [museumSourced, setMuseumSourced] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [tagQuery, setTagQuery] = useState('')
  const [tagTarget, setTagTarget] = useState<TagTarget | null>(null)
  const [tagResults, setTagResults] = useState<TagTarget[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const isTextOnly = mediaType === 'text'

  useEffect(() => {
    const saved = window.localStorage.getItem(LAST_CITY_KEY)
    if (saved) setCity(saved)
  }, [])

  useEffect(() => {
    if (!tagQuery.trim()) {
      setTagResults([])
      return
    }
    const handle = setTimeout(async () => {
      const q = tagQuery.trim()
      const [artworksRes, episodesRes] = await Promise.all([
        fetch(
          `/api/artworks?limit=5&depth=0&where[title][contains]=${encodeURIComponent(q)}`,
          { credentials: 'include' },
        ),
        fetch(
          `/api/episodes?limit=5&depth=0&where[title][contains]=${encodeURIComponent(q)}`,
          { credentials: 'include' },
        ),
      ])
      const targets: TagTarget[] = []
      if (artworksRes.ok) {
        const data = (await artworksRes.json()) as { docs?: Array<{ id: number; title?: string }> }
        for (const doc of data.docs ?? []) {
          if (doc.title) targets.push({ kind: 'artwork', id: doc.id, label: doc.title })
        }
      }
      if (episodesRes.ok) {
        const data = (await episodesRes.json()) as { docs?: Array<{ id: number; title?: string }> }
        for (const doc of data.docs ?? []) {
          if (doc.title) targets.push({ kind: 'episode', id: doc.id, label: doc.title })
        }
      }
      setTagResults(targets)
    }, 300)
    return () => clearTimeout(handle)
  }, [tagQuery])

  const allowedTypes = lockMediaTypeGroup
    ? GROUP_MEDIA_TYPES[lockMediaTypeGroup]
    : fieldNoteMediaTypes

  const mediaTypeOptions = useMemo(
    () => allowedTypes.map((value) => ({ value, label: mediaLabel(value) })),
    [allowedTypes],
  )

  function onFileChosen(next: File | null) {
    setFile(next)
    if (!next || lockMediaTypeGroup === 'text') return
    const inferred = inferMediaType(next)
    if (allowedTypes.includes(inferred)) setMediaType(inferred)
    else if (allowedTypes[0]) setMediaType(allowedTypes[0])
  }

  function clearFileInputs() {
    if (libraryInputRef.current) libraryInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      if (city.trim()) {
        window.localStorage.setItem(LAST_CITY_KEY, city.trim())
      }

      let mediaFileId: number | undefined

      if (!isTextOnly) {
        if (!file) {
          setError('Choose a file to upload.')
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
        mediaFileId = uploadData.id
      }

      const createRes = await fetch('/api/studio/field-notes', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaType,
          mediaFileId,
          writtenNote: writtenNote.trim() || undefined,
          city: city.trim() || undefined,
          locationName: locationName.trim() || undefined,
          relatedArtwork: tagTarget?.kind === 'artwork' ? tagTarget.id : undefined,
          relatedEpisode: tagTarget?.kind === 'episode' ? tagTarget.id : undefined,
          lines: lines.length > 0 ? lines.map((line) => line.id) : undefined,
          register: register || undefined,
          processStage: processStage || undefined,
          conceptualThread: conceptualThread || undefined,
          museumSourced: museumSourced || undefined,
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
        ? ' Processing queue failed — note saved; worker may pick it up later.'
        : ''
      setSuccess(
        `Field note #${created.id} saved (${created.processingStatus}).${queueNote} View in Notes.`,
      )
      setFile(null)
      setWrittenNote('')
      setLocationName('')
      setTagQuery('')
      setTagTarget(null)
      setRegister('')
      setProcessStage('')
      setConceptualThread('')
      setMuseumSourced(false)
      setShowMore(false)
      clearFileInputs()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="studio-upload" onSubmit={onSubmit}>
      <div className="studio-upload__field">
        <label htmlFor="studio-upload-media-type">Media type</label>
        <select
          id="studio-upload-media-type"
          value={mediaType}
          disabled={submitting}
          onChange={(event) => {
            const next = event.target.value as (typeof fieldNoteMediaTypes)[number]
            setMediaType(next)
            if (next === 'text') setFile(null)
          }}
        >
          {mediaTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {!isTextOnly ? (
        <div className="studio-upload__field">
          <span className="studio-upload__field-label" id="studio-upload-file-label">
            File
          </span>
          <div className="studio-upload__file-actions" role="group" aria-labelledby="studio-upload-file-label">
            <button
              type="button"
              className="studio-upload__file-action"
              disabled={submitting}
              onClick={() => libraryInputRef.current?.click()}
            >
              Choose file
            </button>
            <button
              type="button"
              className="studio-upload__file-action"
              disabled={submitting}
              onClick={() => cameraInputRef.current?.click()}
            >
              Use camera
            </button>
          </div>
          <input
            ref={libraryInputRef}
            id="studio-upload-file"
            type="file"
            accept={accept}
            disabled={submitting}
            hidden
            onChange={(event) => onFileChosen(event.target.files?.[0] ?? null)}
          />
          <input
            ref={cameraInputRef}
            id="studio-upload-camera"
            type="file"
            accept={accept}
            capture="environment"
            disabled={submitting}
            hidden
            onChange={(event) => onFileChosen(event.target.files?.[0] ?? null)}
          />
          {file ? <p className="studio-upload__file-selected">{file.name}</p> : null}
        </div>
      ) : null}

      <div className="studio-upload__field">
        <label htmlFor="studio-upload-note">
          {isTextOnly ? 'Note' : 'Written note (optional)'}
        </label>
        <textarea
          id="studio-upload-note"
          rows={isTextOnly ? 4 : 2}
          required={isTextOnly}
          disabled={submitting}
          value={writtenNote}
          onChange={(event) => setWrittenNote(event.target.value)}
        />
      </div>

      <div className="studio-upload__field">
        <label htmlFor="studio-upload-tag">Tag to (optional)</label>
        <input
          id="studio-upload-tag"
          type="search"
          placeholder="Search paintings or episodes…"
          value={tagQuery}
          disabled={submitting}
          onChange={(event) => {
            setTagQuery(event.target.value)
            setTagTarget(null)
          }}
        />
        {tagTarget ? (
          <p className="studio-upload__tag-selected">
            Tagged: {tagTarget.label}{' '}
            <button type="button" disabled={submitting} onClick={() => setTagTarget(null)}>
              Clear
            </button>
          </p>
        ) : null}
        {tagResults.length > 0 && !tagTarget ? (
          <ul className="studio-upload__tag-menu">
            {tagResults.map((target) => (
              <li key={`${target.kind}-${target.id}`}>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setTagTarget(target)
                    setTagQuery(target.label)
                    setTagResults([])
                  }}
                >
                  {target.kind === 'artwork' ? 'Painting' : 'Episode'}: {target.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="studio-upload__row">
        <div className="studio-upload__field">
          <label htmlFor="studio-upload-city">City</label>
          <input
            id="studio-upload-city"
            type="text"
            autoComplete="address-level2"
            disabled={submitting}
            value={city}
            onChange={(event) => setCity(event.target.value)}
          />
        </div>
        <div className="studio-upload__field">
          <label htmlFor="studio-upload-location">Location name</label>
          <input
            id="studio-upload-location"
            type="text"
            disabled={submitting}
            value={locationName}
            onChange={(event) => setLocationName(event.target.value)}
          />
        </div>
      </div>

      <LinesPicker value={lines} onChange={setLines} disabled={submitting} />

      {lockMediaTypeGroup === 'photos' ? (
        <label className="studio-filters__checkbox">
          <input
            type="checkbox"
            checked={museumSourced}
            disabled={submitting}
            onChange={(event) => setMuseumSourced(event.target.checked)}
          />
          Museum sourced
        </label>
      ) : null}

      <div className="studio-upload__more">
        <button
          type="button"
          className="studio-upload__more-toggle"
          disabled={submitting}
          onClick={() => setShowMore((open) => !open)}
        >
          {showMore ? 'Hide' : 'More'} tagging
        </button>
        {showMore ? (
          <div className="studio-upload__more-panel">
            <div className="studio-upload__chips-row">
              <div className="studio-upload__field">
                <label htmlFor="studio-upload-register">Register</label>
                <select
                  id="studio-upload-register"
                  value={register}
                  disabled={submitting}
                  onChange={(event) => setRegister(event.target.value)}
                >
                  <option value="">—</option>
                  {fieldNoteRegisters.map((value) => (
                    <option key={value} value={value}>
                      {mediaLabel(value)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="studio-upload__field">
                <label htmlFor="studio-upload-stage">Process stage</label>
                <select
                  id="studio-upload-stage"
                  value={processStage}
                  disabled={submitting}
                  onChange={(event) => setProcessStage(event.target.value)}
                >
                  <option value="">—</option>
                  {fieldNoteProcessStages.map((value) => (
                    <option key={value} value={value}>
                      {mediaLabel(value)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="studio-upload__field">
                <label htmlFor="studio-upload-thread">Conceptual thread</label>
                <select
                  id="studio-upload-thread"
                  value={conceptualThread}
                  disabled={submitting}
                  onChange={(event) => setConceptualThread(event.target.value)}
                >
                  <option value="">—</option>
                  {fieldNoteConceptualThreads.map((value) => (
                    <option key={value} value={value}>
                      {mediaLabel(value)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {error ? <p className="studio-upload__error">{error}</p> : null}
      {success ? <p className="studio-upload__success">{success}</p> : null}

      <button type="submit" className="studio-upload__submit" disabled={submitting}>
        {submitting ? 'Uploading…' : 'Upload field note'}
      </button>
    </form>
  )
}
