import { searchArtworksForStaff } from '@/lib/artOfficial/searchArtworksForStaff'
import { requireStaff } from '@/lib/artOfficial/requireStaff'

export async function GET(request: Request) {
  const { ok, payload, user } = await requireStaff()
  if (!ok || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const q = url.searchParams.get('q')?.trim() ?? ''
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 12), 50)
  const artworkId = Number(url.searchParams.get('artworkId'))

  const docs = await searchArtworksForStaff({
    payload,
    user,
    q,
    artworkId: Number.isFinite(artworkId) ? artworkId : undefined,
    limit,
  })

  return Response.json({ docs })
}
