export function slugifyEventTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function buildEventSlug(title: string, year: number, city?: string | null): string {
  const base = slugifyEventTitle(title)
  const cityPart = city ? slugifyEventTitle(city) : ''
  const yearPart = String(year)
  if (!base && !cityPart) return yearPart
  if (!cityPart) return `${base}-${yearPart}`
  if (!base) return `${cityPart}-${yearPart}`
  return `${base}-${cityPart}-${yearPart}`
}
