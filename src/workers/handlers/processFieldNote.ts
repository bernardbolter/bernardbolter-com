import type { Job, PgBoss } from 'pg-boss'
import { getPayload } from 'payload'

import config from '@payload-config'
import { JOB_NAMES, type ProcessFieldNotePayload } from '@/lib/queue/jobs'
import { processFieldNoteJobs } from '@/lib/workers/processFieldNoteLogic'

export async function handleProcessFieldNote(jobs: Job<ProcessFieldNotePayload>[]) {
  const payload = await getPayload({ config })
  await processFieldNoteJobs(payload, jobs)
}

export async function registerProcessFieldNoteWorker(boss: PgBoss): Promise<void> {
  await boss.work(JOB_NAMES.PROCESS_FIELD_NOTE, handleProcessFieldNote)
}
