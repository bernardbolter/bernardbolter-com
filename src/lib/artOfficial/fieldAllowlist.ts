import { isPracticeKnowledgeSlug } from './practiceKnowledgeSlugs'

const FORBIDDEN = new Set([
  'artworks.askingPrice',
  'artworks.listingCurrency',
  'artworks.salesRecord',
  'artworks.insuranceValue',
  'artworks.insuranceValueDate',
  'artworks.galleryReference',
  'artworks.galleryText',
  'artworks.ownershipHistory',
  'artworks.loanHistory',
  'artworks.exhibitionHistory',
  'artworks.provenanceConfidenceLayer',
  'artworks.recordOrigin',
  'artworks.status',
  'artworks._status',
  'sessions.messages',
  'sessions.sessionId',
  'sessions.createdAt',
  'sessions.completedAt',
  'artists.publicEmail',
  'artists.externalIdentifiers',
])

/** Corpus + core narrative fields Art/Official may stage on triptychs (not commerce or structure). */
const TRIPTYCH_AGENT_FIELDS = new Set([
  'title',
  'yearStart',
  'yearCompleted',
  'city',
  'country',
  'description',
  'descriptionShort',
  'descriptionLong',
  'intent',
  'conceptualKeywords',
  'artHistoricalReferences',
  'artHistoricalContext',
  'seriesContext',
  'formalContributionAssessment',
])

const TRIPTYCH_FORBIDDEN = new Set([
  'slug',
  'status',
  'series',
  'panels',
  'vendureProductId',
  'printSets',
  'printEditionReleaseDate',
  'signedAndNumbered',
  'originalsSoldDate',
  'originalsBuyer',
])

export function isFieldAllowedForAgent(collection: string, field: string): boolean {
  if (collection === 'practice-knowledge') {
    return isPracticeKnowledgeSlug(field)
  }

  if (collection === 'small-prints') {
    return false
  }

  if (collection === 'triptychs') {
    if (TRIPTYCH_FORBIDDEN.has(field)) return false
    if (field.startsWith('printSets')) return false
    return TRIPTYCH_AGENT_FIELDS.has(field)
  }

  return !FORBIDDEN.has(`${collection}.${field}`)
}
