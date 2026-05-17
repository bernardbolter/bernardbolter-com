import type { Payload } from 'payload'

import type { User } from '@/payload-types'

import {
  buildPracticeKnowledgePatches,
  type PracticeKnowledgePatch,
} from './buildPracticeKnowledgePatches'

export type ApplyPracticeKnowledgeResult = {
  updated: string[]
  missing: string[]
  failed: Array<{ slug: string; error: string }>
  patchCount: number
}

const LOCALES = ['en', 'de'] as const

export async function applyPracticeKnowledgePatches(
  payload: Payload,
  user: User,
  patches: PracticeKnowledgePatch[],
): Promise<ApplyPracticeKnowledgeResult> {
  const updated: string[] = []
  const missing: string[] = []
  const failed: Array<{ slug: string; error: string }> = []

  for (const patch of patches) {
    try {
      const found = await payload.find({
        collection: 'practice-knowledge',
        where: { slug: { equals: patch.slug } },
        limit: 1,
        depth: 0,
        overrideAccess: false,
        user,
      })

      const doc = found.docs[0]
      if (!doc) {
        missing.push(patch.slug)
        continue
      }

      for (const locale of LOCALES) {
        await payload.update({
          collection: 'practice-knowledge',
          id: doc.id,
          data: { content: patch.content as Record<string, unknown> },
          overrideAccess: false,
          user,
          locale,
        })
      }

      updated.push(patch.slug)
    } catch (err) {
      failed.push({
        slug: patch.slug,
        error: err instanceof Error ? err.message : 'Update failed',
      })
    }
  }

  return { updated, missing, failed, patchCount: patches.length }
}

export function patchesFromSessionTimeline(
  timeline: unknown,
  bodyPatches: unknown,
): PracticeKnowledgePatch[] {
  const server = buildPracticeKnowledgePatches(
    Array.isArray(timeline) ? timeline : [],
  )
  if (server.length > 0) return server

  if (!Array.isArray(bodyPatches)) return []

  return bodyPatches
    .filter(
      (p): p is PracticeKnowledgePatch =>
        typeof p === 'object' &&
        p !== null &&
        typeof (p as PracticeKnowledgePatch).slug === 'string' &&
        (p as PracticeKnowledgePatch).content != null,
    )
    .map((p) => ({
      slug: p.slug,
      content: p.content,
    }))
}
