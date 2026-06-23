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

function hasPhysicalMeasurement(data: Record<string, unknown>): boolean {
  const mt = data.measurementType
  return Array.isArray(mt) && mt.includes('physical')
}

function hasTimeBasedMeasurement(data: Record<string, unknown>): boolean {
  const mt = data.measurementType
  return Array.isArray(mt) && mt.includes('time-based')
}

/** HH:MM:SS, MM:SS, or plain seconds. Prose / letters → null. */
export function parseDurationToSeconds(duration: string | null | undefined): number | null {
  if (duration == null) return null
  const s = duration.trim()
  if (!s) return null
  const withoutColons = s.replace(/:/g, '')
  if (/[a-zA-Z]/.test(withoutColons)) return null

  const parts = s.split(':').map((p) => parseInt(p, 10))
  if (parts.some((p) => Number.isNaN(p))) return null

  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 1) return parts[0]
  return null
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

  if (hasTimeBasedMeasurement(d)) {
    d.durationSeconds = parseDurationToSeconds(d.duration as string | null)
  } else {
    d.durationSeconds = null
  }

  // §1.5: uploaded video wins over external URL, but keep YouTube as an access link
  if (d.videoFile) {
    const videoUrl = typeof d.videoUrl === 'string' ? d.videoUrl.trim() : ''
    d.videoUrl = videoUrl && isYoutubeVideoUrl(videoUrl) ? videoUrl : null
  }
  if (d.documentationVideoFile) {
    d.documentationVideoUrl = null
  }

  d.totalRevenue = computeTotalRevenueFromSalesRecord(d.salesRecord)

  return data
}

function computeTotalRevenueFromSalesRecord(raw: unknown): number | null {
  if (raw == null) return null
  let rows: unknown[] = []
  if (Array.isArray(raw)) {
    rows = raw
  } else if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) rows = parsed
      else return null
    } catch {
      return null
    }
  } else {
    return null
  }

  let sum = 0
  let found = false
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    const net = Number(r.netToArtist)
    const rate = Number(r.exchangeRateToEur ?? 1)
    if (!Number.isNaN(net)) {
      found = true
      sum += net * (Number.isNaN(rate) ? 1 : rate)
    }
  }
  return found ? Math.round(sum * 100) / 100 : null
}
