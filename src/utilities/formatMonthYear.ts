export function formatMonthYear(value?: string | null): string {
  if (!value?.trim()) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.trim()
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}
