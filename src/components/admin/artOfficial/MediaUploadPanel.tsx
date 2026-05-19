'use client'

import { Button } from '@payloadcms/ui'
import { useEffect, useMemo, useState } from 'react'

import { getMediaSlot, type MediaSlotPhase } from '@/lib/artOfficial/artworkMediaSlots'
import type { MediaUploadPayload } from '@/lib/artOfficial/stageArtworkMedia'
import {
  resolveMediaSlotStates,
  type MediaSlotState,
} from '@/lib/artOfficial/stagedMedia'

import { ImageUpload } from './ImageUpload'
import type { TimelineEntry } from './types'

const PHASE_HEADINGS: Record<MediaSlotPhase, string> = {
  primary: 'Primary',
  ach: 'A Colorful History',
  secondary: 'More views of the work',
  documentation: 'Documentation',
  video: 'Video',
}

const PHASE_ORDER: MediaSlotPhase[] = [
  'primary',
  'ach',
  'secondary',
  'documentation',
  'video',
]

function slotStatusLabel(status: MediaSlotState['status'], count: number): string {
  if (status === 'staged') return count > 1 ? `Uploaded (${count})` : 'Uploaded'
  if (status === 'skipped') return 'N/A'
  if (status === 'locked') return 'Needs primary'
  return 'Pending'
}

function isSlotAddressed(status: MediaSlotState['status']): boolean {
  return status === 'staged' || status === 'skipped'
}

function VideoUrlForm({
  onSubmit,
  disabled,
}: {
  onSubmit: (url: string) => void
  disabled?: boolean
}) {
  const [url, setUrl] = useState('')
  return (
    <div className="art-official-media__url-form">
      <input
        type="url"
        className="art-official-media__url-input"
        placeholder="https://youtube.com/… or https://vimeo.com/…"
        value={url}
        disabled={disabled}
        onChange={(e) => setUrl(e.target.value)}
      />
      <Button
        buttonStyle="secondary"
        disabled={disabled || !url.trim()}
        onClick={() => {
          onSubmit(url.trim())
          setUrl('')
        }}
      >
        Add link
      </Button>
    </div>
  )
}

function MediaSlotBody({
  state,
  disabled,
  onFileUploaded,
  onUrlSubmit,
  onSkip,
}: {
  state: MediaSlotState
  disabled?: boolean
  onFileUploaded: (slotId: string, mediaId: number) => void
  onUrlSubmit: (slotId: string, url: string) => void
  onSkip: (slotId: string) => void
}) {
  const { slot, status } = state
  const acceptsVideo = slot.kind === 'video-file' || slot.kind === 'video-array'
  const acceptsImage = slot.kind === 'image'
  const showUrl =
    slot.kind === 'video-url' || (slot.kind === 'video-array' && status !== 'skipped')

  if (status !== 'pending' && !(slot.arrayField && status === 'staged')) {
    return (
      <p className="art-official-media__slot-done-note">
        {status === 'skipped'
          ? 'Marked as not applicable for this work.'
          : 'Uploaded — expand again to add another file if this slot allows multiples.'}
      </p>
    )
  }

  return (
    <>
      <p className="art-official-media__slot-desc">{slot.description}</p>
      <div className="art-official-media__slot-actions">
        {(acceptsImage || acceptsVideo) && (
          <ImageUpload
            accept={
              acceptsVideo && !acceptsImage
                ? 'video/mp4,video/webm,video/quicktime'
                : acceptsVideo
                  ? 'image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime'
                  : 'image/jpeg,image/png,image/webp'
            }
            altLabel={slot.label}
            disabled={disabled || status === 'locked'}
            onUploaded={(id) => onFileUploaded(slot.id, id)}
          />
        )}
        {showUrl ? (
          <VideoUrlForm
            disabled={disabled || status === 'locked'}
            onSubmit={(url) => onUrlSubmit(slot.id, url)}
          />
        ) : null}
        {status !== 'staged' || slot.arrayField ? (
          <Button
            buttonStyle="secondary"
            disabled={disabled || status === 'locked'}
            onClick={() => onSkip(slot.id)}
          >
            Not applicable
          </Button>
        ) : null}
      </div>
    </>
  )
}

function MediaSlotAccordion({
  state,
  disabled,
  open,
  onToggle,
  onFileUploaded,
  onUrlSubmit,
  onSkip,
}: {
  state: MediaSlotState
  disabled?: boolean
  open: boolean
  onToggle: (open: boolean) => void
  onFileUploaded: (slotId: string, mediaId: number) => void
  onUrlSubmit: (slotId: string, url: string) => void
  onSkip: (slotId: string) => void
}) {
  const { slot, status } = state
  const count = state.attachments.length || (state.timelineValue != null ? 1 : 0)

  return (
    <details
      className={[
        'art-official-media__acc',
        'art-official-media__acc--slot',
        state.highlighted ? 'art-official-media__acc--highlighted' : '',
        status === 'staged' ? 'art-official-media__acc--done' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      id={`media-slot-${slot.id}`}
      open={open}
      onToggle={(e) => onToggle((e.target as HTMLDetailsElement).open)}
    >
      <summary className="art-official-media__acc-summary">
        <span className="art-official-media__acc-label">{slot.label}</span>
        <span className={`art-official-media__status art-official-media__status--${status}`}>
          {slotStatusLabel(status, count)}
        </span>
      </summary>
      <div className="art-official-media__acc-body">
        <MediaSlotBody
          state={state}
          disabled={disabled}
          onFileUploaded={onFileUploaded}
          onUrlSubmit={onUrlSubmit}
          onSkip={onSkip}
        />
      </div>
    </details>
  )
}

export function MediaUploadPanel({
  timeline,
  stagedMedia,
  highlightedMediaSlot,
  hasPrimary,
  disabled,
  onMediaAction,
}: {
  timeline: TimelineEntry[]
  stagedMedia?: unknown
  highlightedMediaSlot?: string | null
  hasPrimary: boolean
  disabled?: boolean
  onMediaAction: (upload: MediaUploadPayload, label: string) => void
}) {
  const states = useMemo(
    () =>
      resolveMediaSlotStates({
        timeline,
        stagedMedia,
        hasPrimary,
        highlightedMediaSlot,
        isAchWork: true,
      }),
    [timeline, stagedMedia, hasPrimary, highlightedMediaSlot],
  )

  const [panelOpen, setPanelOpen] = useState(false)
  const [phaseOpen, setPhaseOpen] = useState<Partial<Record<MediaSlotPhase, boolean>>>({})
  const [slotOpen, setSlotOpen] = useState<Partial<Record<string, boolean>>>({})

  const pendingCount = states.filter((s) => s.status === 'pending').length
  const addressedCount = states.filter((s) => isSlotAddressed(s.status)).length

  const byPhase = states.reduce<Record<string, MediaSlotState[]>>((acc, state) => {
    const key = state.slot.phase
    if (!acc[key]) acc[key] = []
    acc[key].push(state)
    return acc
  }, {})

  useEffect(() => {
    if (!highlightedMediaSlot) return
    const slot = getMediaSlot(highlightedMediaSlot)
    if (!slot) return
    setPanelOpen(true)
    setPhaseOpen((p) => ({ ...p, [slot.phase]: true }))
    setSlotOpen((s) => ({ ...s, [highlightedMediaSlot]: true }))
  }, [highlightedMediaSlot])

  return (
    <section className="art-official-media" aria-labelledby="media-uploads-heading">
      <details
        className="art-official-media__acc art-official-media__acc--root"
        open={panelOpen}
        onToggle={(e) => setPanelOpen((e.target as HTMLDetailsElement).open)}
      >
        <summary className="art-official-media__acc-summary art-official-media__acc-summary--root">
          <span id="media-uploads-heading" className="art-official-media__root-label">
            Media uploads
          </span>
          <span className="art-official-media__root-meta">
            {states.length} items · {addressedCount} addressed
            {pendingCount > 0 ? ` · ${pendingCount} pending` : ''}
          </span>
        </summary>

        <div className="art-official-media__panel-inner">
          <p className="art-official-media__intro">
            Expand a section to upload. Images go to R2; stills are visible to Art/Official.
            Use <strong>Not applicable</strong> when a slot does not fit.
          </p>

          <div className="art-official-media__tree">
            {PHASE_ORDER.map((phase) => {
              const group = byPhase[phase]
              if (!group?.length) return null
              const phaseDone = group.filter((s) => isSlotAddressed(s.status)).length
              const phasePending = group.filter((s) => s.status === 'pending').length

              return (
                <details
                  key={phase}
                  className="art-official-media__acc art-official-media__acc--phase"
                  open={Boolean(phaseOpen[phase])}
                  onToggle={(e) => {
                    const open = (e.target as HTMLDetailsElement).open
                    setPhaseOpen((p) => ({ ...p, [phase]: open }))
                  }}
                >
                  <summary className="art-official-media__acc-summary art-official-media__acc-summary--phase">
                    <span className="art-official-media__acc-label">
                      {PHASE_HEADINGS[phase]}
                    </span>
                    <span className="art-official-media__phase-meta">
                      {group.length} slots · {phaseDone} done
                      {phasePending > 0 ? ` · ${phasePending} pending` : ''}
                    </span>
                  </summary>
                  <div className="art-official-media__phase-slots">
                    {group.map((state) => (
                      <MediaSlotAccordion
                        key={state.slot.id}
                        state={state}
                        disabled={disabled}
                        open={Boolean(slotOpen[state.slot.id])}
                        onToggle={(open) =>
                          setSlotOpen((s) => ({ ...s, [state.slot.id]: open }))
                        }
                        onFileUploaded={(slotId, mediaId) => {
                          onMediaAction({ slotId, mediaId }, state.slot.label)
                        }}
                        onUrlSubmit={(slotId, url) => {
                          onMediaAction({ slotId, url }, state.slot.label)
                        }}
                        onSkip={(slotId) => {
                          onMediaAction({ slotId, skip: true }, state.slot.label)
                        }}
                      />
                    ))}
                  </div>
                </details>
              )
            })}
          </div>
        </div>
      </details>
    </section>
  )
}
