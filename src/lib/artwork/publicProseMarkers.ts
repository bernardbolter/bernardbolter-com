/**
 * Editorial / staging markers that must not ship in public artwork prose.
 * Used by the check script (and optionally CI) — not a silent stripper.
 */

export const PUBLIC_PROSE_FIELD_MAP = [
  { reportAs: 'intent', key: 'intent' },
  { reportAs: 'making', key: 'makingNote' },
  { reportAs: 'inThePractice', key: 'workContext' },
  { reportAs: 'inTheSeries', key: 'seriesContext' },
  { reportAs: 'whatThisIsnt', key: 'consciousRejections' },
  { reportAs: 'formalContribution', key: 'formalContributionAssessment' },
  { reportAs: 'descriptionShort', key: 'descriptionShort' },
  { reportAs: 'descriptionLong', key: 'descriptionLong', richText: true },
  { reportAs: 'artHistoricalContext', key: 'artHistoricalContext' },
] as const

export const PUBLIC_PROSE_MARKERS: Array<{ label: string; re: RegExp }> = [
  { label: 'NOTE:', re: /\bNOTE\s*:/i },
  { label: 'TODO', re: /\bTODO\b/i },
  { label: 'FIXME', re: /\bFIXME\b/i },
  { label: 'should migrate', re: /should\s+migrate/i },
  { label: 'needs to', re: /\bneeds\s+to\b/i },
  { label: 'placeholder', re: /\bplaceholder\b/i },
  { label: 'temporary', re: /\btemporary\b/i },
  { label: '[?]', re: /\[\?\]/ },
  { label: 'verify', re: /\bverify\b/i },
  { label: 'check this', re: /\bcheck\s+this\b/i },
  { label: 'XXX', re: /\bXXX\b/ },
]

export function findPublicProseMarkers(text: string): string[] {
  if (!text.trim()) return []
  return PUBLIC_PROSE_MARKERS.filter((p) => p.re.test(text)).map((p) => p.label)
}
