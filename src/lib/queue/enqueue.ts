import { getBoss } from '@/lib/queue/pgboss'
import {
  JOB_NAMES,
  type GenerateTimelapsePayload,
  type ProcessFieldNotePayload,
  type ResizeImageOnUploadPayload,
} from '@/lib/queue/jobs'

export async function enqueueProcessFieldNote(fieldNoteId: number): Promise<string | null> {
  const boss = await getBoss()
  const payload: ProcessFieldNotePayload = { fieldNoteId }
  return boss.send(JOB_NAMES.PROCESS_FIELD_NOTE, payload)
}

export async function enqueueGenerateTimelapse(artworkId: number): Promise<string | null> {
  const boss = await getBoss()
  const payload: GenerateTimelapsePayload = { artworkId }
  return boss.send(JOB_NAMES.GENERATE_TIMELAPSE, payload)
}

export async function enqueueResizeImageOnUpload(
  slug: string,
  imageUrl: string,
): Promise<string | null> {
  const boss = await getBoss()
  const payload: ResizeImageOnUploadPayload = { slug, imageUrl }
  return boss.send(JOB_NAMES.RESIZE_IMAGE_ON_UPLOAD, payload)
}

export async function enqueueResizeImageBackfill(): Promise<string | null> {
  const boss = await getBoss()
  return boss.send(JOB_NAMES.RESIZE_IMAGE_BACKFILL, {})
}
