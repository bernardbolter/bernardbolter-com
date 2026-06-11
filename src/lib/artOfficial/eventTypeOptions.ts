export const EVENT_TYPE_OPTIONS = [
  { label: 'Solo Exhibition', value: 'solo-exhibition' },
  { label: 'Group Exhibition', value: 'group-exhibition' },
  { label: 'Art Fair', value: 'art-fair' },
  { label: 'Residency', value: 'residency' },
  { label: 'Award', value: 'award' },
  { label: 'Publication', value: 'publication' },
  { label: 'Bibliography', value: 'bibliography' },
  { label: 'Public Commission', value: 'public-commission' },
  { label: 'Talk / Panel', value: 'talk-panel' },
  { label: 'Screening', value: 'screening' },
  { label: 'Performance', value: 'performance' },
  { label: 'Education', value: 'education' },
  { label: 'Other', value: 'other' },
] as const

export type EventTypeValue = (typeof EVENT_TYPE_OPTIONS)[number]['value']

export const EVENT_TYPE_SHORT_LABEL: Record<EventTypeValue, string> = {
  'solo-exhibition': 'Solo',
  'group-exhibition': 'Group',
  'art-fair': 'Fair',
  residency: 'Residency',
  award: 'Award',
  publication: 'Publication',
  bibliography: 'Bibliography',
  'public-commission': 'Commission',
  'talk-panel': 'Talk',
  screening: 'Screening',
  performance: 'Performance',
  education: 'Education',
  other: 'Other',
}
