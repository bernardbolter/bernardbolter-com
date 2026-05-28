import type { ArtworkMediaSlot } from './artworkMediaSlots'
import { ARTWORK_MEDIA_SLOTS, getMediaSlot } from './artworkMediaSlots'
import type { TimelineEntry } from './sessionTimeline'

export type StagedMediaAttachment = {
  slotId: string
  kind: 'image' | 'video-file' | 'video-url' | 'video-array' | 'skipped'
  mediaId?: number
  url?: string
  videoType?: 'youtube' | 'vimeo' | 'url' | 'upload'
  caption?: string
  videoRole?: string
  title?: string
  stagedAt: string
}

export type MediaSlotStatus = 'pending' | 'staged' | 'skipped' | 'locked'

export type MediaSlotState = {
  slot: ArtworkMediaSlot
  status: MediaSlotStatus
  attachments: StagedMediaAttachment[]
  timelineValue?: unknown
  highlighted?: boolean
}

function parseStagedMedia(raw: unknown): StagedMediaAttachment[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (row): row is StagedMediaAttachment =>
      typeof row === 'object' &&
      row !== null &&
      typeof (row as StagedMediaAttachment).slotId === 'string',
  )
}

function timelineValueForField(
  timeline: TimelineEntry[],
  field: string,
): unknown | undefined {
  const matches = timeline.filter(
    (e) => e.targetCollection === 'artworks' && e.field === field,
  )
  if (!matches.length) return undefined
  return matches[matches.length - 1]?.value
}

function attachmentsForSlot(
  stagedMedia: StagedMediaAttachment[],
  slotId: string,
): StagedMediaAttachment[] {
  return stagedMedia.filter((a) => a.slotId === slotId && a.kind !== 'skipped')
}

export function resolveMediaSlotStates(args: {
  timeline: TimelineEntry[]
  stagedMedia?: unknown
  hasPrimary: boolean
  highlightedMediaSlot?: string | null
  isAchWork?: boolean
}): MediaSlotState[] {
  const staged = parseStagedMedia(args.stagedMedia)
  const slots = ARTWORK_MEDIA_SLOTS.filter((s) => {
    if (s.achOnly && args.isAchWork === false) return false
    return true
  })

  return slots.map((slot) => {
    const attachments = attachmentsForSlot(staged, slot.id)
    const skipped = staged.some((a) => a.slotId === slot.id && a.kind === 'skipped')
    const timelineValue = slot.field
      ? timelineValueForField(args.timeline, slot.field)
      : undefined

    let status: MediaSlotStatus = 'pending'
    if (skipped) status = 'skipped'
    else if (slot.id === 'primary' && !args.hasPrimary) status = 'locked'
    else if (timelineValue != null && timelineValue !== '') status = 'staged'
    else if (attachments.length > 0) status = 'staged'
    else if (slot.id === 'primary' && args.hasPrimary) status = 'staged'

    return {
      slot,
      status,
      attachments,
      timelineValue,
      highlighted: args.highlightedMediaSlot === slot.id,
    }
  })
}

/** Merge staged media attachments into an artwork patch (after timeline patch). */
export function mergeStagedMediaIntoArtworkPatch(
  patch: Record<string, unknown>,
  stagedMedia: unknown,
): Record<string, unknown> {
  const rows = parseStagedMedia(stagedMedia)
  const out = { ...patch }

  for (const row of rows) {
    if (row.kind === 'skipped') continue
    const slot = getMediaSlot(row.slotId)
    if (!slot) continue

    if (slot.field && row.kind === 'image' && row.mediaId != null) {
      setDottedPath(out, slot.field, row.mediaId)
      continue
    }
    if (slot.field && row.kind === 'video-file' && row.mediaId != null) {
      setDottedPath(out, slot.field, row.mediaId)
      continue
    }
    if (slot.field && row.kind === 'video-url' && row.url) {
      setDottedPath(out, slot.field, row.url.trim())
      continue
    }

    if (slot.arrayField === 'detailImages' && row.kind === 'image' && row.mediaId != null) {
      appendArrayRow(out, 'detailImages', {
        image: row.mediaId,
        ...(row.caption ? { caption: row.caption } : {}),
      })
      continue
    }
    if (
      slot.arrayField === 'alternateViewImages' &&
      row.kind === 'image' &&
      row.mediaId != null
    ) {
      appendArrayRow(out, 'alternateViewImages', {
        image: row.mediaId,
        ...(row.caption ? { caption: row.caption } : {}),
      })
      continue
    }
    if (
      slot.arrayField === 'documentationImages' &&
      row.kind === 'image' &&
      row.mediaId != null
    ) {
      appendArrayRow(out, 'documentationImages', {
        image: row.mediaId,
        ...(row.caption ? { caption: row.caption } : {}),
      })
      continue
    }
    if (
      slot.arrayField === 'installationShots' &&
      row.kind === 'image' &&
      row.mediaId != null
    ) {
      appendArrayRow(out, 'installationShots', { image: row.mediaId })
      continue
    }
    if (slot.arrayField === 'videos') {
      const videoType =
        row.videoType ??
        (row.mediaId != null ? 'upload' : row.url ? detectUrlVideoType(row.url) : null)
      if (!videoType) continue
      appendArrayRow(out, 'videos', {
        videoType,
        ...(row.mediaId != null ? { videoFile: row.mediaId } : {}),
        ...(row.url ? { videoUrl: row.url.trim() } : {}),
        ...(row.videoRole ? { videoRole: row.videoRole } : {}),
        ...(row.title ? { title: row.title } : {}),
      })
    }
  }

  return out
}

function detectUrlVideoType(url: string): 'youtube' | 'vimeo' | 'url' {
  try {
    const host = new URL(url.trim()).hostname.replace(/^www\./, '')
    if (host.includes('youtu')) return 'youtube'
    if (host.includes('vimeo')) return 'vimeo'
  } catch {
    /* ignore */
  }
  return 'url'
}

function appendArrayRow(
  patch: Record<string, unknown>,
  field: string,
  row: Record<string, unknown>,
): void {
  const existing = patch[field]
  const arr = Array.isArray(existing) ? [...existing] : []
  arr.push(row)
  patch[field] = arr
}

function setDottedPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const segments = path.split('.').filter(Boolean)
  if (!segments.length) return
  let cursor: Record<string, unknown> = obj
  for (let i = 0; i < segments.length - 1; i += 1) {
    const key = segments[i]
    const next = cursor[key]
    if (next == null || typeof next !== 'object' || Array.isArray(next)) {
      cursor[key] = {}
    }
    cursor = cursor[key] as Record<string, unknown>
  }
  cursor[segments[segments.length - 1]] = value
}

export function formatMediaStatusForAgent(
  states: MediaSlotState[],
): Record<string, { status: MediaSlotStatus; count: number }> {
  const out: Record<string, { status: MediaSlotStatus; count: number }> = {}
  for (const s of states) {
    const count =
      s.status === 'staged'
        ? s.attachments.length || (s.timelineValue != null ? 1 : 0)
        : 0
    out[s.slot.id] = { status: s.status, count }
  }
  return out
}
