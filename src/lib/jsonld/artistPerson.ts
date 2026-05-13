import type { Artist } from '@/payload-types'

/** schema.org Person for `creator` / `copyrightHolder` with ULAN + Wikidata identifiers. */
export function artistAsSchemaPerson(artist: Artist | null | undefined): Record<string, unknown> {
  if (!artist?.name) {
    return { '@type': 'Person', name: 'Artist' }
  }
  const identifiers: Record<string, unknown>[] = []
  if (artist.ulanUri) {
    identifiers.push({
      '@type': 'PropertyValue',
      propertyID: 'ULAN',
      value: artist.ulanUri,
    })
  }
  if (artist.wikidataUri) {
    identifiers.push({
      '@type': 'PropertyValue',
      propertyID: 'Wikidata',
      value: artist.wikidataUri,
    })
  }

  return {
    '@type': 'Person',
    name: artist.name,
    ...(identifiers.length ? { identifier: identifiers } : {}),
  }
}
