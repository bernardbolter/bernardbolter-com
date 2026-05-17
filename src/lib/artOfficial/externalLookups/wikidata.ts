export type WikidataSearchHit = {
  id: string
  label: string
  description?: string
  uri: string
}

export type WikidataEntitySummary = {
  id: string
  uri: string
  label?: string
  description?: string
  wikipediaUrl?: string
  inception?: string
  coordinates?: { lat: number; lng: number }
}

export async function searchWikidata(
  query: string,
  language = 'en',
  limit = 5,
): Promise<WikidataSearchHit[] | { error: string }> {
  const q = query.trim()
  if (!q) return { error: 'query is required' }

  const params = new URLSearchParams({
    action: 'wbsearchentities',
    search: q,
    language,
    format: 'json',
    limit: String(Math.min(limit, 10)),
    origin: '*',
  })

  const res = await fetch(`https://www.wikidata.org/w/api.php?${params}`, {
    headers: { 'User-Agent': 'BernardBolter-ArtOfficial/1.0' },
    next: { revalidate: 0 },
  })

  if (!res.ok) return { error: `Wikidata search returned ${res.status}` }

  const data = (await res.json()) as {
    search?: Array<{ id: string; label: string; description?: string }>
  }

  return (data.search ?? []).map((hit) => ({
    id: hit.id,
    label: hit.label,
    description: hit.description,
    uri: `https://www.wikidata.org/wiki/${hit.id}`,
  }))
}

export async function getWikidataEntity(
  entityId: string,
  language = 'en',
): Promise<WikidataEntitySummary | { error: string }> {
  const id = entityId.trim().replace(/^.*?(Q\d+)$/i, '$1')
  if (!/^Q\d+$/i.test(id)) return { error: 'entityId must be a Wikidata Q-number, e.g. Q82425' }

  const params = new URLSearchParams({
    action: 'wbgetentities',
    ids: id,
    props: 'labels|descriptions|claims|sitelinks',
    languages: language,
    format: 'json',
    origin: '*',
  })

  const res = await fetch(`https://www.wikidata.org/w/api.php?${params}`, {
    headers: { 'User-Agent': 'BernardBolter-ArtOfficial/1.0' },
    next: { revalidate: 0 },
  })

  if (!res.ok) return { error: `Wikidata entity fetch returned ${res.status}` }

  const data = (await res.json()) as {
    entities?: Record<
      string,
      {
        labels?: Record<string, { value: string }>
        descriptions?: Record<string, { value: string }>
        sitelinks?: Record<string, { title: string; url?: string }>
        claims?: Record<string, Array<{ mainsnak?: { datavalue?: { value?: unknown } } }>>
      }
    >
  }

  const entity = data.entities?.[id]
  if (!entity) return { error: `Entity ${id} not found` }

  const wikiKey = `${language}wiki`
  const wikiTitle = entity.sitelinks?.[wikiKey]?.title
  const inceptionClaim = entity.claims?.P571?.[0]?.mainsnak?.datavalue?.value
  const coordClaim = entity.claims?.P625?.[0]?.mainsnak?.datavalue?.value as
    | { latitude?: number; longitude?: number }
    | undefined

  let inception: string | undefined
  if (inceptionClaim && typeof inceptionClaim === 'object' && inceptionClaim !== null) {
    const time = inceptionClaim as { time?: string }
    if (time.time) inception = time.time.replace(/^\+/, '').slice(0, 4)
  }

  return {
    id,
    uri: `https://www.wikidata.org/wiki/${id}`,
    label: entity.labels?.[language]?.value,
    description: entity.descriptions?.[language]?.value,
    wikipediaUrl: wikiTitle
      ? `https://${language}.wikipedia.org/wiki/${encodeURIComponent(wikiTitle.replace(/ /g, '_'))}`
      : undefined,
    inception,
    coordinates:
      typeof coordClaim?.latitude === 'number' && typeof coordClaim?.longitude === 'number'
        ? { lat: coordClaim.latitude, lng: coordClaim.longitude }
        : undefined,
  }
}
