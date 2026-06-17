import type { Payload } from 'payload'

import type { Session, User } from '@/payload-types'

import { getMediaSlot } from './artworkMediaSlots'
import { runImageAnalysis } from './runImageAnalysis'
import { ART_OFFICIAL_MODEL_VISION } from './sessionPhase'
import {
  stageArtworkMediaUpload,
  type MediaUploadPayload,
} from './stageArtworkMedia'
import { upsertTimelineEntry, type TimelineEntry } from './sessionTimeline'

export type ApplyMediaUploadResult = Awaited<ReturnType<typeof stageArtworkMediaUpload>> & {
  analysis?: Awaited<ReturnType<typeof runImageAnalysis>>
}

type SendFn = (event: string, data: unknown) => void

/** Convert a hex string array to Payload array-field shape: [{ hex }] */
function hexesToSwatches(hexes: string[]): Array<{ hex: string }> {
  return hexes.filter(Boolean).map((hex) => ({ hex }))
}

/** Stage a media slot on the session and optionally run vision analysis for images. */
export async function applyStagedMediaUpload(args: {
  payload: Payload
  user: User
  session: Session
  upload: MediaUploadPayload
  send?: SendFn
}): Promise<ApplyMediaUploadResult> {
  const staged = await stageArtworkMediaUpload({
    payload: args.payload,
    user: args.user,
    session: args.session,
    upload: args.upload,
  })

  if (staged.timeline) {
    args.session.fieldUpdateTimeline = staged.timeline as never
  }
  args.session.stagedMedia = staged.stagedMedia

  args.send?.('media-staged', {
    slotId: args.upload.slotId,
    attachment: staged.attachment,
  })

  if (staged.stagedTimelineEntry) {
    args.send?.('tool-staged', {
      name: 'update_field',
      input: {
        ...staged.stagedTimelineEntry,
        confidence: 'confirmed',
        source: 'conversation',
      },
    })
  }

  const slot = getMediaSlot(args.upload.slotId)
  const visionMediaId = args.upload.mediaId
  if (visionMediaId != null && slot?.kind === 'image') {
    const analysis = await runImageAnalysis({
      mediaId: visionMediaId,
      payload: args.payload,
      user: args.user,
    })
    args.send?.('image-analysis', { slotId: args.upload.slotId, ...analysis })

    // Auto-stage vision results to the session timeline so they are committed
    // even if the agent doesn't explicitly call trigger_image_analysis.
    const visionEntries: TimelineEntry[] = [
      {
        targetCollection: 'artworks',
        field: 'orientation',
        value: analysis.aspectRatio,
        confidence: 'inferred',
        source: 'image-analysis',
        timestamp: new Date().toISOString(),
      },
      {
        targetCollection: 'artworks',
        field: 'analysisModelVersion',
        value: ART_OFFICIAL_MODEL_VISION,
        confidence: 'inferred',
        source: 'image-analysis',
        timestamp: new Date().toISOString(),
      },
    ]

    if (analysis.dominantColors.length) {
      visionEntries.push({
        targetCollection: 'artworks',
        field: 'dominantColors',
        value: hexesToSwatches(analysis.dominantColors),
        confidence: 'inferred',
        source: 'image-analysis',
        timestamp: new Date().toISOString(),
      })
    }

    if (analysis.paintedFieldColors.length) {
      visionEntries.push({
        targetCollection: 'artworks',
        field: 'paintedFieldColors',
        value: hexesToSwatches(analysis.paintedFieldColors),
        confidence: 'inferred',
        source: 'image-analysis',
        timestamp: new Date().toISOString(),
      })
    }

    if (analysis.compositionalNotes) {
      visionEntries.push({
        targetCollection: 'artworks',
        field: 'compositionalNotes',
        value: analysis.compositionalNotes,
        confidence: 'inferred',
        source: 'image-analysis',
        timestamp: new Date().toISOString(),
      })
    }

    if (analysis.detectedSubjects.length > 0) {
      visionEntries.push({
        targetCollection: 'artworks',
        field: 'subjectTags',
        value: analysis.detectedSubjects,
        confidence: 'inferred',
        source: 'image-analysis',
        timestamp: new Date().toISOString(),
      })
    }

    // Merge into session timeline and persist
    let timeline = Array.isArray(args.session.fieldUpdateTimeline)
      ? [...(args.session.fieldUpdateTimeline as TimelineEntry[])]
      : []
    for (const entry of visionEntries) {
      timeline = upsertTimelineEntry(timeline, entry)
    }
    args.session.fieldUpdateTimeline = timeline as never

    try {
      await args.payload.update({
        collection: 'sessions',
        id: args.session.id,
        data: { fieldUpdateTimeline: timeline },
        overrideAccess: false,
        user: args.user,
        context: { skipAgent: true },
      })
    } catch (err) {
      console.error('[applyStagedMediaUpload] failed to persist vision timeline entries', err)
    }

    // Emit tool-staged events so the sidebar updates immediately
    for (const entry of visionEntries) {
      args.send?.('tool-staged', {
        name: 'update_field',
        input: entry,
      })
    }

    return { ...staged, analysis }
  }

  return staged
}
