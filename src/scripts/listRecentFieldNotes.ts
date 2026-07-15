/**
 * List recent field notes and inbox media (server diagnostics).
 *
 * Usage: npx tsx src/scripts/listRecentFieldNotes.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

import { getPayload } from 'payload'

import config from '@payload-config'
import { INBOX_PREFIX } from '@/lib/studio/fieldNoteLocalPaths'

async function main() {
  const payload = await getPayload({ config })

  const notes = await payload.find({
    collection: 'field-notes',
    sort: '-createdAt',
    limit: 10,
    depth: 0,
    overrideAccess: true,
  })

  console.log(`field-notes total: ${notes.totalDocs}`)
  for (const doc of notes.docs) {
    const mediaId =
      typeof doc.mediaFile === 'number' ? doc.mediaFile : doc.mediaFile?.id ?? null
    console.log(
      `#${doc.id} ${doc.mediaType} ${doc.processingStatus} media=${mediaId} created=${doc.createdAt}`,
    )
  }

  const media = await payload.find({
    collection: 'media',
    where: { filename: { contains: INBOX_PREFIX } },
    sort: '-createdAt',
    limit: 10,
    depth: 0,
    overrideAccess: true,
  })

  console.log(`\ninbox media total: ${media.totalDocs}`)
  for (const doc of media.docs) {
    console.log(`media #${doc.id} ${doc.filename} filesize=${doc.filesize}`)
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
