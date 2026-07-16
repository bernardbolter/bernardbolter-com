/**
 * Guards for Moondream artwork visionAnalyses writes.
 * Higher-tier models (Claude etc.) must never be overwritten or displaced
 * by Moondream — visionAnalyses display is latest-wins.
 */

const HIGHER_TIER_PREFIXES = [
  'claude',
  'anthropic',
  'gpt',
  'o1',
  'o3',
  'gemini',
  'deepseek',
  'sonnet',
  'opus',
  'haiku',
] as const

export const MOONDREAM_VISION_MODEL = 'moondream-station'

export type VisionAnalysisModelRow = {
  model?: string | null
}

export function normalizeVisionModel(model: string | null | undefined): string {
  return (model ?? '').trim().toLowerCase()
}

export function isMoondreamVisionModel(model: string | null | undefined): boolean {
  const normalized = normalizeVisionModel(model)
  return normalized.startsWith('moondream')
}

/** Fail closed: unknown non-moondream models count as higher-tier. */
export function isHigherTierVisionModel(model: string | null | undefined): boolean {
  const normalized = normalizeVisionModel(model)
  if (!normalized) return false
  if (isMoondreamVisionModel(normalized)) return false
  return (
    HIGHER_TIER_PREFIXES.some((prefix) => normalized.startsWith(prefix)) ||
    !isMoondreamVisionModel(normalized)
  )
}

export type MoondreamVisionDecision =
  | { action: 'append' }
  | { action: 'skip'; reason: string }

export function decideMoondreamVisionAppend(
  existing: VisionAnalysisModelRow[] | null | undefined,
): MoondreamVisionDecision {
  const rows = existing ?? []
  if (rows.some((row) => isHigherTierVisionModel(row.model))) {
    return {
      action: 'skip',
      reason: 'higher-tier visionAnalyses already present',
    }
  }
  if (rows.some((row) => isMoondreamVisionModel(row.model))) {
    return {
      action: 'skip',
      reason: 'moondream visionAnalyses already present',
    }
  }
  return { action: 'append' }
}
