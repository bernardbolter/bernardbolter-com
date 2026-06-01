import { lexicalToPlain } from './lexicalToPlain'
import {
  buildArtworkCoverageContext,
  isFieldExpectedForArtwork,
  type ArtworkCoverageContext,
} from './catalogScope'
import type { CatalogField, CareerStage, RoadmapCategory } from './fieldCatalog'
import { catalogFieldNames } from './fieldCatalog'
import { remediationFor, type Remediation } from './fieldRemediation'
import type { SeriesRecord } from './seriesSlugs'

export type CoverageBucket =
  | 'confirmed'
  | 'inferred'
  | 'filed_direct'
  | 'staged_dropped'
  | 'unaddressed'
  | 'dormant'

export type TimelineSource =
  | 'conversation'
  | 'image-analysis'
  | 'knowledge-base'
  | 'external-lookup'
  | 'client-edit'

export interface TimelineEntryLike {
  targetCollection?: string
  field?: string
  value?: unknown
  confidence?: string
  source?: string
  timestamp?: string
}

export interface SessionCoverageInput {
  sessionId: string
  sessionType: string
  artworkId: string | null
  careerStage: CareerStage
  fieldUpdateTimeline?: unknown
  weakPhases?: string[] | null
  formalContributionAccuracy?: string | null
  dialogueRefinementFlag?: boolean | null
  refinementNotes?: string | null
}

export interface FieldCoverage {
  field: string
  category: RoadmapCategory
  layer: CatalogField['layer']
  tier: CatalogField['tier']
  bucket: CoverageBucket
  confidence?: 'confirmed' | 'inferred'
  source?: TimelineSource
  stagedAt?: string
  filedPreview?: string
  remediation?: Remediation | null
}

export interface CoverageReport {
  sessionId: string
  sessionType: string
  artworkId: string | null
  careerStage: CareerStage
  generatedAt: string
  summary: {
    expected: number
    confirmed: number
    inferred: number
    filedDirect: number
    stagedDropped: number
    unaddressed: number
    dormant: number
  }
  fields: FieldCoverage[]
  attention: { unaddressed: FieldCoverage[]; stagedDropped: FieldCoverage[] }
  driftWarnings: string[]
  quality: {
    weakPhases: string[]
    formalContributionAccuracy?: string
    dialogueRefinementFlag: boolean
    refinementNotes?: string
  }
}

export function isArtworkFieldPresent(value: unknown): boolean {
  if (value == null) return false
  if (typeof value === 'string') return value.trim() !== ''
  if (typeof value === 'number') return !Number.isNaN(value)
  if (typeof value === 'boolean') return true
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') {
    if ('id' in value && (value as { id?: unknown }).id != null) return true
    if ('root' in value) {
      return lexicalToPlain(value).trim() !== ''
    }
    return Object.keys(value as object).length > 0
  }
  return true
}

function truncatePreview(value: unknown, max = 80): string {
  if (value == null) return ''
  if (typeof value === 'string') return value.length > max ? `${value.slice(0, max)}…` : value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return `[${value.length} items]`
  if (typeof value === 'object' && 'root' in value) {
    const plain = lexicalToPlain(value)
    return plain.length > max ? `${plain.slice(0, max)}…` : plain
  }
  if (typeof value === 'object' && 'id' in value) {
    return `id:${String((value as { id: unknown }).id)}`
  }
  const s = JSON.stringify(value)
  return s.length > max ? `${s.slice(0, max)}…` : s
}

function getArtworkFieldValue(
  artwork: Record<string, unknown> | null,
  field: string,
): unknown {
  if (!artwork) return undefined
  // Support dotted paths (e.g. "ach.overlay.overlayColors")
  const segments = field.split('.')
  let cursor: unknown = artwork
  for (const seg of segments) {
    if (cursor == null || typeof cursor !== 'object' || Array.isArray(cursor)) return undefined
    cursor = (cursor as Record<string, unknown>)[seg]
  }
  return cursor
}

function parseTimelineSource(source?: string): TimelineSource | undefined {
  const allowed: TimelineSource[] = [
    'conversation',
    'image-analysis',
    'knowledge-base',
    'external-lookup',
    'client-edit',
  ]
  return allowed.includes(source as TimelineSource)
    ? (source as TimelineSource)
    : undefined
}

function buildLatestTimelineMap(
  timeline: unknown,
): Map<string, TimelineEntryLike> {
  const map = new Map<string, TimelineEntryLike>()
  if (!Array.isArray(timeline)) return map

  for (const raw of timeline) {
    if (!raw || typeof raw !== 'object') continue
    const entry = raw as TimelineEntryLike
    if (entry.targetCollection && entry.targetCollection !== 'artworks') continue
    if (!entry.field) continue

    const field = String(entry.field).trim()
    if (!field) continue

    const existing = map.get(field)
    if (!existing) {
      map.set(field, entry)
      continue
    }

    const existingTs = existing.timestamp ? Date.parse(existing.timestamp) : 0
    const nextTs = entry.timestamp ? Date.parse(entry.timestamp) : 0
    if (nextTs >= existingTs) {
      map.set(field, entry)
    }
  }

  return map
}

function collectDriftWarnings(
  timelineMap: Map<string, TimelineEntryLike>,
  catalogNames: Set<string>,
): string[] {
  const warnings: string[] = []
  for (const field of timelineMap.keys()) {
    if (!catalogNames.has(field)) {
      warnings.push(`Timeline field "${field}" is not in fieldCatalog.ts (catalog-drift).`)
    }
  }
  return warnings
}

export function computeSessionCoverage(args: {
  session: SessionCoverageInput
  artwork: Record<string, unknown> | null
  careerStage: CareerStage
  catalog: CatalogField[]
  artworkContext?: ArtworkCoverageContext
  seriesRecords?: SeriesRecord[]
}): CoverageReport {
  const { session, artwork, careerStage, catalog, seriesRecords } = args
  const timelineMap = buildLatestTimelineMap(session.fieldUpdateTimeline)
  const catalogNames = catalogFieldNames()
  const driftWarnings = collectDriftWarnings(timelineMap, catalogNames)
  const artworkContext =
    args.artworkContext ??
    buildArtworkCoverageContext({
      artwork,
      timeline: session.fieldUpdateTimeline,
      seriesRecords,
    })

  const fields: FieldCoverage[] = catalog.map((f) => {
    const expected = isFieldExpectedForArtwork(f, careerStage, artworkContext)
    const timelineEntry = timelineMap.get(f.field)
    const artworkValue = getArtworkFieldValue(artwork, f.field)
    const filed = isArtworkFieldPresent(artworkValue)
    const staged = Boolean(timelineEntry)

    let bucket: CoverageBucket
    if (!expected) {
      bucket = 'dormant'
    } else if (staged && filed) {
      const conf = timelineEntry?.confidence === 'inferred' ? 'inferred' : 'confirmed'
      bucket = conf === 'inferred' ? 'inferred' : 'confirmed'
    } else if (staged && !filed) {
      bucket = 'staged_dropped'
    } else if (!staged && filed) {
      bucket = 'filed_direct'
    } else {
      bucket = 'unaddressed'
    }

    const confidence =
      bucket === 'confirmed' || bucket === 'inferred'
        ? bucket
        : undefined

    const remediation =
      bucket === 'unaddressed' || bucket === 'staged_dropped'
        ? remediationFor(f, bucket)
        : null

    return {
      field: f.field,
      category: f.category,
      layer: f.layer,
      tier: f.tier,
      bucket,
      confidence,
      source: parseTimelineSource(timelineEntry?.source),
      stagedAt: timelineEntry?.timestamp,
      filedPreview: filed ? truncatePreview(artworkValue) : undefined,
      remediation,
    }
  })

  const summary = {
    expected: 0,
    confirmed: 0,
    inferred: 0,
    filedDirect: 0,
    stagedDropped: 0,
    unaddressed: 0,
    dormant: 0,
  }

  for (const row of fields) {
    if (row.bucket === 'dormant') {
      summary.dormant += 1
      continue
    }
    summary.expected += 1
    switch (row.bucket) {
      case 'confirmed':
        summary.confirmed += 1
        break
      case 'inferred':
        summary.inferred += 1
        break
      case 'filed_direct':
        summary.filedDirect += 1
        break
      case 'staged_dropped':
        summary.stagedDropped += 1
        break
      case 'unaddressed':
        summary.unaddressed += 1
        break
      default:
        break
    }
  }

  const attention = {
    unaddressed: fields.filter((f) => f.bucket === 'unaddressed'),
    stagedDropped: fields.filter((f) => f.bucket === 'staged_dropped'),
  }

  return {
    sessionId: session.sessionId,
    sessionType: session.sessionType,
    artworkId: session.artworkId,
    careerStage,
    generatedAt: new Date().toISOString(),
    summary,
    fields,
    attention,
    driftWarnings,
    quality: {
      weakPhases: session.weakPhases ?? [],
      formalContributionAccuracy: session.formalContributionAccuracy ?? undefined,
      dialogueRefinementFlag: Boolean(session.dialogueRefinementFlag),
      refinementNotes: session.refinementNotes ?? undefined,
    },
  }
}
