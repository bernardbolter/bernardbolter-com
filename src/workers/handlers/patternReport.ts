import type { PgBoss } from 'pg-boss'

import { JOB_NAMES } from '@/lib/queue/jobs'

/** Stub — weekly pattern report across corpus (Phase H). */
export async function registerPatternReportWorker(boss: PgBoss): Promise<void> {
  await boss.work(JOB_NAMES.PATTERN_REPORT, async () => {
    console.warn(`[worker] ${JOB_NAMES.PATTERN_REPORT} stub — not implemented`)
  })
}
