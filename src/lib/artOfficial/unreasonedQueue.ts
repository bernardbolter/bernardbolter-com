const MISSING_INTENT_FIELDS = [
  'intent',
  'artHistoricalContext',
  'seriesContext',
  'consciousRejections',
  'formalContributionAssessment',
] as const

export function countMissingIntentFields(
  artwork: Record<string, unknown>,
): number {
  let missing = 0
  for (const field of MISSING_INTENT_FIELDS) {
    const value = artwork[field]
    if (value == null) {
      missing += 1
      continue
    }
    if (typeof value === 'string' && !value.trim()) {
      missing += 1
    }
  }
  return missing
}
