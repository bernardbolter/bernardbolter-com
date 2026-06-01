/**
 * DCS Vendure webhook sync — deferred.
 * Full spec: docs/dcs-vendure-sync-spec.md (to be written).
 *
 * When implemented: POST body { vendureProductId, quantitySold } decrements
 * matching editionTiers[].editionsRemaining on the artwork record.
 */
export async function POST() {
  return Response.json(
    { error: 'DCS Vendure sync not implemented yet.' },
    { status: 501 },
  )
}
