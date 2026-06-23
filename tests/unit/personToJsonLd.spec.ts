import { describe, expect, it } from 'vitest'

import { personToJsonLd } from '@/utilities/personToJsonLd'
import type { Person } from '@/payload-types'

function basePerson(overrides: Partial<Person> = {}): Person {
  return {
    id: 1,
    name: 'Jürgen Blümlein',
    updatedAt: '2020-01-01T00:00:00.000Z',
    createdAt: '2020-01-01T00:00:00.000Z',
    ...overrides,
  } as Person
}

describe('personToJsonLd', () => {
  it('returns null for missing person', () => {
    expect(personToJsonLd(null)).toBeNull()
    expect(personToJsonLd(undefined)).toBeNull()
  })

  it('outputs only type and name when no URIs exist', () => {
    expect(personToJsonLd(basePerson())).toEqual({
      '@type': 'Person',
      name: 'Jürgen Blümlein',
    })
  })

  it('prefers nameLegal for JSON-LD name', () => {
    expect(personToJsonLd(basePerson({ nameLegal: 'Jürgen Blümlein GmbH' }))).toEqual({
      '@type': 'Person',
      name: 'Jürgen Blümlein GmbH',
    })
  })

  it('builds sameAs from instagram handle and authority URIs', () => {
    expect(
      personToJsonLd(
        basePerson({
          instagram: '@juergenbluemlein',
          wikidataUri: 'https://www.wikidata.org/entity/Q12345',
        }),
      ),
    ).toEqual({
      '@type': 'Person',
      name: 'Jürgen Blümlein',
      sameAs: [
        'https://www.wikidata.org/entity/Q12345',
        'https://www.instagram.com/juergenbluemlein/',
      ],
    })
  })

  it('uses a single sameAs string when only one URI exists', () => {
    expect(personToJsonLd(basePerson({ instagram: 'juergenbluemlein' }))).toEqual({
      '@type': 'Person',
      name: 'Jürgen Blümlein',
      sameAs: 'https://www.instagram.com/juergenbluemlein/',
    })
  })

  it('never includes internal note', () => {
    const jsonLd = personToJsonLd(basePerson({ note: 'Internal only' }))
    expect(jsonLd).not.toHaveProperty('note')
  })

  it('adds eventRole as jobTitle when provided', () => {
    expect(personToJsonLd(basePerson(), { eventRole: 'painter' })).toEqual({
      '@type': 'Person',
      name: 'Jürgen Blümlein',
      jobTitle: 'painter',
    })
  })
})
