import type { Payload } from 'payload'

import type { User } from '@/payload-types'

import { lexicalToPlain } from './lexicalToPlain'
import {
  buildAchSessionBlock,
  buildFieldRoadmap,
  buildIdentityAndRole,
  DIALOGUE_RULES,
  refinementPreamble,
  sessionTypeOverride,
} from './promptBlocks'
import type { SystemPromptParts } from './promptCache'
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

export async function buildSystemPromptParts(
  args: BuildSystemPromptArgs,
): Promise<SystemPromptParts> {
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
  const nameLegal = typeof artist.nameLegal === 'string' ? artist.nameLegal : null
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

  const cachedPrefix = [
    buildIdentityAndRole(artistName, siteUrl, nameLegal),
    knowledgeBlocks || '(Practice knowledge sections are empty — rely on the conversation.)',
    DIALOGUE_RULES,
    buildFieldRoadmap(careerStage),
  ].join('\n\n---\n\n')

  const dynamicParts = [sessionTypeOverride(sessionType)]
  if (sessionType === 'artwork-cataloguing') {
    dynamicParts.push(buildAchSessionBlock())
  }
  if (isRefinement && weakPhases?.length) {
    dynamicParts.push(refinementPreamble(weakPhases))
  }

  return {
    cachedPrefix,
    dynamicSuffix: dynamicParts.join('\n\n---\n\n'),
  }
}

export async function buildSystemPrompt(args: BuildSystemPromptArgs): Promise<string> {
  const { cachedPrefix, dynamicSuffix } = await buildSystemPromptParts(args)
  return [cachedPrefix, dynamicSuffix].filter(Boolean).join('\n\n---\n\n')
}
