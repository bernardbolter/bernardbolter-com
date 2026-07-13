/**
 * Overnight FieldNotes processing window — 02:00–08:00 local time by default.
 * See fieldnotes-worker-pipeline-spec.md §3.
 */

export const DEFAULT_PROCESSING_START_HOUR = 2
export const DEFAULT_PROCESSING_END_HOUR = 8
export const DEFAULT_PROCESSING_TIMEZONE = 'Europe/Berlin'

export type ProcessingWindowConfig = {
  startHour: number
  endHour: number
  timeZone: string
}

export function getProcessingWindowConfig(): ProcessingWindowConfig {
  const startHour = parseHourEnv(
    process.env.FIELDNOTE_PROCESSING_START_HOUR,
    DEFAULT_PROCESSING_START_HOUR,
  )
  const endHour = parseHourEnv(
    process.env.FIELDNOTE_PROCESSING_END_HOUR,
    DEFAULT_PROCESSING_END_HOUR,
  )
  const timeZone = process.env.FIELDNOTE_PROCESSING_TZ?.trim() || DEFAULT_PROCESSING_TIMEZONE

  return { startHour, endHour, timeZone }
}

function parseHourEnv(raw: string | undefined, fallback: number): number {
  if (raw == null || raw === '') return fallback
  const value = Number.parseInt(raw, 10)
  if (!Number.isFinite(value) || value < 0 || value > 23) {
    throw new Error(`Invalid processing hour env value: ${raw}`)
  }
  return value
}

/** Bypass window check for test gate / manual runs. */
export function isFieldNoteProcessingForced(): boolean {
  return process.env.FIELDNOTE_PROCESSING_FORCE === 'true'
}

type ZonedParts = {
  hour: number
  minute: number
}

function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  })
  const parts = formatter.formatToParts(date)
  const hour = Number.parseInt(parts.find((part) => part.type === 'hour')?.value ?? '0', 10)
  const minute = Number.parseInt(parts.find((part) => part.type === 'minute')?.value ?? '0', 10)
  return { hour, minute }
}

/**
 * True when local time is inside [startHour, endHour) — e.g. 02:00 inclusive, 08:00 exclusive.
 */
export function isWithinProcessingWindow(
  now = new Date(),
  config: ProcessingWindowConfig = getProcessingWindowConfig(),
): boolean {
  const { hour, minute } = getZonedParts(now, config.timeZone)
  const minutesOfDay = hour * 60 + minute
  const startMinutes = config.startHour * 60
  const endMinutes = config.endHour * 60

  if (startMinutes === endMinutes) {
    return false
  }

  if (startMinutes < endMinutes) {
    return minutesOfDay >= startMinutes && minutesOfDay < endMinutes
  }

  // Overnight wrap (not used with 02–08, but safe for custom env).
  return minutesOfDay >= startMinutes || minutesOfDay < endMinutes
}

export function shouldProcessFieldNotesNow(now = new Date()): boolean {
  return isFieldNoteProcessingForced() || isWithinProcessingWindow(now)
}
