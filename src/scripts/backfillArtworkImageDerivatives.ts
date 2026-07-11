/**
 * Queue resize-image-backfill for all published artworks with primary images.
 * Requires a running worker: npm run worker
 *
 * For local one-off backfill without Hetzner/pg-boss, use:
 *   npm run backfill:images:local
 *
 * Usage: npm run backfill:images
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

import { enqueueResizeImageBackfill } from '@/lib/queue/enqueue'

async function main() {
  const jobId = await enqueueResizeImageBackfill()
  console.log(`Queued resize-image-backfill job: ${jobId ?? '(unknown id)'}`)
  console.log('Ensure the worker process is running: npm run worker')
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
