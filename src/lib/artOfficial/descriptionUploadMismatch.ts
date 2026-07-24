/**
 * Lightweight blind-description vs upload consistency check (Part 3c).
 * Looks for named, checkable tokens in firstImpression with no counterpart in analysis.
 */

const CHECKABLE_PATTERNS: Array<{ label: string; re: RegExp }> = [
  { label: 'yellow bus', re: /\byellow\s+bus\b/i },
  { label: 'concrete pyramid', re: /\bconcrete\s+pyramid\b/i },
  { label: 'red bus', re: /\bred\s+bus\b/i },
  { label: 'train', re: /\btrains?\b/i },
  { label: 'bridge', re: /\bbridges?\b/i },
  { label: 'tower', re: /\btowers?\b/i },
  { label: 'portrait', re: /\bportrait\b/i },
  { label: 'sculpture', re: /\bsculptures?\b/i },
]

export type MismatchCheckInput = {
  firstImpression?: string | null
  compositionalNotes?: string | null
  detectedSubjects?: string[] | null
  dominantColors?: string[] | null
}

export type MismatchCheckResult = {
  mismatch: boolean
  missingLabels: string[]
  message: string | null
}

export function checkDescriptionUploadMismatch(
  input: MismatchCheckInput,
): MismatchCheckResult {
  const impression = input.firstImpression?.trim() ?? ''
  if (!impression) {
    return { mismatch: false, missingLabels: [], message: null }
  }

  const analysisBlob = [
    input.compositionalNotes ?? '',
    ...(input.detectedSubjects ?? []),
    ...(input.dominantColors ?? []),
  ]
    .join(' ')
    .toLowerCase()

  if (!analysisBlob.trim()) {
    return { mismatch: false, missingLabels: [], message: null }
  }

  const missing: string[] = []
  for (const pattern of CHECKABLE_PATTERNS) {
    if (!pattern.re.test(impression)) continue
    // Token must appear in analysis text somehow
    const key = pattern.label.split(/\s+/)[0]?.toLowerCase() ?? ''
    if (key && !analysisBlob.includes(key)) {
      missing.push(pattern.label)
    }
  }

  if (missing.length === 0) {
    return { mismatch: false, missingLabels: [], message: null }
  }

  return {
    mismatch: true,
    missingLabels: missing,
    message: `This doesn't look like what you described — are we looking at the same piece? Blind description mentioned ${missing.join(', ')}, which isn't showing up in the uploaded image analysis.`,
  }
}
