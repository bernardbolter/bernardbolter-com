import type { CollectionBeforeOperationHook } from 'payload'
import { NotFound } from 'payload'

const NUMERIC_ID = /^\d+$/

/**
 * Payload REST is ID-based (`GET /api/artworks/:id`). A slug in that slot
 * (`/api/artworks/the-thinker`) is queried as `id = 'the-thinker'` against an
 * integer PK and 500s. Non-numeric ids are not a slug lookup — 404 cleanly.
 */
export const artworkBeforeOperation: CollectionBeforeOperationHook = async ({ args, operation }) => {
  if (operation !== 'read') return args
  if (!args || typeof args !== 'object' || !('id' in args)) return args

  const id = (args as { id?: unknown }).id
  if (id == null || id === '') return args
  if (NUMERIC_ID.test(String(id))) return args

  throw new NotFound()
}
