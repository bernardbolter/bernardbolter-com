import { describe, expect, it } from 'vitest'

import { Artworks } from '@/collections/Artworks'
import { ARTWORK_FIELD_CATALOG } from '@/lib/artOfficial/fieldCatalog'
import { collectArtworkFieldPaths } from '@/lib/artOfficial/collectArtworkFieldPaths'

describe('fieldCatalog drift', () => {
  it('every catalog field exists on the live Artworks collection', () => {
    const paths = collectArtworkFieldPaths(Artworks.fields ?? [])
    const missing = ARTWORK_FIELD_CATALOG.filter((f) => !paths.has(f.field)).map(
      (f) => f.field,
    )
    expect(missing).toEqual([])
  })
})
