import { enqueueProcessFieldNote } from '@/lib/queue/enqueue'

export async function queueProcessFieldNote(fieldNoteId: number): Promise<void> {
  await enqueueProcessFieldNote(fieldNoteId)
}
