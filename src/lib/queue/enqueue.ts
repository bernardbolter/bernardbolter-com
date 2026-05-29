import { getBoss } from '@/lib/queue/pgboss'
import { JOB_NAMES, type ProcessFieldNotePayload } from '@/lib/queue/jobs'

export async function enqueueProcessFieldNote(fieldNoteId: number): Promise<string | null> {
  const boss = await getBoss()
  const payload: ProcessFieldNotePayload = { fieldNoteId }
  return boss.send(JOB_NAMES.PROCESS_FIELD_NOTE, payload)
}
