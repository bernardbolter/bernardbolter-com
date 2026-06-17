import { readFile } from 'fs/promises'
import path from 'path'

import { slugDerivedTitle, stripHtml } from './normalizeLegacyRecord'
import { inferMediumFromWp } from './wordpressMediumMap'
import type { WordpressImportEntry } from './wordpressImport.shared'
import {
  mapMegacitiesSeriesType,
  parseWpAreaKm2,
  parseWpDensityPerKm2,
  parseWpDimension,
  parseWpElevationM,
  parseWpPopulation,
} from './wpFieldParsers'

export type { WordpressImportEntry } from './wordpressImport.shared'

type WpImageNode = {
  node?: { sourceUrl?: string | null } | null
} | null

type WpArtworkFields = {
  year?: string | null
  city?: string | null
  country?: string | null
  lat?: string | null
  lng?: string | null
  location?: string | null
  medium?: string | null
  width?: string | null
  height?: string | null
  series?: string[] | null
  orientation?: string[] | null
  size?: string[] | null
  style?: string | null
  forsale?: boolean | null
  units?: string[] | null
  area?: string | null
  coordinates?: string | null
  density?: string | null
  elevation?: string | null
  population?: string | null
  dcsPhotoTitle?: string | null
  exhibitionHistory?: string | null
  provenance?: string | null
  printEditions?: string | null
  artworkImage?: WpImageNode
  artworkImage2?: WpImageNode
  artworkImage3?: WpImageNode
  artworkImage4?: WpImageNode
  artworkImage5?: WpImageNode
}

type WpArtworkNode = {
  databaseId?: number
  slug?: string
  title?: string
  featuredImage?: WpImageNode
  artworkFields?: WpArtworkFields | null
  categories?: { nodes?: Array<{ name?: string; slug?: string }> } | null
  colorfulFields?: {
    storyEn?: string | null
    wikiLinkEn?: string | null
    ar?: boolean | null
  } | null
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

function imageUrl(node: WpImageNode | undefined): string | null {
  const url = node?.node?.sourceUrl?.trim()
  return url || null
}

function collectSourceImageUrls(f: WpArtworkFields): string[] {
  const urls = [
    imageUrl(f.artworkImage2),
    imageUrl(f.artworkImage3),
    imageUrl(f.artworkImage4),
    imageUrl(f.artworkImage5),
  ].filter((url): url is string => Boolean(url))
  return [...new Set(urls)]
}

function buildLegacyProvenanceNotes(f: WpArtworkFields): string | null {
  const sections: string[] = []
  const provenance = stripHtml(f.provenance)
  const exhibition = stripHtml(f.exhibitionHistory)
  const prints = stripHtml(f.printEditions)
  if (provenance) sections.push(provenance)
  if (exhibition) sections.push(`Exhibition history:\n${exhibition}`)
  if (prints) sections.push(`Print editions:\n${prints}`)
  return sections.length ? sections.join('\n\n') : null
}

function inferGatesOfPerception(slug: string, title: string): boolean {
  const slugHay = slug.toLowerCase()
  const titleHay = title.toLowerCase()
  return (
    slugHay.includes('gates-of-perception') ||
    titleHay.includes('gates of perception') ||
    slugHay.startsWith('gates-') ||
    slugHay.startsWith('gates-of-')
  )
}

function mapAchImportFields(
  f: WpArtworkFields,
  node: WpArtworkNode,
): Pick<
  WordpressImportEntry,
  | 'locationCreatedLabel'
  | 'achMapLat'
  | 'achMapLng'
  | 'achMapPresence'
  | 'provenanceNotes'
  | 'sourceImageUrls'
  | 'storyEn'
  | 'gatesOfPerception'
> {
  const lat = parseOptionalNumber(f.lat)
  const lng = parseOptionalNumber(f.lng)
  const storyRaw = node.colorfulFields?.storyEn
  const slug = typeof node.slug === 'string' ? node.slug.trim() : ''
  const titleForInfer =
    typeof node.title === 'string' ? node.title.trim() : slugDerivedTitle(slug)
  return {
    locationCreatedLabel: stripHtml(f.location),
    achMapLat: lat,
    achMapLng: lng,
    achMapPresence: lat != null && lng != null,
    provenanceNotes: buildLegacyProvenanceNotes(f),
    sourceImageUrls: collectSourceImageUrls(f),
    storyEn: storyRaw ? stripHtml(storyRaw) : null,
    gatesOfPerception: inferGatesOfPerception(slug, titleForInfer),
  }
}

function mapMegacitiesImportFields(
  f: WpArtworkFields,
  seriesSlug: string | null,
): Pick<
  WordpressImportEntry,
  'megacitiesSeriesType' | 'megacitiesStyleLabel' | 'megacitiesCoverageArea'
> {
  if (seriesSlug !== 'megacities') {
    return {
      megacitiesSeriesType: null,
      megacitiesStyleLabel: null,
      megacitiesCoverageArea: null,
    }
  }

  const styleLabel = f.style?.trim() || null
  const country = f.country?.trim() || null

  return {
    megacitiesSeriesType: mapMegacitiesSeriesType({
      style: styleLabel,
      medium: f.medium,
      country,
    }),
    megacitiesStyleLabel: styleLabel,
    megacitiesCoverageArea: country,
  }
}

function mapWpNode(node: WpArtworkNode): WordpressImportEntry | null {
  const id = node.databaseId
  if (!id) return null

  const titleRaw = typeof node.title === 'string' ? node.title.trim() : ''
  const slug = typeof node.slug === 'string' ? node.slug.trim() : ''
  const title =
    titleRaw ||
    (slug ? slugDerivedTitle(slug) : '')
  if (!title) return null

  const f = node.artworkFields ?? {}
  const year = parseYear(f.year)
  const width = parseWpDimension(f.width, f.units)
  const height = parseWpDimension(f.height, f.units)

  const category = node.categories?.nodes?.[0]
  const seriesFromCategory = category?.name?.trim() || null
  const seriesSlugFromCategory = category?.slug?.trim() || null
  const seriesSlugFromFields = f.series?.[0]?.trim() || null
  const resolvedSeriesSlug = seriesSlugFromFields ?? seriesSlugFromCategory

  const mediumSelect = inferMediumFromWp(f.medium)
  const artworkImageUrl =
    node.featuredImage?.node?.sourceUrl?.trim() ||
    f.artworkImage?.node?.sourceUrl?.trim() ||
    null

  return {
    id,
    title,
    wpSlug: slug || null,
    year,
    medium: mediumSelect,
    widthWhole: width?.whole ?? null,
    widthFraction: width?.fraction ?? null,
    heightWhole: height?.whole ?? null,
    heightFraction: height?.fraction ?? null,
    dimensionUnit: width?.unit ?? height?.unit ?? null,
    seriesName: seriesFromCategory,
    seriesSlug: resolvedSeriesSlug,
    orientation: mapWpOrientation(f.orientation?.[0]),
    sizeTier: mapWpSizeTier(f.size?.[0]),
    availabilityStatus: mapWpAvailability(f.forsale),
    city: f.city?.trim() || null,
    country: f.country?.trim() || null,
    lat: parseOptionalNumber(f.lat),
    lng: parseOptionalNumber(f.lng),
    artworkImageUrl,
    streetPhotoCaption: f.dcsPhotoTitle?.trim() || null,
    cityPopulation: parseWpPopulation(f.population),
    cityAreaKm2: parseWpAreaKm2(f.area),
    cityPopulationDensity: parseWpDensityPerKm2(f.density),
    cityElevationM: parseWpElevationM(f.elevation),
    coordinatesText: f.coordinates?.trim() || null,
    ...mapAchImportFields(f, node),
    ...mapMegacitiesImportFields(f, resolvedSeriesSlug),
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

function parseOptionalNumber(value: string | null | undefined): number | null {
  if (value == null || value === '') return null
  const n = Number.parseFloat(String(value))
  return Number.isFinite(n) ? n : null
}
