/** Resolve a localized Payload text field to a display string. */
export function localizedText(value: unknown, locale = 'en'): string {
  if (typeof value === 'string') return value.trim()
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    const preferred = record[locale]
    if (typeof preferred === 'string' && preferred.trim()) return preferred.trim()
    for (const v of Object.values(record)) {
      if (typeof v === 'string' && v.trim()) return v.trim()
    }
  }
  return ''
}
