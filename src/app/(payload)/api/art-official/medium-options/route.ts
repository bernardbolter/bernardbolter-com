import {
  listArtworkMediumOptions,
  registerCustomMedium,
} from '@/lib/artOfficial/artworkMediumOptions'
import { requireStaff } from '@/lib/artOfficial/requireStaff'

export async function GET() {
  const { ok, payload } = await requireStaff()
  if (!ok) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const docs = await listArtworkMediumOptions(payload)
  return Response.json({ docs })
}

/** Add a custom medium to the shared dropdown without submitting Quick Upload. */
export async function POST(request: Request) {
  const { ok, payload } = await requireStaff()
  if (!ok) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const label =
    typeof body === 'object' && body !== null && typeof (body as { label?: unknown }).label === 'string'
      ? (body as { label: string }).label.trim()
      : ''

  if (!label) {
    return Response.json({ error: 'Medium label is required.' }, { status: 400 })
  }

  try {
    const registered = await registerCustomMedium(payload, label)
    const docs = await listArtworkMediumOptions(payload)
    return Response.json({
      docs,
      value: registered.value,
      label: registered.label,
      created: registered.created,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not add medium.'
    return Response.json({ error: message }, { status: 500 })
  }
}
