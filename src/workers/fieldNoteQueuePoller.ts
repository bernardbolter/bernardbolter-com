import type { Payload } from 'payload'

import { pollQueuedFieldNotes } from '@/lib/workers/processFieldNoteLogic'
import { shouldProcessFieldNotesNow } from '@/lib/workers/fieldNoteProcessingWindow'

const DEFAULT_POLL_INTERVAL_MS = 60_000

export function startFieldNoteQueuePoller(getPayload: () => Promise<Payload>): void {
  const intervalMs = Number.parseInt(
    process.env.FIELDNOTE_POLL_INTERVAL_MS ?? String(DEFAULT_POLL_INTERVAL_MS),
    10,
  )

  setInterval(() => {
    void (async () => {
      if (!shouldProcessFieldNotesNow()) return

      try {
        const payload = await getPayload()
        const count = await pollQueuedFieldNotes(payload)
        if (count > 0) {
          console.info(`[worker] processed ${count} queued field note(s)`)
        }
      } catch (error) {
        console.error('[worker] field note queue poller error', error)
      }
    })()
  }, intervalMs)

  console.info(
    `[worker] field note queue poller every ${intervalMs}ms (02:00–08:00 ${process.env.FIELDNOTE_PROCESSING_TZ ?? 'Europe/Berlin'})`,
  )
}
