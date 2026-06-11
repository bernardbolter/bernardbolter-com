export function slugifyEventTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function buildEventSlug(title: string, year: number): string {
  const base = slugifyEventTitle(title)
  const yearPart = String(year)
  if (!base) return yearPart
  return `${base}-${yearPart}`
}
