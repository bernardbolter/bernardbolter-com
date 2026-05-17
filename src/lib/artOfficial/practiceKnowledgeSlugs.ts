/** Slugs for Practice Knowledge rows (must match PracticeKnowledge collection). */
export const PRACTICE_KNOWLEDGE_SLUGS = [
  'biography',
  'artist-statement',
  'series',
  'visual-vocabulary',
  'art-historical-touchstones',
  'preferred-vocabulary',
] as const

export type PracticeKnowledgeSlug = (typeof PRACTICE_KNOWLEDGE_SLUGS)[number]

export const ONBOARDING_PRACTICE_SLUGS: PracticeKnowledgeSlug[] = [
  'series',
  'visual-vocabulary',
  'art-historical-touchstones',
  'preferred-vocabulary',
]

export function isPracticeKnowledgeSlug(field: string): field is PracticeKnowledgeSlug {
  return (PRACTICE_KNOWLEDGE_SLUGS as readonly string[]).includes(field)
}
