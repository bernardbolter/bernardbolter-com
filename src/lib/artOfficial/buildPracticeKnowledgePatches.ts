import { plainToLexical } from './plainToLexical'
import { isPracticeKnowledgeSlug } from './practiceKnowledgeSlugs'

export type PracticeKnowledgePatch = {
  slug: string
  content: ReturnType<typeof plainToLexical>
}

export type TimelineLike = {
  targetCollection?: string
  field?: string
  value?: unknown
}

/** Merge staged onboarding updates into commit payloads (last write per slug wins). */
export function buildPracticeKnowledgePatches(
  timeline: TimelineLike[],
): PracticeKnowledgePatch[] {
  const bySlug = new Map<string, string>()

  for (const entry of timeline) {
    if (entry.targetCollection !== 'practice-knowledge' || !entry.field) continue
    if (!isPracticeKnowledgeSlug(entry.field)) continue

    const text =
      typeof entry.value === 'string'
        ? entry.value
        : entry.value != null
          ? JSON.stringify(entry.value)
          : ''
    if (!text.trim()) continue

    bySlug.set(entry.field, text.trim())
  }

  return [...bySlug.entries()].map(([slug, text]) => ({
    slug,
    content: plainToLexical(text),
  }))
}
