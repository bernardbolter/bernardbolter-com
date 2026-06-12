import { readFile } from 'fs/promises'
import path from 'path'

import { inferMediumFromWp } from './wordpressMediumMap'
import type { WordpressImportEntry } from './wordpressImport.shared'

export type { WordpressImportEntry } from './wordpressImport.shared'

type WpArtworkNode = {
  databaseId?: number
  slug?: string
  title?: string
  artworkFields?: {
    year?: string | null
    medium?: string | null
    width?: string | null
    height?: string | null
    series?: string[] | null
    orientation?: string[] | null
    size?: string[] | null
    forsale?: boolean | null
    units?: string[] | null
  } | null
  categories?: { nodes?: Array<{ name?: string; slug?: string }> } | null
}

export function resolveWordpressExportPath(): string {
  const configured = process.env.WORDPRESS_EXPORT_PATH?.trim()
  if (configured) {
    return path.isAbsolute(configured)
      ? configured
      : path.resolve(process.cwd(), configured)
  }
  return path.resolve(process.cwd(), 'data/legacy/wp-artworks.json')
}

export async function loadWordpressImportEntries(): Promise<WordpressImportEntry[]> {
  const filePath = resolveWordpressExportPath()
  const raw = await readFile(filePath, 'utf8')
  const parsed = JSON.parse(raw) as WpArtworkNode[]
  if (!Array.isArray(parsed)) {
    throw new Error('WordPress export must be a JSON array.')
  }

  return parsed
    .map((node) => mapWpNode(node))
    .filter((row): row is WordpressImportEntry => row !== null)
    .sort((a, b) => a.title.localeCompare(b.title))
}

function mapWpNode(node: WpArtworkNode): WordpressImportEntry | null {
  const id = node.databaseId
  const title = typeof node.title === 'string' ? node.title.trim() : ''
  if (!id || !title) return null

  const f = node.artworkFields ?? {}
  const year = parseYear(f.year)
  const widthCm = parseDimensionCm(f.width, f)
  const heightCm = parseDimensionCm(f.height, f)

  const category = node.categories?.nodes?.[0]
  const seriesFromCategory = category?.name?.trim() || null
  const seriesSlugFromCategory = category?.slug?.trim() || null
  const seriesSlugFromFields = f.series?.[0]?.trim() || null

  const mediumSelect = inferMediumFromWp(f.medium)

  return {
    id,
    title,
    wpSlug: typeof node.slug === 'string' ? node.slug.trim() : null,
    year,
    medium: mediumSelect,
    widthCm,
    heightCm,
    seriesName: seriesFromCategory,
    seriesSlug: seriesSlugFromFields ?? seriesSlugFromCategory,
    orientation: mapWpOrientation(f.orientation?.[0]),
    sizeTier: mapWpSizeTier(f.size?.[0]),
    availabilityStatus: mapWpAvailability(f.forsale),
  }
}

function mapWpOrientation(value: unknown): WordpressImportEntry['orientation'] {
  if (typeof value !== 'string') return null
  const v = value.trim().toLowerCase()
  if (v === 'landscape' || v === 'portrait' || v === 'square') return v
  return null
}

function mapWpSizeTier(value: unknown): WordpressImportEntry['sizeTier'] {
  if (typeof value !== 'string') return null
  const v = value.trim().toLowerCase()
  if (v === 'xs' || v === 'sm' || v === 'md' || v === 'lg' || v === 'xl') return v
  return null
}

function mapWpAvailability(
  forsale: boolean | null | undefined,
): WordpressImportEntry['availabilityStatus'] {
  if (forsale === true) return 'available'
  if (forsale === false) return 'not-for-sale'
  return null
}

function parseYear(value: unknown): number | null {
  if (value == null) return null
  const s = String(value).trim()
  const match = s.match(/(\d{4})/)
  if (!match) return null
  const y = parseInt(match[1], 10)
  return Number.isFinite(y) ? y : null
}

function parseDimensionCm(
  value: unknown,
  fields: { units?: string[] | null },
): number | null {
  if (value == null) return null
  const raw = String(value).trim().toLowerCase()
  const numMatch = raw.match(/[\d.]+/)
  if (!numMatch) return null
  const n = parseFloat(numMatch[0].replace(',', '.'))
  if (!Number.isFinite(n) || n <= 0) return null

  const unitHint = fields.units?.[0]?.toLowerCase() ?? ''
  const looksInches =
    unitHint === 'imperial' ||
    raw.includes('in') ||
    raw.includes('"') ||
    raw.endsWith('inches')
  if (looksInches && !raw.includes('cm')) {
    return Math.round(n * 2.54 * 100) / 100
  }
  return n
}
