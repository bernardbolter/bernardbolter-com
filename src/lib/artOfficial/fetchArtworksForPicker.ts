import type { ArtworkSearchResult } from '@/lib/artOfficial/artworkSearchTypes'

type RestArtworkDoc = {
  id: number
  title?: string | null
  slug?: string | null
  yearCreated?: number | null
  series?: { name?: string | null } | number | null
  primaryImage?:
    | {
        url?: string | null
        thumbnailURL?: string | null
        sizes?: { thumbnail?: { url?: string | null } }
      }
    | number
    | null
}

function mapRestArtwork(doc: RestArtworkDoc): ArtworkSearchResult {
  const primary =
    typeof doc.primaryImage === 'object' && doc.primaryImage !== null ? doc.primaryImage : null
  const thumbnailUrl =
    primary?.sizes?.thumbnail?.url ??
    primary?.thumbnailURL ??
    primary?.url ??
    null

  return {
    id: doc.id,
    title: doc.title ?? null,
    slug: doc.slug ?? null,
    yearCreated: doc.yearCreated ?? null,
    seriesTitle:
      typeof doc.series === 'object' && doc.series !== null
        ? (doc.series.name ?? null)
        : null,
    thumbnailUrl,
  }
}

/** Browser-side artwork search via Payload REST (works reliably in admin with session cookies). */
export async function fetchArtworksForPicker(
  q: string,
  limit = 12,
): Promise<ArtworkSearchResult[]> {
  const params = new URLSearchParams()
  params.set('limit', String(limit))
  params.set('depth', '1')
  params.set('locale', 'en')
  params.set('sort', '-updatedAt')

  const trimmed = q.trim()
  if (trimmed) {
    params.set('where[or][0][title][contains]', trimmed)
    params.set('where[or][1][slug][contains]', trimmed)
    params.set('where[or][2][altTitle][contains]', trimmed)
    params.set('where[or][3][catalogueNumber][contains]', trimmed)
    params.set('where[or][4][series.slug][contains]', trimmed)
    params.set('where[or][5][series.name][contains]', trimmed)
  }

  const res = await fetch(`/api/artworks?${params.toString()}`, {
    credentials: 'include',
  })
  const data = (await res.json().catch(() => ({}))) as {
    docs?: RestArtworkDoc[]
    error?: string
    message?: string
  }

  if (!res.ok) {
    throw new Error(data.error || data.message || `Search failed (${res.status})`)
  }

  return (data.docs ?? []).map(mapRestArtwork)
}
