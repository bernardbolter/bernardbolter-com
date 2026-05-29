import type { Payload } from 'payload'

import type { User } from '@/payload-types'

import { lexicalToPlain } from './lexicalToPlain'
import { buildArtworkMediaAgentBlock } from './artworkMediaPrompt'
import { buildArtworkUploadAgentBlock } from './artworkUploadCopy'
import {
  buildAchSessionBlock,
  buildEpisodeAssemblyBlock,
  buildEpisodeStoryboardBlock,
  buildFieldRoadmap,
  buildIdentityAndRole,
  buildPreUploadSessionBlock,
  buildSessionCloseBlock,
  buildTriptychSessionBlock,
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
  episodeId?: number
  weakPhases?: string[] | null
  isRefinement?: boolean
}

const SITE_URL = 'https://bernardbolter.com'

export async function buildSystemPromptParts(
  args: BuildSystemPromptArgs,
): Promise<SystemPromptParts> {
  const { payload, user, sessionType, artistId, episodeId, weakPhases, isRefinement } = args

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
    dynamicParts.push(buildPreUploadSessionBlock())
    dynamicParts.push(buildArtworkUploadAgentBlock())
    dynamicParts.push(buildArtworkMediaAgentBlock())
    dynamicParts.push(buildAchSessionBlock())
    dynamicParts.push(buildSessionCloseBlock())
  }
  if (sessionType === 'triptych-cataloguing') {
    dynamicParts.push(buildTriptychSessionBlock())
  }
  if (sessionType === 'episode-storyboard' && episodeId) {
    const episode = await payload.findByID({
      collection: 'episodes',
      id: episodeId,
      depth: 0,
      overrideAccess: false,
      user,
    })
    dynamicParts.push(buildEpisodeStoryboardBlock(episode.title, episode.concept))
  }
  if (sessionType === 'episode-assembly' && episodeId) {
    const episode = await payload.findByID({
      collection: 'episodes',
      id: episodeId,
      depth: 0,
      overrideAccess: false,
      user,
    })
    const clips = await payload.find({
      collection: 'field-notes',
      where: { relatedEpisode: { equals: episodeId } },
      limit: 50,
      depth: 0,
      overrideAccess: false,
      user,
      select: {
        id: true,
        mediaType: true,
        duration: true,
        audioTranscript: true,
        writtenNote: true,
      },
    })
    const clipSummaries = clips.docs
      .map((clip) => {
        const transcript = clip.audioTranscript || clip.writtenNote || ''
        const excerpt = transcript.length > 200 ? `${transcript.slice(0, 200)}…` : transcript
        return `- #${clip.id} ${clip.mediaType}${clip.duration ? ` (${clip.duration}s)` : ''}: ${excerpt || '(no transcript)'}`
      })
      .join('\n')
    dynamicParts.push(buildEpisodeAssemblyBlock(episode.title, clipSummaries))
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
