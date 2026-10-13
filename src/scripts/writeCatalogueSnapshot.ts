/**
 * Pull the published catalogue from Payload and write `.cache/catalogue-layout.json`.
 * Local frontend work then reads that file instead of the SSH tunnel.
 *
 * Usage: pnpm snapshot:catalogue
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

import { refreshDevCatalogueSnapshotFromPayload } from '@/lib/payload/layoutData'
import { DEV_CATALOGUE_SNAPSHOT_PATH } from '@/lib/payload/devCatalogueSnapshot'

async function main() {
  const count = await refreshDevCatalogueSnapshotFromPayload()
  console.info(`Wrote ${count} works to ${DEV_CATALOGUE_SNAPSHOT_PATH}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
