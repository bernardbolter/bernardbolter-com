import type { Payload } from 'payload'

import {
  buildArtworkPatchFromTimeline,
  sanitizeArtworkCommitPatch,
} from '@/lib/artOfficial/buildArtworkPatch'
import { isFieldAllowedForAgent, validateArtHistoricalReferencesValue } from '@/lib/artOfficial/fieldAllowlist'
import { resolveArtworkCommitReferences } from '@/lib/artOfficial/resolveArtworkCommitReferences'
import type { Session, User } from '@/payload-types'

import {
  normalizeArtworkFieldsImportItems,
  type ArtworkFieldsImportInput,
} from './archiveImportSchemas'
import { revalidateArtworkPaths } from './revalidateArtworkPaths'

export type ArtworkFieldsImportResult = {
  slug: string
  artworkId: number
  fieldsApplied: string[]
}

function assertAllowedFields(fields: Record<string, unknown>): string[] {
  const disallowed: string[] = []
  for (const [field, value] of Object.entries(fields)) {
    if (!isFieldAllowedForAgent('artworks', field)) {
      disallowed.push(field)
      continue
    }
    if (field === 'artHistoricalReferences') {
      const shape = validateArtHistoricalReferencesValue(value)
      if (!shape.ok) throw new Error(shape.error)
    }
  }
  if (disallowed.length > 0) {
    throw new Error(
      `Disallowed fields: ${disallowed.join(', ')}. Use Art/Official-allowed artwork paths only.`,
    )
  }
  return Object.keys(fields)
}

function timelineFromFields(fields: Record<string, unknown>) {
  return Object.entries(fields).map(([field, value]) => ({
    targetCollection: 'artworks',
    field,
    value,
    source: 'archive-import',
    timestamp: new Date().toISOString(),
  }))
}

export async function applyArtworkFieldsImport(
  payload: Payload,
  user: User,
  input: ArtworkFieldsImportInput,
): Promise<ArtworkFieldsImportResult[]> {
  const items = normalizeArtworkFieldsImportItems(input)
  const results: ArtworkFieldsImportResult[] = []

  for (const item of items) {
    const slug = item.slug.trim()
    const fieldKeys = assertAllowedFields(item.fields)

    const response = await payload.find({
      collection: 'artworks',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
      overrideAccess: false,
      user,
    })

    const artwork = response.docs[0]
    if (!artwork) {
      throw new Error(`Artwork not found for slug "${slug}"`)
    }

    const timeline = timelineFromFields(item.fields)
    let patch = buildArtworkPatchFromTimeline(timeline)

    const creatorId =
      typeof artwork.creator === 'object' && artwork.creator
        ? artwork.creator.id
        : artwork.creator

    const session = {
      id: 0,
      artistId: creatorId ?? user.id,
    } as Session

    // Resolve references first (tag labels / art-historical names → IDs)
    // BEFORE sanitize, which strips non-id relationship values.
    patch = await resolveArtworkCommitReferences({ payload, user, session }, patch)
    patch = sanitizeArtworkCommitPatch(patch)

    if (Object.keys(patch).length === 0) {
      throw new Error(`No valid fields to apply for slug "${slug}"`)
    }

    await payload.update({
      collection: 'artworks',
      id: artwork.id,
      data: patch,
      overrideAccess: false,
      user,
    })

    revalidateArtworkPaths(slug)

    results.push({
      slug,
      artworkId: artwork.id,
      fieldsApplied: fieldKeys,
    })
  }

  return results
}
