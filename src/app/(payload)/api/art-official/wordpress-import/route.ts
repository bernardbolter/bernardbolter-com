import { formatChatError } from '@/lib/artOfficial/formatChatError'
import { loadWordpressImportEntries } from '@/lib/artOfficial/wordpressImport'
import { requireStaff } from '@/lib/artOfficial/requireStaff'

export async function GET() {
  const { ok } = await requireStaff()
  if (!ok) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const entries = await loadWordpressImportEntries()
    return Response.json({ docs: entries })
  } catch (err) {
    console.error('[art-official/wordpress-import]', err)
    return Response.json(
      { error: formatChatError(err) },
      { status: 500 },
    )
  }
}
