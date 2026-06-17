import {
  collapseTimelineToLatest,
  type TimelineEntry,
} from './sessionTimeline'
import type { SessionPhase } from './sessionPhase'
import { countTurnsInPhase } from './tokenLog'

/** Assistant turns in vision phase before auto-advancing to factual cataloguing. */
export const VISION_DIALOGUE_TURNS = 2

const CATALOGUING_PHASES: SessionPhase[] = ['identity', 'physical', 'classification']

const CATALOGUING_ESSENTIAL_FIELDS = [
  'title',
  'yearCreated',
  'medium',
  'city',
  'widthWhole',
  'heightWhole',
  'dimensionUnit',
  'sizeTier',
] as const

export type AutoPhaseResult = {
  phase: SessionPhase
  transitioned: boolean
  reason?: string
}

function timelineFieldMap(timeline: unknown): Map<string, unknown> {
  const entries = Array.isArray(timeline) ? (timeline as TimelineEntry[]) : []
  const map = new Map<string, unknown>()
  for (const entry of collapseTimelineToLatest(entries)) {
    if (entry.field) map.set(entry.field, entry.value)
  }
  return map
}

function hasTimelineValue(map: Map<string, unknown>, field: string): boolean {
  const value = map.get(field)
  if (value == null) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (typeof value === 'number') return !Number.isNaN(value)
  if (Array.isArray(value)) return value.length > 0
  return true
}

/** True when core factual catalogue fields are staged — ready for intent / reflective dialogue. */
export function isCataloguingFieldsComplete(timeline: unknown): boolean {
  const map = timelineFieldMap(timeline)
  const hasCity =
    hasTimelineValue(map, 'city') || hasTimelineValue(map, 'locationCreated.city')
  if (!hasCity) return false
  return CATALOGUING_ESSENTIAL_FIELDS.every((field) => {
    if (field === 'city') return true
    return hasTimelineValue(map, field)
  })
}

function stepPreUploadToVision(args: {
  phase: SessionPhase
  effectiveHasImage: boolean
  tokenLog?: unknown
  fieldUpdateTimeline?: unknown
}): SessionPhase | null {
  if (args.phase !== 'pre-upload' || !args.effectiveHasImage) return null

  if (isCataloguingFieldsComplete(args.fieldUpdateTimeline)) {
    return 'intent'
  }

  const preUploadTurns = countTurnsInPhase(args.tokenLog, 'pre-upload')
  if (preUploadTurns >= VISION_DIALOGUE_TURNS) {
    return 'identity'
  }

  return 'vision'
}

function stepVisionToCataloguing(args: {
  phase: SessionPhase
  tokenLog?: unknown
}): SessionPhase | null {
  if (args.phase !== 'vision') return null
  const visionTurns = countTurnsInPhase(args.tokenLog, 'vision')
  if (visionTurns >= VISION_DIALOGUE_TURNS) return 'identity'
  return null
}

function stepCataloguingToIntent(args: {
  phase: SessionPhase
  fieldUpdateTimeline?: unknown
}): SessionPhase | null {
  if (!CATALOGUING_PHASES.includes(args.phase)) return null
  if (isCataloguingFieldsComplete(args.fieldUpdateTimeline)) return 'intent'
  return null
}

export function resolveAutoPhase(args: {
  sessionType: string
  currentPhase: SessionPhase
  hasPrimaryImage: boolean
  primaryUploadThisTurn?: boolean
  tokenLog?: unknown
  fieldUpdateTimeline?: unknown
}): AutoPhaseResult {
  if (args.sessionType !== 'artwork-cataloguing') {
    return { phase: args.currentPhase, transitioned: false }
  }

  const effectiveHasImage =
    args.hasPrimaryImage || Boolean(args.primaryUploadThisTurn)

  let phase = args.currentPhase
  const reasons: string[] = []

  const stepArgs = {
    effectiveHasImage,
    tokenLog: args.tokenLog,
    fieldUpdateTimeline: args.fieldUpdateTimeline,
  }

  for (const step of [
    () => stepPreUploadToVision({ ...stepArgs, phase }),
    () => stepVisionToCataloguing({ ...stepArgs, phase }),
    () => stepCataloguingToIntent({ ...stepArgs, phase }),
  ]) {
    const next = step()
    if (next && next !== phase) {
      reasons.push(`${phase}->${next}`)
      phase = next
    }
  }

  if (phase === args.currentPhase) {
    return { phase, transitioned: false }
  }

  return {
    phase,
    transitioned: true,
    reason: reasons.join(', '),
  }
}
