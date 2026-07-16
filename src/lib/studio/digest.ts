import type { Payload } from 'payload'

import type { User } from '@/payload-types'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export async function buildStudioDigest(payload: Payload, user: User) {
  const now = Date.now()
  const weekAgo = new Date(now - WEEK_MS).toISOString()
  const thirtyDaysAgo = new Date(now - 30 * WEEK_MS).toISOString()

  const [
    artworks,
    untaggedNotes,
    episodes,
    openSessions,
    activeLines,
    dormantLines,
    latestPatternReport,
    recentNotes,
    museumNotes,
    calendarLookahead,
    segments,
  ] = await Promise.all([
    payload.find({
      collection: 'artworks',
      where: { status: { equals: 'draft' } },
      sort: '-updatedAt',
      limit: 10,
      depth: 0,
      overrideAccess: false,
      user,
      select: { title: true, updatedAt: true },
    }),
    payload.find({
      collection: 'field-notes',
      where: {
        and: [{ relatedArtwork: { exists: false } }, { relatedEpisode: { exists: false } }],
      },
      limit: 1,
      depth: 0,
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: 'episodes',
      where: { status: { not_equals: 'posted' } },
      sort: '-updatedAt',
      limit: 20,
      depth: 0,
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: 'sessions',
      where: { status: { equals: 'in-progress' } },
      sort: '-updatedAt',
      limit: 10,
      depth: 0,
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: 'lines',
      where: { status: { equals: 'active' } },
      sort: 'name',
      limit: 20,
      depth: 0,
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: 'lines',
      where: { status: { equals: 'dormant' } },
      sort: 'name',
      limit: 10,
      depth: 0,
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: 'pattern-reports',
      sort: '-weekStart',
      limit: 1,
      depth: 0,
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: 'field-notes',
      where: { updatedAt: { greater_than_equal: weekAgo } },
      limit: 200,
      depth: 0,
      overrideAccess: false,
      user,
      select: { register: true, processStage: true, conceptualThread: true, updatedAt: true },
    }),
    payload.find({
      collection: 'field-notes',
      where: { museumSourced: { equals: true } },
      limit: 1,
      depth: 0,
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: 'calendar-days',
      where: {
        and: [
          { date: { greater_than_equal: new Date().toISOString().slice(0, 10) } },
          { date: { less_than_equal: new Date(now + WEEK_MS).toISOString().slice(0, 10) } },
        ],
      },
      limit: 14,
      depth: 1,
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: 'segments',
      sort: 'order',
      limit: 100,
      depth: 0,
      overrideAccess: false,
      user,
    }),
  ])

  const candidateNotes = await payload.find({
    collection: 'field-notes',
    limit: 50,
    depth: 0,
    overrideAccess: false,
    user,
    select: { id: true, suggestedLines: true, writtenNote: true, mediaType: true },
  })
  const lineSuggestions = candidateNotes.docs.filter(
    (note) => Array.isArray(note.suggestedLines) && note.suggestedLines.length > 0,
  )

  const registerCounts = countBy(
    recentNotes.docs.map((n) => n.register).filter(Boolean) as string[],
  )
  const stageCounts = countBy(
    recentNotes.docs.map((n) => n.processStage).filter(Boolean) as string[],
  )
  const threadCounts = countBy(
    recentNotes.docs.map((n) => n.conceptualThread).filter(Boolean) as string[],
  )

  const episodeBuckets = countBy(episodes.docs.map((e) => e.status))

  const emptyCalendarDays = calendarLookahead.docs.filter(
    (day) => !day.queueItems || (Array.isArray(day.queueItems) && day.queueItems.length === 0),
  )

  const segmentCoverage = countBy(
    segments.docs.map((s) => s.coverageStatus ?? 'no-footage'),
  )

  return {
    openPaintings: artworks.docs,
    untaggedFieldNotesCount: untaggedNotes.totalDocs,
    museumFieldNotesCount: museumNotes.totalDocs,
    episodeBuckets,
    openSessions: openSessions.docs,
    activeLines: activeLines.docs,
    dormantLines: dormantLines.docs,
    lineSuggestions,
    latestPatternReport: latestPatternReport.docs[0] ?? null,
    calendarGaps: emptyCalendarDays.map((d) => ({
      id: d.id,
      date: d.date,
    })),
    segmentCoverage,
    practiceOverview: {
      registerCounts,
      processStageCounts: stageCounts,
      conceptualThreadCounts: threadCounts,
      notesThisWeek: recentNotes.totalDocs,
      dormantSince: thirtyDaysAgo,
    },
  }
}

export function countBy(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1
    return acc
  }, {})
}

export function episodeBucketLabel(status: string): string {
  return status.replace(/-/g, ' ')
}
