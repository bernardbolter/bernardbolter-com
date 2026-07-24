import type { Payload } from 'payload'

import type { Session, User } from '@/payload-types'

import { getMediaSlot } from './artworkMediaSlots'
import {
  formatConflictQuestion,
  isMateriallyDifferent,
  mergePriorFieldConflicts,
  mergeStruggleFlag,
  readCommittedArtworkField,
  type PriorFieldConflictRow,
} from './automaticFieldConflicts'
import { checkDescriptionUploadMismatch } from './descriptionUploadMismatch'
import { runImageAnalysis } from './runImageAnalysis'
import { ART_OFFICIAL_MODEL_VISION } from './sessionPhase'
import {
  stageArtworkMediaUpload,
  type MediaUploadPayload,
} from './stageArtworkMedia'
import { upsertTimelineEntry, type TimelineEntry } from './sessionTimeline'

export type ApplyMediaUploadResult = Awaited<ReturnType<typeof stageArtworkMediaUpload>> & {
  analysis?: Awaited<ReturnType<typeof runImageAnalysis>>
  conflictQuestion?: string | null
  descriptionMismatch?: string | null
}

type SendFn = (event: string, data: unknown) => void

/** Convert a hex string array to Payload array-field shape: [{ hex }] */
function hexesToSwatches(hexes: string[]): Array<{ hex: string }> {
  return hexes.filter(Boolean).map((hex) => ({ hex }))
}

function sessionArtworkId(session: Session): number | null {
  if (typeof session.primaryArtwork === 'number') return session.primaryArtwork
  if (session.primaryArtwork && typeof session.primaryArtwork === 'object') {
    return session.primaryArtwork.id
  }
  if (typeof session.artworkRecord === 'number') return session.artworkRecord
  if (session.artworkRecord && typeof session.artworkRecord === 'object') {
    return session.artworkRecord.id
  }
  return null
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

    const artworkId = sessionArtworkId(args.session)
    const artwork =
      artworkId != null
        ? await args.payload.findByID({
            collection: 'artworks',
            id: artworkId,
            depth: 0,
            overrideAccess: false,
            user: args.user,
          })
        : null

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

    let timeline = Array.isArray(args.session.fieldUpdateTimeline)
      ? [...(args.session.fieldUpdateTimeline as TimelineEntry[])]
      : []
    let priorFieldConflicts = Array.isArray(args.session.priorFieldConflicts)
      ? [...(args.session.priorFieldConflicts as PriorFieldConflictRow[])]
      : []
    const heldConflicts: PriorFieldConflictRow[] = []

    for (const entry of visionEntries) {
      const field = entry.field ?? ''
      if (field === 'analysisModelVersion') {
        timeline = upsertTimelineEntry(timeline, entry)
        continue
      }
      const committed = readCommittedArtworkField(artwork, field)
      if (isMateriallyDifferent(committed, entry.value)) {
        const conflict: PriorFieldConflictRow = {
          field,
          priorValue: committed,
          newValue: entry.value,
          resolution: 'unresolved',
        }
        priorFieldConflicts = mergePriorFieldConflicts(priorFieldConflicts, conflict)
        heldConflicts.push(conflict)
        continue
      }
      timeline = upsertTimelineEntry(timeline, entry)
    }

    args.session.fieldUpdateTimeline = timeline as never
    args.session.priorFieldConflicts = priorFieldConflicts as never

    const mismatch = checkDescriptionUploadMismatch({
      firstImpression: args.session.firstImpression,
      compositionalNotes: analysis.compositionalNotes,
      detectedSubjects: analysis.detectedSubjects,
      dominantColors: analysis.dominantColors,
    })

    let sessionStruggleFlag = args.session.sessionStruggleFlag
    if (mismatch.mismatch) {
      sessionStruggleFlag = mergeStruggleFlag(
        sessionStruggleFlag,
        'description-upload-mismatch',
        mismatch.message ?? undefined,
      )
      args.session.sessionStruggleFlag = sessionStruggleFlag as never
    }

    try {
      await args.payload.update({
        collection: 'sessions',
        id: args.session.id,
        data: {
          fieldUpdateTimeline: timeline,
          priorFieldConflicts: priorFieldConflicts as Session['priorFieldConflicts'],
          ...(mismatch.mismatch
            ? { sessionStruggleFlag: sessionStruggleFlag as Session['sessionStruggleFlag'] }
            : {}),
        },
        overrideAccess: false,
        user: args.user,
        context: { skipAgent: true },
      })
    } catch (err) {
      console.error('[applyStagedMediaUpload] failed to persist vision timeline entries', err)
    }

    for (const entry of visionEntries) {
      if (heldConflicts.some((c) => c.field === entry.field)) continue
      args.send?.('tool-staged', {
        name: 'update_field',
        input: entry,
      })
    }

    const conflictQuestion =
      heldConflicts.length > 0 ? formatConflictQuestion(heldConflicts) : null
    if (conflictQuestion) {
      args.send?.('field-conflicts', { message: conflictQuestion, conflicts: heldConflicts })
    }
    if (mismatch.mismatch && mismatch.message) {
      args.send?.('description-mismatch', { message: mismatch.message })
    }

    return {
      ...staged,
      analysis,
      conflictQuestion,
      descriptionMismatch: mismatch.message,
    }
  }

  return staged
}
