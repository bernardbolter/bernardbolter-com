import type { PayloadRequest } from 'payload'
import type { Payload } from 'payload'

import type { SessionType } from './routing'

export type StartRecommendation = {
  sessionType: SessionType
  headline: string
  reason: string
}

export async function getStartRecommendation({
  payload,
  req,
  user,
}: {
  payload: Payload
  req: PayloadRequest
  user: NonNullable<PayloadRequest['user']>
}): Promise<StartRecommendation> {
  const { docs: completedOnboarding } = await payload.find({
    collection: 'sessions',
    where: {
      and: [
        { sessionType: { equals: 'onboarding' } },
        { status: { equals: 'completed' } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: false,
    user,
    req,
  })

  if (completedOnboarding.length === 0) {
    const { docs: inProgressOnboarding } = await payload.find({
      collection: 'sessions',
      where: {
        and: [
          { sessionType: { equals: 'onboarding' } },
          { status: { equals: 'in-progress' } },
        ],
      },
      limit: 1,
      depth: 0,
      overrideAccess: false,
      user,
      req,
    })

    if (inProgressOnboarding.length > 0) {
      return {
        sessionType: 'onboarding',
        headline: 'Resume your onboarding session',
        reason:
          'You already started onboarding. Open it from “In progress” below, or continue the conversation where you left off.',
      }
    }

    return {
      sessionType: 'onboarding',
      headline: 'Start with Onboarding (recommended for your first session)',
      reason:
        'Onboarding teaches Art/Official how you describe your practice—series, visual language, references, and vocabulary. That context makes every later artwork session sharper. It is a one-time setup; you can edit Practice Knowledge anytime afterward.',
    }
  }

  const { docs: completedArtwork } = await payload.find({
    collection: 'sessions',
    where: {
      and: [
        { sessionType: { equals: 'artwork-cataloguing' } },
        { status: { equals: 'completed' } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: false,
    user,
    req,
  })

  if (completedArtwork.length === 0) {
    return {
      sessionType: 'artwork-cataloguing',
      headline: 'Start with Artwork cataloguing',
      reason:
        'Your practice context is in place. Pick one work you want in the archive—ideally with a good photo ready—and work through a single piece from first impression to commit. Statement and biography sessions can come later.',
    }
  }

  return {
    sessionType: 'artwork-cataloguing',
    headline: 'Continue with Artwork cataloguing',
    reason:
      'You have completed onboarding and at least one artwork session. Add another work, or use Artist statement / Biography when you want to refresh those texts.',
  }
}
