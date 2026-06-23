import type { Payload } from 'payload'

import type { User } from '@/payload-types'

import { lexicalToPlain } from './lexicalToPlain'
import { buildArtworkMediaAgentBlock } from './artworkMediaPrompt'
import { buildArtworkUploadAgentBlock } from './artworkUploadCopy'
import {
  buildAchSessionBlock,
  buildDcsSessionBlock,
  buildMegacitiesSessionBlock,
  buildEpisodeAssemblyBlock,
  buildEpisodeStoryboardBlock,
  buildFieldRoadmap,
  buildIdentityAndRole,
  buildLegacyLookupBlock,
  buildPreUploadSessionBlock,
  buildReflectiveWeaveBlock,
  buildDialoguePhaseBlock,
  buildSequencingBlock,
  buildSessionCloseBlock,
  buildTagClassificationBlock,
  buildTimeBasedWorkBlock,
  buildTriptychSessionBlock,
  DIALOGUE_RULES,
  refinementPreamble,
  sessionTypeOverride,
} from './promptBlocks'
import { buildPreUploadStateBlock, type PreUploadSessionState } from './preUploadGuide'
import type { SystemPromptParts } from './promptCache'
import type { SessionPhase } from './sessionPhase'
import type { SessionType } from './routing'
import { buildSeriesSlugPromptBlock, listSeriesWithParents, isSlugDescendantOf } from './seriesSlugs'
import { buildArtworkRefinementBlock } from './artworkRefinement'
import { buildEventRefinementBlock } from './buildEventRefinementBlock'
import { assembleEventPhaseAPrompt } from './assembleEventPhaseAPrompt'
import {
  buildEventPhaseADialogueRules,
  buildEventSessionTypeOverride,
} from './eventSessionPrompt'
import {
  assembleEventPhaseBPrompt,
  buildEventSessionCloseBlock,
  buildEventTagWrapUpBlock,
  summarizeRelatedEventsForPrompt,
} from './assembleEventPhaseBPrompt'
import { queryRelatedCompleteEvents } from './queryRelatedCompleteEvents'
import { resolveToolsForSession } from './agentTools'
import type { EventDialoguePhase } from './eventDialoguePhase'
import { normalizeEventDialoguePhase } from './eventDialoguePhase'

export type BuildSystemPromptArgs = {
  payload: Payload
  user: User
  sessionType: SessionType
  artistId: number
  episodeId?: number
  artworkRecordId?: number
  eventRecordId?: number
  weakPhases?: string[] | null
  isRefinement?: boolean
  preUpload?: PreUploadSessionState
  currentPhase?: SessionPhase
  eventDialoguePhase?: EventDialoguePhase
}

const SITE_URL = 'https://bernardbolter.com'

export async function buildSystemPromptParts(
  args: BuildSystemPromptArgs,
): Promise<SystemPromptParts> {
  const { payload, user, sessionType, artistId, episodeId, artworkRecordId, weakPhases, isRefinement, preUpload, currentPhase } =
    args

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

  const cachedPrefixParts = [
    buildIdentityAndRole(artistName, siteUrl, nameLegal),
    knowledgeBlocks || '(Practice knowledge sections are empty — rely on the conversation.)',
  ]

  if (sessionType !== 'event-enrichment') {
    cachedPrefixParts.push(DIALOGUE_RULES, buildFieldRoadmap(careerStage))
  }

  if (sessionType === 'artwork-cataloguing') {
    const seriesRecords = await listSeriesWithParents({ payload, user })
    cachedPrefixParts.push(buildSeriesSlugPromptBlock(seriesRecords))
    cachedPrefixParts.push(
      buildPreUploadSessionBlock(),
      buildArtworkUploadAgentBlock(),
      buildArtworkMediaAgentBlock(),
      buildLegacyLookupBlock(),
      buildTagClassificationBlock(),
      buildTimeBasedWorkBlock(),
      buildReflectiveWeaveBlock(),
      buildAchSessionBlock(),
      buildDcsSessionBlock(),
      buildMegacitiesSessionBlock(),
      buildSessionCloseBlock(),
    )
  }
  if (sessionType === 'triptych-cataloguing') {
    cachedPrefixParts.push(buildTriptychSessionBlock())
  }
  if (sessionType === 'sequencing') {
    cachedPrefixParts.push(buildSequencingBlock())
  }
  if (sessionType === 'event-enrichment') {
    const eventPhase = normalizeEventDialoguePhase(args.eventDialoguePhase)
    if (eventPhase === 'phase-a-research') {
      cachedPrefixParts.push(
        assembleEventPhaseAPrompt(),
        buildEventPhaseADialogueRules(),
        buildSessionCloseBlock(),
      )
    }
  }

  const cachedPrefix = cachedPrefixParts.join('\n\n---\n\n')

  const eventPhase = normalizeEventDialoguePhase(args.eventDialoguePhase)
  const dynamicParts =
    sessionType === 'event-enrichment'
      ? [buildEventSessionTypeOverride(eventPhase)]
      : [sessionTypeOverride(sessionType)]

  if (sessionType === 'event-enrichment') {
    const activeTools = resolveToolsForSession(sessionType, eventPhase).map((tool) => tool.name)
    dynamicParts.push(
      `ACTIVE TOOLS THIS SESSION (only these are callable):\n${activeTools.map((name) => `- ${name}`).join('\n')}`,
    )
  }
  if (sessionType === 'artwork-cataloguing') {
    if (artworkRecordId) {
      // Refinement mode: inject existing artwork context instead of pre-upload state
      const refinementBlock = await buildArtworkRefinementBlock({ payload, user, artworkId: artworkRecordId })
      dynamicParts.push(refinementBlock)

      // If the linked artwork is in an ACH sub-series, tell the agent explicitly so
      // it applies the full ACH workflow rather than skipping due to the series slug not
      // literally matching "a-colorful-history".
      try {
        const artwork = await payload.findByID({
          collection: 'artworks',
          id: artworkRecordId,
          depth: 1,
          overrideAccess: false,
          user,
          select: { series: true },
        })
        const seriesSlug =
          artwork.series && typeof artwork.series === 'object' && 'slug' in artwork.series
            ? (artwork.series as { slug: string }).slug
            : typeof artwork.series === 'string'
              ? artwork.series
              : null
        if (seriesSlug) {
          const seriesRecords = await listSeriesWithParents({ payload, user })
          if (
            seriesSlug !== 'a-colorful-history' &&
            isSlugDescendantOf(seriesRecords, seriesSlug, 'a-colorful-history')
          ) {
            dynamicParts.push(
              `SERIES HIERARCHY NOTE\n\nThis artwork's series "${seriesSlug}" is a sub-series of A Colorful History. Apply the full ACH workflow (all ach.* fields) exactly as you would for a-colorful-history artworks — the series gate in the ACH block applies to this work.`,
            )
          }
        }
      } catch {
        // Non-fatal — continue without the note
      }
    } else {
      const phase = currentPhase ?? 'pre-upload'
      const phaseBlock = buildDialoguePhaseBlock(phase, preUpload)
      if (phaseBlock) {
        dynamicParts.push(phaseBlock)
      } else {
        const stateBlock = preUpload ? buildPreUploadStateBlock(preUpload) : null
        if (stateBlock) dynamicParts.push(stateBlock)
      }
    }
  }
  if (sessionType === 'event-enrichment' && args.eventRecordId) {
    const refinementBlock = await buildEventRefinementBlock({
      payload,
      user,
      eventId: args.eventRecordId,
    })
    dynamicParts.push(refinementBlock)

    const eventPhase = normalizeEventDialoguePhase(args.eventDialoguePhase)
    if (eventPhase === 'phase-b-reasoning') {
      const related = await queryRelatedCompleteEvents({
        payload,
        user,
        eventId: args.eventRecordId,
      })
      dynamicParts.push(
        assembleEventPhaseBPrompt(summarizeRelatedEventsForPrompt(related)),
        buildEventTagWrapUpBlock(),
        buildEventSessionCloseBlock(),
      )
    }
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
