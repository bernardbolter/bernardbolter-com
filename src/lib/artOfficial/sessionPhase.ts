import { ART_OFFICIAL_MODEL } from './anthropic'

export const SESSION_PHASES = [
  'pre-upload',
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
  identity: 'Identity',
  physical: 'Physical',
  classification: 'Classification',
  intent: 'Intent',
  'art-historical': 'Art historical',
  late: 'Late',
  confirmation: 'Confirmation',
}

export const HAIKU_PHASES: SessionPhase[] = [
  'pre-upload',
  'identity',
  'physical',
  'classification',
]

export const ART_OFFICIAL_MODEL_HAIKU =
  process.env.ART_OFFICIAL_MODEL_HAIKU ?? 'claude-haiku-4-5-20251022'

export const ART_OFFICIAL_MODEL_SONNET = ART_OFFICIAL_MODEL

/** Haiku for factual cataloguing phases; Sonnet for interpretive phases and all other session types. */
export function resolveModel(phase: SessionPhase, sessionType: string): string {
  if (sessionType !== 'artwork-cataloguing') {
    return ART_OFFICIAL_MODEL_SONNET
  }
  return HAIKU_PHASES.includes(phase) ? ART_OFFICIAL_MODEL_HAIKU : ART_OFFICIAL_MODEL_SONNET
}

export function defaultSessionPhase(
  sessionType: string,
  hasArtworkRecord: boolean,
): SessionPhase {
  if (sessionType === 'artwork-cataloguing') {
    return hasArtworkRecord ? 'identity' : 'pre-upload'
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
