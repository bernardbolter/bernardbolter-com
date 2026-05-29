import type { PgBoss } from 'pg-boss'

import { JOB_NAMES } from '@/lib/queue/jobs'

/** Stub — Line suggestion job from new FieldNote embeddings (Phase H). */
export async function registerSuggestLinesWorker(boss: PgBoss): Promise<void> {
  await boss.work(JOB_NAMES.SUGGEST_LINES, async () => {
    console.warn(`[worker] ${JOB_NAMES.SUGGEST_LINES} stub — not implemented`)
  })
}
