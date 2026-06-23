import {
  listEditionVocabularyOptions,
  registerCustomEditionVocabulary,
  type EditionVocabularyKind,
} from '@/lib/artwork/editionTierVocabulary'
import { requireStaff } from '@/lib/artOfficial/requireStaff'

function parseKind(value: string | null): EditionVocabularyKind | null {
  if (value === 'substrate' || value === 'printTechnique') return value
  return null
}

export async function GET(request: Request) {
  const { ok, payload } = await requireStaff()
  if (!ok) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const kind = parseKind(new URL(request.url).searchParams.get('kind'))
  if (!kind) {
    return Response.json({ error: 'Query param kind must be substrate or printTechnique.' }, { status: 400 })
  }

  const docs = await listEditionVocabularyOptions(payload, kind)
  return Response.json({ docs })
}

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

  if (typeof body !== 'object' || body === null) {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const data = body as Record<string, unknown>
  const kind = parseKind(typeof data.kind === 'string' ? data.kind : null)
  const label = typeof data.label === 'string' ? data.label.trim() : ''

  if (!kind) {
    return Response.json({ error: 'kind must be substrate or printTechnique.' }, { status: 400 })
  }
  if (!label) {
    return Response.json({ error: 'Label is required.' }, { status: 400 })
  }

  try {
    const registered = await registerCustomEditionVocabulary(payload, kind, label)
    const docs = await listEditionVocabularyOptions(payload, kind)
    return Response.json({
      docs,
      value: registered.value,
      label: registered.label,
      created: registered.created,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not add option.'
    return Response.json({ error: message }, { status: 500 })
  }
}
