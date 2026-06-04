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

  if (!q && !Number.isFinite(artworkId)) {
    return Response.json({ docs: [] })
  }

  const result = await payload.find({
    collection: 'artworks',
    where: Number.isFinite(artworkId)
      ? { id: { equals: artworkId } }
      : {
          or: [
            { title: { contains: q } },
            { slug: { contains: q } },
          ],
        },
    sort: '-updatedAt',
    limit,
    depth: 1,
    overrideAccess: false,
    user,
    select: {
      id: true,
      title: true,
      slug: true,
      yearCreated: true,
      primaryImage: true,
      series: true,
    },
  })

  const docs = result.docs.map((a) => ({
    id: a.id,
    title: a.title,
    slug: a.slug,
    yearCreated: a.yearCreated,
    seriesTitle:
      typeof a.series === 'object' && a.series !== null
        ? (a.series as { title?: string }).title ?? null
        : null,
    thumbnailUrl:
      typeof a.primaryImage === 'object' && a.primaryImage !== null
        ? ((a.primaryImage as { url?: string }).url ?? null)
        : null,
  }))

  return Response.json({ docs })
}
