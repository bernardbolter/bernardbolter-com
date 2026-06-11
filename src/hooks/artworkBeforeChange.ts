import type { CollectionBeforeChangeHook } from 'payload'

import { parseInputImperialToInches } from '@/helpers/convertUnits'
import {
  assignArtworkCatalogueIdentity,
  syncArtworkMediumAatUri,
} from '@/hooks/assignArtworkCatalogueIdentity'
import { fractionToDecimal } from '@/utilities/fractionToDecimal'

function hasPhysicalMeasurement(data: Record<string, unknown>): boolean {
  const mt = data.measurementType
  return Array.isArray(mt) && mt.includes('physical')
}

function hasTimeBasedMeasurement(data: Record<string, unknown>): boolean {
  const mt = data.measurementType
  return Array.isArray(mt) && mt.includes('time-based')
}

/** Width/height in inches from whole + fraction fields (imperial). */
function quantityInches(
  whole: number | null | undefined,
  fraction: string | null | undefined,
): number | null {
  const f = (fraction ?? '').trim()
  const w = whole == null || Number.isNaN(Number(whole)) ? null : Number(whole)

  if (!f && w == null) return null
  if (!f && w != null) return w

  const isMixed = /^\d+\s+\d+\/\d+$/.test(f)
  const isPlainFrac = /^\d+\/\d+$/.test(f)
  if (isMixed || (w == null && isPlainFrac)) {
    return parseInputImperialToInches(f)
  }

  const fracDec = fractionToDecimal(f)
  const base = w ?? 0
  return base + fracDec
}

/** Width/height in cm from whole + fraction fields (metric). */
function quantityCm(
  whole: number | null | undefined,
  fraction: string | null | undefined,
): number | null {
  const f = (fraction ?? '').trim()
  const w = whole == null || Number.isNaN(Number(whole)) ? null : Number(whole)
  if (!f && w == null) return null
  if (!f && w != null) return w
  return (w ?? 0) + fractionToDecimal(f)
}

function toMm(
  unit: string | null | undefined,
  whole: number | null | undefined,
  fraction: string | null | undefined,
): number | null {
  if (unit === 'in') {
    const inches = quantityInches(whole, fraction)
    if (inches == null) return null
    return Math.round(inches * 25.4 * 1000) / 1000
  }
  if (unit === 'cm') {
    const cm = quantityCm(whole, fraction)
    if (cm == null) return null
    return Math.round(cm * 10 * 1000) / 1000
  }
  return null
}

function formatDimLabel(
  whole: number | null | undefined,
  fraction: string | null | undefined,
): string | null {
  const f = (fraction ?? '').trim()
  if ((whole == null || Number.isNaN(Number(whole))) && !f) return null
  if ((whole == null || Number.isNaN(Number(whole))) && f) return f
  if (!f) return String(whole)
  return `${whole} ${f}`
}

function buildDimensionsDisplay(
  data: Record<string, unknown>,
  unit: string | null | undefined,
): string | null {
  if (unit !== 'cm' && unit !== 'in') return null

  const wL = formatDimLabel(
    data.widthWhole as number | null | undefined,
    data.widthFraction as string | null | undefined,
  )
  const hL = formatDimLabel(
    data.heightWhole as number | null | undefined,
    data.heightFraction as string | null | undefined,
  )
  const dL = formatDimLabel(
    data.depthWhole as number | null | undefined,
    data.depthFraction as string | null | undefined,
  )

  const parts = [wL, hL, dL].filter(Boolean) as string[]
  if (parts.length === 0) return null

  const suffix = unit === 'in' ? 'in' : 'cm'
  return `${parts.join(' × ')} ${suffix}`
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
  if (context?.skipArUpdate) {
    return data
  }

  const d = data as Record<string, unknown>
  const prev = (originalDoc ?? {}) as Record<string, unknown>

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

  // §1.5: uploaded video wins over external URL
  if (d.videoFile) {
    d.videoUrl = null
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
