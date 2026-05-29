import type { PgBoss } from 'pg-boss'

import { JOB_NAMES } from '@/lib/queue/jobs'

/** Stub — timelapse assembly runs on Hetzner in Phase E. */
export async function registerGenerateTimelapseWorker(boss: PgBoss): Promise<void> {
  await boss.work(JOB_NAMES.GENERATE_TIMELAPSE, async () => {
    console.warn(`[worker] ${JOB_NAMES.GENERATE_TIMELAPSE} stub — not implemented`)
  })
}
