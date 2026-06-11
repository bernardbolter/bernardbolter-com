import { z } from 'zod'

import { formatChatError } from '@/lib/artOfficial/formatChatError'
import { formatPayloadValidationError } from '@/lib/artOfficial/formatPayloadValidationError'
import { buildEventSlug } from '@/lib/artOfficial/eventSlug'
import { EVENT_TYPE_OPTIONS } from '@/lib/artOfficial/eventTypeOptions'
import { requireStaff } from '@/lib/artOfficial/requireStaff'

const eventTypes = EVENT_TYPE_OPTIONS.map((o) => o.value) as [string, ...string[]]

const quickEventSchema = z.object({
  eventType: z.enum(eventTypes),
  title: z.string().min(1),
  yearStart: z.number().int().min(1000).max(9999),
  venueName: z.string().optional(),
  venueCity: z.string().optional(),
  venueCountry: z.string().optional(),
  eventTypeCustom: z.string().optional(),
  awardGrantingOrganisation: z.string().optional(),
  awardOutcome: z
    .enum(['winner', 'shortlisted', 'nominated', 'honourable-mention'])
    .optional(),
  residencyOrganisation: z.string().optional(),
  publicationTitle: z.string().optional(),
  publicationAuthor: z.string().optional(),
  bibliographyAuthor: z.string().optional(),
  eventFormatType: z.string().optional(),
  premiereStatus: z.enum(['world', 'european', 'national', 'none']).optional(),
  performanceType: z
    .enum(['live', 'durational', 'participatory', 'lecture-performance', 'sound', 'other'])
    .optional(),
  institution: z.string().optional(),
  degree: z.string().optional(),
  subject: z.string().optional(),
  commissionClient: z.string().optional(),
  commissionSite: z.string().optional(),
})

export async function POST(request: Request) {
  const { ok, payload, user } = await requireStaff()
  if (!ok || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = quickEventSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 })
  }

  const data = parsed.data
  const type = data.eventType

  if (type === 'award') {
    if (!data.awardGrantingOrganisation?.trim()) {
      return Response.json({ error: 'Award granting organisation is required.' }, { status: 400 })
    }
    if (!data.awardOutcome) {
      return Response.json({ error: 'Award outcome is required.' }, { status: 400 })
    }
  }
  if (type === 'residency' && !data.residencyOrganisation?.trim()) {
    return Response.json({ error: 'Residency organisation is required.' }, { status: 400 })
  }
  if (type === 'publication' && !data.publicationTitle?.trim()) {
    return Response.json({ error: 'Publication title is required.' }, { status: 400 })
  }
  if (type === 'bibliography') {
    if (!data.bibliographyAuthor?.trim()) {
      return Response.json({ error: 'Bibliography author is required.' }, { status: 400 })
    }
    if (!data.publicationTitle?.trim()) {
      return Response.json({ error: 'Publication title is required.' }, { status: 400 })
    }
  }
  if (type === 'talk-panel' && !data.eventFormatType?.trim()) {
    return Response.json({ error: 'Event format type is required for talks.' }, { status: 400 })
  }
  if (type === 'screening' && !data.premiereStatus) {
    return Response.json({ error: 'Premiere status is required for screenings.' }, { status: 400 })
  }
  if (type === 'performance' && !data.performanceType) {
    return Response.json({ error: 'Performance type is required.' }, { status: 400 })
  }
  if (type === 'education') {
    if (!data.institution?.trim()) {
      return Response.json({ error: 'Institution is required for education.' }, { status: 400 })
    }
    if (!data.degree?.trim()) {
      return Response.json({ error: 'Degree is required for education.' }, { status: 400 })
    }
    if (!data.subject?.trim()) {
      return Response.json({ error: 'Subject is required for education.' }, { status: 400 })
    }
  }
  if (type === 'public-commission') {
    if (!data.commissionClient?.trim()) {
      return Response.json({ error: 'Commission client is required.' }, { status: 400 })
    }
    if (!data.commissionSite?.trim()) {
      return Response.json({ error: 'Commission site is required.' }, { status: 400 })
    }
  }
  if (type === 'other' && !data.eventTypeCustom?.trim()) {
    return Response.json({ error: 'Custom type label is required.' }, { status: 400 })
  }

  const startDate = `${data.yearStart}-01-01`
  const slug = buildEventSlug(data.title.trim(), data.yearStart)

  const eventData: Record<string, unknown> = {
    title: data.title.trim(),
    slug,
    eventType: type,
    startDate,
    yearStart: data.yearStart,
    status: 'published',
    enrichmentStatus: 'stub',
    hasPage: false,
    venueName: data.venueName?.trim() || undefined,
    venueCity: data.venueCity?.trim() || undefined,
    venueCountry: data.venueCountry?.trim() || undefined,
    eventTypeCustom: data.eventTypeCustom?.trim() || undefined,
    awardGrantingOrganisation: data.awardGrantingOrganisation?.trim() || undefined,
    awardOutcome: data.awardOutcome,
    residencyOrganisation: data.residencyOrganisation?.trim() || undefined,
    publicationTitle: data.publicationTitle?.trim() || undefined,
    publicationAuthor: data.publicationAuthor?.trim() || undefined,
    bibliographyAuthor: data.bibliographyAuthor?.trim() || undefined,
    eventFormatType: data.eventFormatType?.trim() || undefined,
    premiereStatus: data.premiereStatus,
    performanceType: data.performanceType,
    institution: data.institution?.trim() || undefined,
    degree: data.degree?.trim() || undefined,
    subject: data.subject?.trim() || undefined,
    commissionClient: data.commissionClient?.trim() || undefined,
    commissionSite: data.commissionSite?.trim() || undefined,
  }

  try {
    const created = await payload.create({
      collection: 'events',
      data: eventData as never,
      overrideAccess: false,
      user,
      locale: 'en',
      context: { skipEventEnrichmentSync: true },
    })

    const adminRoute = payload.config.routes.admin

    return Response.json({
      id: created.id,
      slug: created.slug,
      title: created.title,
      adminUrl: `${adminRoute}/collections/events/${created.id}`,
    })
  } catch (err) {
    const message =
      formatPayloadValidationError(err) ??
      (err instanceof Error ? err.message : formatChatError(err))
    console.error('[art-official/quick-event]', err)
    return Response.json({ error: message }, { status: 412 })
  }
}
