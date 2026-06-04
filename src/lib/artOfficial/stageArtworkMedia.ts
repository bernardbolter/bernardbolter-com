import type { Payload } from 'payload'

import type { User } from '@/payload-types'

import { detectVideoEmbedType, getMediaSlot } from './artworkMediaSlots'
import { appendSessionTimelineEntry } from './sessionTimeline'
import type { StagedMediaAttachment } from './stagedMedia'

export type MediaUploadPayload = {
  slotId: string
  mediaId?: number
  url?: string
  caption?: string
  videoRole?: string
  title?: string
  skip?: boolean
}

function parseStagedMedia(raw: unknown): StagedMediaAttachment[] {
  if (!Array.isArray(raw)) return []
  return raw as StagedMediaAttachment[]
}

export async function stageArtworkMediaUpload(args: {
  payload: Payload
  user: User
  session: {
    id: number
    fieldUpdateTimeline?: unknown
    stagedMedia?: unknown
  }
  upload: MediaUploadPayload
}): Promise<{
  timeline?: unknown
  stagedMedia: StagedMediaAttachment[]
  stagedTimelineEntry?: {
    targetCollection: string
    field: string
    value: unknown
  }
  attachment: StagedMediaAttachment
}> {
  const slot = getMediaSlot(args.upload.slotId)
  if (!slot) {
    throw new Error(`Unknown media slot: ${args.upload.slotId}`)
  }

  const stagedMedia = parseStagedMedia(args.session.stagedMedia)
  const now = new Date().toISOString()

  if (args.upload.skip) {
    const attachment: StagedMediaAttachment = {
      slotId: slot.id,
      kind: 'skipped',
      stagedAt: now,
    }
    const next = [...stagedMedia.filter((r) => r.slotId !== slot.id), attachment]
    await args.payload.update({
      collection: 'sessions',
      id: args.session.id,
      data: { stagedMedia: next },
      overrideAccess: false,
      user: args.user,
      context: { skipAgent: true },
    })
    return { stagedMedia: next, attachment }
  }

  if (slot.kind === 'image' || slot.kind === 'video-file') {
    if (args.upload.mediaId == null) {
      throw new Error('mediaId is required for file uploads.')
    }
  }

  if (slot.kind === 'video-url') {
    if (!args.upload.url?.trim()) {
      throw new Error('url is required for video link slots.')
    }
    const embed = detectVideoEmbedType(args.upload.url)
    if (!embed) {
      throw new Error('Enter a valid http(s) URL (YouTube, Vimeo, or other embeddable link).')
    }
  }

  if (slot.kind === 'video-array') {
    const hasFile = args.upload.mediaId != null
    const hasUrl = Boolean(args.upload.url?.trim())
    if (!hasFile && !hasUrl) {
      throw new Error('Provide a video file or a YouTube/Vimeo/URL link.')
    }
  }

  const attachment: StagedMediaAttachment = {
    slotId: slot.id,
    kind:
      slot.kind === 'video-url'
        ? 'video-url'
        : slot.kind === 'video-array'
          ? args.upload.mediaId != null
            ? 'video-array'
            : 'video-url'
          : slot.kind === 'video-file'
            ? 'video-file'
            : 'image',
    mediaId: args.upload.mediaId,
    url: args.upload.url?.trim(),
    videoType: args.upload.url
      ? (detectVideoEmbedType(args.upload.url) ?? 'url')
      : args.upload.mediaId != null
        ? 'upload'
        : undefined,
    caption: args.upload.caption,
    videoRole: args.upload.videoRole,
    title: args.upload.title,
    stagedAt: now,
  }

  let timeline = args.session.fieldUpdateTimeline
  let stagedTimelineEntry: {
    targetCollection: string
    field: string
    value: unknown
  } | undefined

  if (slot.field && (slot.kind === 'image' || slot.kind === 'video-file' || slot.kind === 'video-url')) {
    const value =
      slot.kind === 'video-url' ? args.upload.url!.trim() : args.upload.mediaId!
    timeline = await appendSessionTimelineEntry(
      args.payload,
      args.user,
      { id: args.session.id, fieldUpdateTimeline: timeline },
      {
        targetCollection: 'artworks',
        field: slot.field,
        value,
        confidence: 'confirmed',
        source: 'conversation',
      },
    )
    stagedTimelineEntry = {
      targetCollection: 'artworks',
      field: slot.field,
      value,
    }
  }

  const nextStaged =
    slot.arrayField != null || slot.nestedArrayPath != null
      ? [...stagedMedia, attachment]
      : [...stagedMedia.filter((r) => r.slotId !== slot.id), attachment]

  await args.payload.update({
    collection: 'sessions',
    id: args.session.id,
    data: { stagedMedia: nextStaged },
    overrideAccess: false,
    user: args.user,
    context: { skipAgent: true },
  })

  return {
    timeline,
    stagedMedia: nextStaged,
    stagedTimelineEntry,
    attachment,
  }
}
