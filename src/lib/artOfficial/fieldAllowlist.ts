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

export function isFieldAllowedForAgent(collection: string, field: string): boolean {
  if (collection === 'practice-knowledge') {
    return isPracticeKnowledgeSlug(field)
  }
  return !FORBIDDEN.has(`${collection}.${field}`)
}
