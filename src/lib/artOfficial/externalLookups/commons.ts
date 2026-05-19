export type CommonsFileMetadata = {
  title: string
  pageUrl: string
  imageUrl?: string
  description?: string
  artist?: string
  credit?: string
  licenseShortName?: string
  licenseUrl?: string
  dateTime?: string
  wikidataEntityId?: string
  institution?: string
}

function commonsTitleFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (!parsed.hostname.includes('wikimedia.org')) return null
    const match = parsed.pathname.match(/\/wiki\/(File:.+)$/i)
    if (!match) return null
    return decodeURIComponent(match[1].replace(/ /g, '_'))
  } catch {
    return null
  }
}

function extMetaValue(
  extmetadata: Record<string, { value?: string }> | undefined,
  key: string,
): string | undefined {
  const raw = extmetadata?.[key]?.value
  if (raw == null) return undefined
  const text = typeof raw === 'string' ? raw : typeof raw === 'number' ? String(raw) : undefined
  if (!text) return undefined
  return text.replace(/<[^>]+>/g, '').trim() || undefined
}

/**
 * Fetch structured metadata from a Wikimedia Commons file page URL via the MediaWiki API.
 */
export async function fetchCommonsFileMetadata(
  commonsUrl: string,
): Promise<CommonsFileMetadata | { error: string }> {
  const title = commonsTitleFromUrl(commonsUrl)
  if (!title) {
    return { error: 'URL must be a Wikimedia Commons File: page.' }
  }

  const params = new URLSearchParams({
    action: 'query',
    titles: title,
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    iiurlwidth: '1200',
    format: 'json',
    origin: '*',
  })

  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
    headers: { 'User-Agent': 'BernardBolter-ArtOfficial/1.0 (archive CMS)' },
    next: { revalidate: 0 },
  })

  if (!res.ok) {
    return { error: `Commons API returned ${res.status}` }
  }

  const data = (await res.json()) as {
    query?: { pages?: Record<string, { title?: string; imageinfo?: Array<Record<string, unknown>> }> }
  }

  const page = Object.values(data.query?.pages ?? {})[0]
  const info = page?.imageinfo?.[0] as
    | { url?: string; extmetadata?: Record<string, { value?: string }> }
    | undefined

  if (!info) {
    return { error: 'No image metadata found for that Commons file.' }
  }

  const ext = info.extmetadata
  const wikidataConcept = extMetaValue(ext, 'WikidataConceptURI')

  return {
    title: page?.title ?? title,
    pageUrl: commonsUrl,
    imageUrl: info.url,
    description: extMetaValue(ext, 'ImageDescription'),
    artist: extMetaValue(ext, 'Artist') ?? extMetaValue(ext, 'Credit'),
    credit: extMetaValue(ext, 'Credit'),
    licenseShortName: extMetaValue(ext, 'LicenseShortName'),
    licenseUrl: extMetaValue(ext, 'LicenseUrl'),
    dateTime: extMetaValue(ext, 'DateTime') ?? extMetaValue(ext, 'DateTimeOriginal'),
    wikidataEntityId: wikidataConcept?.match(/(Q\d+)/i)?.[1],
    institution: extMetaValue(ext, 'Attribution'),
  }
}
