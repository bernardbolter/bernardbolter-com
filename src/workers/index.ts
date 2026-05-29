import 'dotenv/config'

import { getBoss } from '@/lib/queue/pgboss'
import { registerGenerateEmbeddingsWorker } from '@/workers/handlers/generateEmbeddings'
import { registerGenerateTimelapseWorker } from '@/workers/handlers/generateTimelapse'
import { registerPatternReportWorker } from '@/workers/handlers/patternReport'
import { registerProcessFieldNoteWorker } from '@/workers/handlers/processFieldNote'
import { registerSuggestLinesWorker } from '@/workers/handlers/suggestLines'
import { registerSuggestTagsWorker } from '@/workers/handlers/suggestTags'

async function main() {
  const boss = await getBoss()

  await registerProcessFieldNoteWorker(boss)
  await registerGenerateTimelapseWorker(boss)
  await registerSuggestTagsWorker(boss)
  await registerGenerateEmbeddingsWorker(boss)
  await registerSuggestLinesWorker(boss)
  await registerPatternReportWorker(boss)

  console.info('[worker] pg-boss workers started')

  const shutdown = async () => {
    console.info('[worker] shutting down…')
    await boss.stop()
    process.exit(0)
  }

  process.on('SIGINT', () => void shutdown())
  process.on('SIGTERM', () => void shutdown())
}

main().catch((error) => {
  console.error('[worker] failed to start', error)
  process.exit(1)
})
