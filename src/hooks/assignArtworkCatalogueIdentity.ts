import type { PayloadRequest } from 'payload'

import { buildCatalogueIdentity } from '@/lib/artwork/catalogueNumber'
import { getCustomMediums, type CustomMediumRow } from '@/lib/artOfficial/artworkMediumOptions'
import { lookupMediumAatUri } from '@/lib/artwork/mediumVocabulary'

type AssignArgs = {
  data: Record<string, unknown>
  operation: 'create' | 'update'
  originalDoc?: Record<string, unknown> | null
  req: PayloadRequest
}

export async function assignArtworkCatalogueIdentity({
  data,
  operation,
  originalDoc,
  req,
}: AssignArgs): Promise<void> {
  if (typeof data.catalogueNumber === 'string' && data.catalogueNumber.trim()) {
    return
  }

  if (operation === 'update') {
    const prevNumber = originalDoc?.catalogueNumber
    if (typeof prevNumber === 'string' && prevNumber.trim()) {
      data.catalogueNumber = prevNumber
      if (originalDoc?.catalogueSequence != null) {
        data.catalogueSequence = originalDoc.catalogueSequence
      }
      return
    }
  }

  const seriesId =
    typeof data.series === 'object' && data.series !== null
      ? (data.series as { id?: number }).id
      : data.series
  const yearCreated = data.yearCreated

  if (seriesId == null || typeof yearCreated !== 'number' || Number.isNaN(yearCreated)) {
    return
  }

  let cataloguePrefix: string | null = null
  const artists = await req.payload.find({
    collection: 'artists',
    limit: 1,
    depth: 0,
    req,
  })
  const artist = artists.docs[0]
  if (artist && typeof artist.cataloguePrefix === 'string') {
    cataloguePrefix = artist.cataloguePrefix
  }

  const identity = await buildCatalogueIdentity({
    payload: req.payload,
    seriesId: seriesId as number | string,
    yearCreated,
    cataloguePrefix,
    req,
  })

  data.catalogueSequence = identity.catalogueSequence
  data.catalogueNumber = identity.catalogueNumber
}

export async function syncArtworkMediumAatUri(
  data: Record<string, unknown>,
  req: PayloadRequest,
): Promise<void> {
  if (typeof data.mediumAatUri === 'string' && data.mediumAatUri.trim()) {
    return
  }

  const medium = typeof data.medium === 'string' ? data.medium : null
  if (!medium) return

  const customMediums: CustomMediumRow[] = await getCustomMediums(req.payload)
  const uri = lookupMediumAatUri(medium, customMediums)
  if (uri) {
    data.mediumAatUri = uri
  }
}
