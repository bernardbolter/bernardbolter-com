import type { PgBoss } from 'pg-boss'

import { JOB_NAMES } from '@/lib/queue/jobs'

/** Stub — untagged FieldNote suggestion pass (Phase F / H). */
export async function registerSuggestTagsWorker(boss: PgBoss): Promise<void> {
  await boss.work(JOB_NAMES.SUGGEST_TAGS, async () => {
    console.warn(`[worker] ${JOB_NAMES.SUGGEST_TAGS} stub — not implemented`)
  })
}
