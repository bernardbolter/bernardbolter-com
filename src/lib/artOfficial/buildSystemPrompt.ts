import type { Payload } from 'payload'

import type { User } from '@/payload-types'

import { lexicalToPlain } from './lexicalToPlain'
import {
  buildFieldRoadmap,
  buildIdentityAndRole,
  DIALOGUE_RULES,
  refinementPreamble,
  sessionTypeOverride,
} from './promptBlocks'
import type { SessionType } from './routing'

export type BuildSystemPromptArgs = {
  payload: Payload
  user: User
  sessionType: SessionType
  artistId: number
  weakPhases?: string[] | null
  isRefinement?: boolean
}

const SITE_URL = 'https://bernardbolter.com'

export async function buildSystemPrompt(args: BuildSystemPromptArgs): Promise<string> {
  const { payload, user, sessionType, artistId, weakPhases, isRefinement } = args

  const artist = await payload.findByID({
    collection: 'artists',
    id: artistId,
    depth: 0,
    overrideAccess: false,
    user,
    locale: 'en',
  })

  const artistName = artist.name ?? 'the artist'
  const siteUrl = artist.website?.trim() || SITE_URL
  const careerStage =
    (artist.careerStage as 'studio' | 'market' | 'institutional' | null | undefined) ??
    'studio'

  const knowledge = await payload.find({
    collection: 'practice-knowledge',
    where: { status: { equals: 'active' } },
    sort: 'order',
    limit: 20,
    depth: 0,
    overrideAccess: false,
    user,
    locale: 'en',
    select: {
      slug: true,
      sectionLabel: true,
      content: true,
      order: true,
    },
  })

  const knowledgeBlocks = knowledge.docs
    .map((doc) => {
      const plain = lexicalToPlain(doc.content)
      if (!plain) return null
      return `## ${doc.sectionLabel}\n\n${plain}`
    })
    .filter(Boolean)
    .join('\n\n---\n\n')

  const parts = [
    buildIdentityAndRole(artistName, siteUrl),
    knowledgeBlocks || '(Practice knowledge sections are empty — rely on the conversation.)',
    DIALOGUE_RULES,
    buildFieldRoadmap(careerStage),
    sessionTypeOverride(sessionType),
  ]

  if (isRefinement && weakPhases?.length) {
    parts.push(refinementPreamble(weakPhases))
  }

  return parts.join('\n\n---\n\n')
}
