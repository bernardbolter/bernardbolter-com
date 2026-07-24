import { normalizeStatementRelatedWorks } from '@/helpers/statementRelatedWorks'
import type { StatementRelatedWork } from '@/helpers/statementRelatedWorks'
import type { Artwork } from '@/payload-types'

/** Map linked artwork relations to StatementRelatedWorks card shape. */
export function linkedArtworksToCards(
  linked: (number | Artwork)[] | null | undefined,
  options?: { sortByYear?: boolean },
): StatementRelatedWork[] {
  const published = (linked ?? []).filter((entry): entry is Artwork => {
    return Boolean(entry && typeof entry === 'object' && entry.status === 'published')
  })

  const cards = normalizeStatementRelatedWorks(
    published.map((artwork) => ({
      id: String(artwork.id),
      artwork,
      note: null,
    })),
  )

  if (!options?.sortByYear) return cards
  return [...cards].sort((a, b) => (a.artwork.yearCreated ?? 0) - (b.artwork.yearCreated ?? 0))
}
