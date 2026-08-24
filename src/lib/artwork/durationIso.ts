/** HH:MM:SS, MM:SS, plain seconds, or ISO-8601 `PT#H#M#S`. Prose → null. */
export function parseDurationToSeconds(duration: string | null | undefined): number | null {
  if (duration == null) return null
  const s = duration.trim()
  if (!s) return null

  const iso = s.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i)
  if (iso && (iso[1] || iso[2] || iso[3])) {
    const hours = iso[1] ? parseInt(iso[1], 10) : 0
    const minutes = iso[2] ? parseInt(iso[2], 10) : 0
    const seconds = iso[3] ? parseInt(iso[3], 10) : 0
    return hours * 3600 + minutes * 60 + seconds
  }

  const withoutColons = s.replace(/:/g, '')
  if (/[a-zA-Z]/.test(withoutColons)) return null

  const parts = s.split(':').map((p) => parseInt(p, 10))
  if (parts.some((p) => Number.isNaN(p))) return null

  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 1) return parts[0]
  return null
}

export function secondsToIso8601(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const seconds = safe % 60
  let out = 'PT'
  if (hours) out += `${hours}H`
  if (minutes) out += `${minutes}M`
  if (seconds || (!hours && !minutes)) out += `${seconds}S`
  return out
}

/**
 * Store parseable clock times as ISO-8601 duration. Leave open-ended prose unchanged.
 */
export function normalizeDurationToIso8601(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const trimmed = raw.trim()
  if (!trimmed) return null

  const seconds = parseDurationToSeconds(trimmed)
  if (seconds == null) return trimmed
  return secondsToIso8601(seconds)
}

export function isIso8601Duration(value: string | null | undefined): boolean {
  if (!value?.trim()) return false
  return /^PT(?:\d+H)?(?:\d+M)?(?:\d+S)?$/i.test(value.trim()) && /[HMS]/i.test(value)
}
