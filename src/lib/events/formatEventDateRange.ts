import type { Event } from '@/payload-types'

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

function parseEventDate(value: string): Date {
  return new Date(value)
}

function formatMonthYear(date: Date): string {
  return `${SHORT_MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`
}

function formatDayMonthYear(date: Date): string {
  return `${date.getUTCDate()} ${SHORT_MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`
}

/** Human-readable event date range for public pages (month/year precision, no time-of-day). */
export function formatEventDateRange(
  event: Pick<Event, 'startDate' | 'endDate' | 'isOngoing' | 'yearStart'>,
): string {
  const start = event.startDate ? parseEventDate(event.startDate) : null
  const end = event.endDate ? parseEventDate(event.endDate) : null

  if (!start || Number.isNaN(start.getTime())) {
    return event.yearStart ? String(event.yearStart) : ''
  }

  if (event.isOngoing) {
    return `${formatMonthYear(start)} – ongoing`
  }

  if (!end || Number.isNaN(end.getTime())) {
    return formatMonthYear(start)
  }

  const sameDay =
    start.getUTCFullYear() === end.getUTCFullYear() &&
    start.getUTCMonth() === end.getUTCMonth() &&
    start.getUTCDate() === end.getUTCDate()

  if (sameDay) {
    return formatDayMonthYear(start)
  }

  const sameYear = start.getUTCFullYear() === end.getUTCFullYear()
  if (sameYear) {
    return `${SHORT_MONTHS[start.getUTCMonth()]} – ${SHORT_MONTHS[end.getUTCMonth()]} ${start.getUTCFullYear()}`
  }

  return `${formatMonthYear(start)} – ${formatMonthYear(end)}`
}
