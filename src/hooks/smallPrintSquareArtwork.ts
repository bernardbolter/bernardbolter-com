import type { Validate } from 'payload'

/**
 * SmallPrints may only reference square-orientation artworks (print set builder).
 * Spec: handoff-ach-schema-extension.md Part 4.3.
 */
export const validateSquareArtwork: Validate = async (value, { req }) => {
  if (value == null || value === '') return true

  const artworkId =
    typeof value === 'object' && value !== null && 'id' in value
      ? (value as { id: number | string }).id
      : value

  if (artworkId == null) return true

  try {
    const artwork = await req.payload.findByID({
      collection: 'artworks',
      id: artworkId,
      depth: 0,
      overrideAccess: true,
      req,
    })
    if (artwork.orientation !== 'square') {
      return 'The related artwork must have orientation “square” to be added to the print set builder.'
    }
    return true
  } catch {
    return 'Could not verify artwork orientation.'
  }
}
