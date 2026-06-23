import type { Person } from '@/payload-types'

type PersonLike = Pick<
  Person,
  'name' | 'nameLegal' | 'website' | 'instagram' | 'wikidataUri' | 'ulanUri' | 'externalIdentifiers'
>

export type PersonJsonLdOptions = {
  /** Event-specific role label, e.g. co-exhibitor medium. */
  eventRole?: string | null
}

/** schema.org Person from a People collection record. Never includes internal `note`. */
export function personToJsonLd(
  person: PersonLike | null | undefined,
  options: PersonJsonLdOptions = {},
): Record<string, unknown> | null {
  if (!person?.name?.trim()) return null

  const obj: Record<string, unknown> = {
    '@type': 'Person',
    name: person.nameLegal?.trim() || person.name.trim(),
  }

  const sameAs: string[] = []
  if (person.wikidataUri?.trim()) sameAs.push(person.wikidataUri.trim())
  if (person.ulanUri?.trim()) sameAs.push(person.ulanUri.trim())

  const instagram = person.instagram?.trim()
  if (instagram) {
    const handle = instagram.replace(/^@/, '')
    if (handle) sameAs.push(`https://www.instagram.com/${handle}/`)
  }

  const website = person.website?.trim()
  if (website) sameAs.push(website)

  person.externalIdentifiers?.forEach((id) => {
    if (id?.uri?.trim()) sameAs.push(id.uri.trim())
  })

  const uniqueSameAs = [...new Set(sameAs)]
  if (uniqueSameAs.length === 1) obj.sameAs = uniqueSameAs[0]
  if (uniqueSameAs.length > 1) obj.sameAs = uniqueSameAs
  if (website) obj.url = website

  const eventRole = options.eventRole?.trim()
  if (eventRole) obj.jobTitle = eventRole

  return obj
}

export function resolvePopulatedPerson(
  value: number | Person | null | undefined,
): Person | null {
  if (!value || typeof value === 'number') return null
  return value
}

export function personDisplayName(value: number | Person | null | undefined): string | null {
  const person = resolvePopulatedPerson(value)
  return person?.name?.trim() || null
}
