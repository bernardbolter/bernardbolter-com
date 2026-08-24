export const PROVENANCE_CONFIDENCE_LEVELS = [
  'documented-fact',
  'credible-inference',
  'institutional-assertion',
  'speculation',
] as const

export type ProvenanceConfidenceLevel = (typeof PROVENANCE_CONFIDENCE_LEVELS)[number]

const LEVEL_SET = new Set<string>(PROVENANCE_CONFIDENCE_LEVELS)

/** Map session/timeline vocabulary onto the four-level provenance enum. */
export function normalizeProvenanceConfidenceLevel(
  raw: unknown,
): ProvenanceConfidenceLevel | null {
  if (typeof raw !== 'string') return null
  const value = raw.trim().toLowerCase()
  if (!value) return null
  if (LEVEL_SET.has(value)) return value as ProvenanceConfidenceLevel

  switch (value) {
    case 'high':
    case 'confirmed':
      return 'documented-fact'
    case 'medium':
    case 'inferred':
      return 'credible-inference'
    case 'low':
      return 'speculation'
    default:
      return null
  }
}

export function normalizeProvenanceConfidenceLayer(raw: unknown): unknown {
  if (!Array.isArray(raw)) return raw

  return raw.map((row) => {
    if (!row || typeof row !== 'object') return row
    const next = { ...(row as Record<string, unknown>) }
    const level = normalizeProvenanceConfidenceLevel(next.confidenceLevel)
    if (level) next.confidenceLevel = level
    return next
  })
}
