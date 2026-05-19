export type WikipediaExcerptCandidate = {
  section: string
  text: string
}

export type WikipediaFetchResult = {
  locale: string
  title: string
  url: string
  extract?: string
  candidates: WikipediaExcerptCandidate[]
}

function wikiApiBase(locale: string): string {
  const code = locale === 'de' ? 'de' : 'en'
  return `https://${code}.wikipedia.org/w/api.php`
}

/** MediaWiki `parse.text` is usually HTML string; some responses wrap it or use non-string shapes. */
export function wikipediaSectionHtmlToPlain(text: unknown): string {
  if (typeof text === 'string') return text
  if (text && typeof text === 'object') {
    const wrapped = text as Record<string, unknown>
    if (typeof wrapped['*'] === 'string') return wrapped['*']
  }
  return ''
}

function stripHtmlToPlain(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function titleFromUrl(url: string, locale: string): string | null {
  try {
    const parsed = new URL(url)
    const prefix = locale === 'de' ? 'de.wikipedia.org' : 'en.wikipedia.org'
    if (!parsed.hostname.includes(prefix.replace('.wikipedia.org', ''))) return null
    const segment = decodeURIComponent(parsed.pathname.replace(/^\/wiki\//, ''))
    return segment.replace(/_/g, ' ') || null
  } catch {
    return null
  }
}

/**
 * Fetch intro extract plus a few section excerpts for Bernard to choose from.
 */
export async function fetchWikipediaArticle(
  options: { url?: string; title?: string; locale?: string },
): Promise<WikipediaFetchResult | { error: string }> {
  const locale = options.locale === 'de' ? 'de' : 'en'
  const title =
    options.title?.trim() ||
    (options.url ? titleFromUrl(options.url, locale) : null) ||
    ''

  if (!title) {
    return { error: 'Provide a Wikipedia URL or article title.' }
  }

  const base = wikiApiBase(locale)

  const extractParams = new URLSearchParams({
    action: 'query',
    prop: 'extracts',
    explaintext: '1',
    exintro: '1',
    exsentences: '8',
    titles: title,
    format: 'json',
    origin: '*',
  })

  const sectionsParams = new URLSearchParams({
    action: 'parse',
    page: title,
    prop: 'sections',
    format: 'json',
    origin: '*',
  })

  const [extractRes, sectionsRes] = await Promise.all([
    fetch(`${base}?${extractParams}`, {
      headers: { 'User-Agent': 'BernardBolter-ArtOfficial/1.0' },
      next: { revalidate: 0 },
    }),
    fetch(`${base}?${sectionsParams}`, {
      headers: { 'User-Agent': 'BernardBolter-ArtOfficial/1.0' },
      next: { revalidate: 0 },
    }),
  ])

  if (!extractRes.ok) {
    return { error: `Wikipedia API returned ${extractRes.status}` }
  }

  const extractData = (await extractRes.json()) as {
    query?: { pages?: Record<string, { extract?: string; title?: string }> }
  }
  const page = Object.values(extractData.query?.pages ?? {})[0]
  const resolvedTitle = page?.title ?? title
  const articleUrl = `https://${locale === 'de' ? 'de' : 'en'}.wikipedia.org/wiki/${encodeURIComponent(resolvedTitle.replace(/ /g, '_'))}`

  const candidates: WikipediaExcerptCandidate[] = []

  if (page?.extract?.trim()) {
    candidates.push({ section: 'Introduction', text: page.extract.trim() })
  }

  if (sectionsRes.ok) {
    const sectionsData = (await sectionsRes.json()) as {
      parse?: { sections?: Array<{ line?: string; index?: string }> }
    }
    const sections = (sectionsData.parse?.sections ?? [])
      .filter((s) => s.line && s.index && !/reference|external link|see also/i.test(s.line))
      .slice(0, 8)

    for (const section of sections.slice(0, 5)) {
      const sectionParams = new URLSearchParams({
        action: 'parse',
        page: resolvedTitle,
        section: String(section.index),
        prop: 'text',
        format: 'json',
        origin: '*',
      })
      const sectionRes = await fetch(`${base}?${sectionParams}`, {
        headers: { 'User-Agent': 'BernardBolter-ArtOfficial/1.0' },
        next: { revalidate: 0 },
      })
      if (!sectionRes.ok) continue
      const sectionData = (await sectionRes.json()) as {
        parse?: { text?: unknown }
      }
      const html = wikipediaSectionHtmlToPlain(sectionData.parse?.text)
      const text = stripHtmlToPlain(html).slice(0, 1200)
      if (text.length > 80) {
        candidates.push({ section: section.line ?? 'Section', text })
      }
    }
  }

  return {
    locale,
    title: resolvedTitle,
    url: articleUrl,
    extract: page?.extract?.trim(),
    candidates: candidates.slice(0, 6),
  }
}
