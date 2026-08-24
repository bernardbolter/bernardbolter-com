import type { CollectionBeforeChangeHook } from 'payload'
import { APIError } from 'payload'

import {
  buildDimensionsDisplay,
  toMm,
} from '@/lib/dimensions/physicalDimensions'
import {
  assignArtworkCatalogueIdentity,
  syncArtworkMediumAatUri,
} from '@/hooks/assignArtworkCatalogueIdentity'
import { isYoutubeVideoUrl } from '@/lib/artwork/artworkGalleryImages'
import { normalizeDurationToIso8601 } from '@/lib/artwork/durationIso'
import { normalizeProvenanceConfidenceLayer } from '@/lib/artwork/provenanceConfidence'

export { parseDurationToSeconds } from '@/lib/artwork/durationIso'

function hasPhysicalMeasurement(data: Record<string, unknown>): boolean {
  const mt = data.measurementType
  return Array.isArray(mt) && mt.includes('physical')
}

export const artworkBeforeChange: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  context,
  req,
}) => {
  const d = data as Record<string, unknown>
  const prev = (originalDoc ?? {}) as Record<string, unknown>

  const slug =
    typeof d.slug === 'string'
      ? d.slug.trim()
      : typeof prev.slug === 'string'
        ? prev.slug.trim()
        : ''
  if (slug.startsWith('__') && d.status === 'published') {
    throw new APIError('Artworks with fixture slugs (starting with __) cannot be published.', 400)
  }

  if (context?.skipArUpdate) {
    return data
  }

  await syncArtworkMediumAatUri(d, req)
  await assignArtworkCatalogueIdentity({
    data: d,
    operation,
    originalDoc: prev,
    req,
  })

  if (operation === 'create') {
    if (d.recordOrigin == null) {
      d.recordOrigin = 'artist-catalogued'
    }
    if (d.provenanceOriginKnown == null) {
      d.provenanceOriginKnown = true
    }
  }
  if (operation === 'update' && prev.recordOrigin != null) {
    d.recordOrigin = prev.recordOrigin
  }

  const widthMm =
    d.widthMm !== undefined && d.widthMm !== null ? (d.widthMm as number | null) : (prev.widthMm as number | null)
  const heightMm =
    d.heightMm !== undefined && d.heightMm !== null ?
      (d.heightMm as number | null)
    : (prev.heightMm as number | null)
  const depthMm =
    d.depthMm !== undefined && d.depthMm !== null ? (d.depthMm as number | null) : (prev.depthMm as number | null)
  const arEnabled = Boolean(d.arEnabled ?? prev.arEnabled)

  if (arEnabled) {
    if (d.arWidthM === undefined && typeof widthMm === 'number') {
      d.arWidthM = Math.round((widthMm / 1000) * 1e9) / 1e9
    }
    if (d.arHeightM === undefined && typeof heightMm === 'number') {
      d.arHeightM = Math.round((heightMm / 1000) * 1e9) / 1e9
    }
    if (d.arDepthM === undefined && typeof depthMm === 'number' && depthMm > 0) {
      d.arDepthM = Math.round((depthMm / 1000) * 1e9) / 1e9
    }
  }

  const yearCreated = d.yearCreated
  if (typeof yearCreated === 'number' && !Number.isNaN(yearCreated)) {
    d.yearStart = yearCreated
  } else {
    d.yearStart = null
  }

  if (hasPhysicalMeasurement(d)) {
    const unit = d.dimensionUnit as string | null | undefined
    d.widthMm = toMm(unit, d.widthWhole as number | null, d.widthFraction as string | null)
    d.heightMm = toMm(unit, d.heightWhole as number | null, d.heightFraction as string | null)
    d.depthMm = toMm(unit, d.depthWhole as number | null, d.depthFraction as string | null)

    const w = d.widthMm as number | null
    const h = d.heightMm as number | null
    if (typeof w === 'number' && typeof h === 'number' && h !== 0) {
      d.aspectRatio = Math.round((w / h) * 1_000_000) / 1_000_000
    } else {
      d.aspectRatio = null
    }

    d.dimensionsDisplay = buildDimensionsDisplay(d, unit ?? null)
  } else {
    d.widthMm = null
    d.heightMm = null
    d.depthMm = null
    d.dimensionsDisplay = null

    const wp = d.widthPx as number | null | undefined
    const hp = d.heightPx as number | null | undefined
    if (typeof wp === 'number' && typeof hp === 'number' && hp !== 0 && wp > 0) {
      d.aspectRatio = Math.round((wp / hp) * 1_000_000) / 1_000_000
    } else {
      d.aspectRatio = null
    }
  }

  if (Array.isArray(d.measurementType)) {
    if (d.measurementType.includes('time-based')) {
      if (typeof d.duration === 'string') {
        d.duration = normalizeDurationToIso8601(d.duration)
      }
    } else {
      d.duration = null
    }
  } else if (typeof d.duration === 'string') {
    d.duration = normalizeDurationToIso8601(d.duration)
  }

  if (d.provenanceConfidenceLayer != null) {
    d.provenanceConfidenceLayer = normalizeProvenanceConfidenceLayer(d.provenanceConfidenceLayer)
  }

  // §1.5: uploaded video wins over external URL, but keep YouTube as an access link
  if (d.videoFile) {
    const videoUrl = typeof d.videoUrl === 'string' ? d.videoUrl.trim() : ''
    d.videoUrl = videoUrl && isYoutubeVideoUrl(videoUrl) ? videoUrl : null
  }
  if (d.documentationVideoFile) {
    d.documentationVideoUrl = null
  }

  d.totalRevenue = computeTotalRevenue(d.salesRecord, d.ownershipHistory)

  return data
}

function netEurFromSaleRow(row: Record<string, unknown>): number | null {
  const rate = Number(row.exchangeRateToEur ?? 1)
  const safeRate = Number.isNaN(rate) ? 1 : rate
  const net = Number(row.netToArtist)
  if (!Number.isNaN(net)) return net * safeRate
  const price = Number(row.salePrice)
  if (!Number.isNaN(price)) return price * safeRate
  return null
}

function asSaleRows(raw: unknown): Record<string, unknown>[] {
  if (raw == null) return []
  if (Array.isArray(raw)) {
    return raw.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object',
        )
      }
    } catch {
      return []
    }
  }
  return []
}

function computeTotalRevenue(salesRecord: unknown, ownershipHistory: unknown): number | null {
  let sum = 0
  let found = false

  for (const row of asSaleRows(salesRecord)) {
    const eur = netEurFromSaleRow(row)
    if (eur == null) continue
    found = true
    sum += eur
  }

  for (const row of asSaleRows(ownershipHistory)) {
    const sale = row.sale
    if (!sale || typeof sale !== 'object') continue
    const eur = netEurFromSaleRow(sale as Record<string, unknown>)
    if (eur == null) continue
    found = true
    sum += eur
  }

  return found ? Math.round(sum * 100) / 100 : null
}
