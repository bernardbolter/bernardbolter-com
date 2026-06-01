import { isPracticeKnowledgeSlug } from './practiceKnowledgeSlugs'

const FORBIDDEN = new Set([
  'artworks.timelineDate',
  'artworks.dateDisplay',
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
  // Curated relationship collections — managed in admin, not stageable as text
  'artworks.artHistoricalReferences',
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

const EPISODE_AGENT_FIELDS = new Set([
  'concept',
  'shotList',
  'storyboard',
  'assembly',
  'captionDrafts',
])

/** Flat top-level artwork fields that must stage and commit (regression guard). */
export const ARTWORK_COMMIT_ROOT_FIELDS = [
  'movementTags',
  'styleTags',
  'subjectTags',
  'genreTags',
  'periodTags',
  'support',
  'medium',
  'measurementType',
] as const

export function isArtworkCommitRootField(field: string): boolean {
  return (ARTWORK_COMMIT_ROOT_FIELDS as readonly string[]).includes(field)
}

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

  if (collection === 'episodes') {
    return EPISODE_AGENT_FIELDS.has(field)
  }

  return !FORBIDDEN.has(`${collection}.${field}`)
}
