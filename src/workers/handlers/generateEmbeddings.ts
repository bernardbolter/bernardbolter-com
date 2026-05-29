import type { PgBoss } from 'pg-boss'

import { JOB_NAMES } from '@/lib/queue/jobs'

/**
 * Stub — embedding generation for FieldNotes, Artworks, Episodes, StudioConversations
 * (Phase E / G).
 */
export async function registerGenerateEmbeddingsWorker(boss: PgBoss): Promise<void> {
  await boss.work(JOB_NAMES.GENERATE_EMBEDDINGS, async () => {
    console.warn(`[worker] ${JOB_NAMES.GENERATE_EMBEDDINGS} stub — not implemented`)
  })
}
