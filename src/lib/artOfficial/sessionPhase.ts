import { ART_OFFICIAL_MODEL } from './anthropic'
import {
  type EventDialoguePhase,
  normalizeEventDialoguePhase,
} from './eventDialoguePhase'

export const SESSION_PHASES = [
  'pre-upload',
  'vision',
  'identity',
  'physical',
  'classification',
  'intent',
  'art-historical',
  'late',
  'confirmation',
] as const

export type SessionPhase = (typeof SESSION_PHASES)[number]

export const SESSION_PHASE_LABELS: Record<SessionPhase, string> = {
  'pre-upload': 'Pre-upload',
  vision: 'First sight',
  identity: 'Identity',
  physical: 'Physical',
  classification: 'Classification',
  intent: 'Intent',
  'art-historical': 'Art historical',
  late: 'Late',
  confirmation: 'Confirmation',
}

/** Factual / lightweight dialogue — Haiku. */
export const HAIKU_PHASES: SessionPhase[] = [
  'pre-upload',
  'identity',
  'physical',
  'classification',
]

export const ART_OFFICIAL_MODEL_HAIKU =
  process.env.ART_OFFICIAL_MODEL_HAIKU ?? 'claude-haiku-4-5'

export const ART_OFFICIAL_MODEL_SONNET = ART_OFFICIAL_MODEL

/** Vision chat + image analysis dialogue — defaults to Sonnet. */
export const ART_OFFICIAL_MODEL_VISION =
  process.env.ART_OFFICIAL_MODEL_VISION ?? ART_OFFICIAL_MODEL_SONNET

/**
 * Model tiers:
 * - event-enrichment Phase A → Haiku
 * - event-enrichment Phase B → Sonnet
 * - artwork-cataloguing pre-upload + identity/physical/classification → Haiku
 * - artwork vision → vision model
 * - artwork intent+ → Sonnet
 */
export function resolveModel(
  phase: SessionPhase,
  sessionType: string,
  eventDialoguePhase?: EventDialoguePhase,
): string {
  if (sessionType === 'event-enrichment') {
    return normalizeEventDialoguePhase(eventDialoguePhase) === 'phase-b-reasoning'
      ? ART_OFFICIAL_MODEL_SONNET
      : ART_OFFICIAL_MODEL_HAIKU
  }
  if (sessionType !== 'artwork-cataloguing') {
    return ART_OFFICIAL_MODEL_SONNET
  }
  if (phase === 'vision') return ART_OFFICIAL_MODEL_VISION
  if (HAIKU_PHASES.includes(phase)) return ART_OFFICIAL_MODEL_HAIKU
  return ART_OFFICIAL_MODEL_SONNET
}

export function defaultSessionPhase(
  sessionType: string,
  hasArtworkRecord: boolean,
): SessionPhase {
  if (sessionType === 'artwork-cataloguing') {
    return hasArtworkRecord ? 'identity' : 'pre-upload'
  }
  if (sessionType === 'event-enrichment') {
    return 'intent'
  }
  return 'intent'
}

export function normalizeSessionPhase(
  value: unknown,
  fallback: SessionPhase,
): SessionPhase {
  if (
    typeof value === 'string' &&
    (SESSION_PHASES as readonly string[]).includes(value)
  ) {
    return value as SessionPhase
  }
  return fallback
}
