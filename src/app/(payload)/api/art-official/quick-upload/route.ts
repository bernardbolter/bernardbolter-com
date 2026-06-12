import { z } from 'zod'

import {
  ACH_ROOT_SERIES_SLUG,
  DCS_ROOT_SERIES_SLUG,
} from '@/lib/artOfficial/catalogScope'
import { formatChatError } from '@/lib/artOfficial/formatChatError'
import { formatPayloadValidationError } from '@/lib/artOfficial/formatPayloadValidationError'
import {
  deriveAspectRatio,
  deriveOrientation,
  slugifyArtworkTitle,
} from '@/lib/artOfficial/quickUploadDerived'
import { ensureArtworkMediumEnumValue } from '@/lib/artOfficial/artworkMediumDatabase'
import { registerCustomMedium } from '@/lib/artOfficial/artworkMediumOptions'
import { requireStaff } from '@/lib/artOfficial/requireStaff'

const quickUploadSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
  yearCreated: z.number().int().min(1000).max(9999),
  yearCompleted: z.number().int().min(1000).max(9999).optional(),
  seriesId: z.number().int().positive(),
  medium: z.string().min(1),
  mediumOther: z.string().optional(),
  widthWhole: z.number().positive(),
  heightWhole: z.number().positive(),
  depthWhole: z.number().positive().optional(),
  dimensionUnit: z.enum(['cm', 'in']),
  orientation: z.enum(['landscape', 'portrait', 'square']),
  sizeTier: z.enum(['xs', 'sm', 'md', 'lg', 'xl']),
  availabilityStatus: z.enum([
    'not-for-sale',
    'available',
    'sold',
    'on-loan',
  ]),
  primaryImageMediaId: z.number().int().positive(),
  dcsStreetMediaId: z.number().int().positive().optional(),
  dcsSatelliteMediaId: z.number().int().positive().optional(),
  achSourceMediaIds: z.array(z.number().int().positive()).optional(),
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

  const parsed = quickUploadSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 })
  }

  const data = parsed.data
  if (data.medium === 'other' && !data.mediumOther?.trim()) {
    return Response.json(
      { error: 'Describe the medium when “Other” is selected.' },
      { status: 400 },
    )
  }

  const artists = await payload.find({
    collection: 'artists',
    limit: 1,
    depth: 0,
    overrideAccess: false,
    user,
  })
  const artist = artists.docs[0]
  if (!artist) {
    return Response.json(
      { error: 'Create the Artist record before quick upload.' },
      { status: 412 },
    )
  }

  const series = await payload.findByID({
    collection: 'series',
    id: data.seriesId,
    depth: 0,
    overrideAccess: false,
    user,
  })

  const seriesSlug = typeof series.slug === 'string' ? series.slug : null
  const slug = data.slug?.trim() || slugifyArtworkTitle(data.title)
  const aspectRatio = deriveAspectRatio(
    data.widthWhole,
    data.heightWhole,
    data.dimensionUnit,
  )

  let medium = data.medium
  if (medium === 'other' && data.mediumOther?.trim()) {
    const registered = await registerCustomMedium(payload, data.mediumOther.trim())
    medium = registered.value
  } else if (medium && medium !== 'other') {
    await ensureArtworkMediumEnumValue(payload, medium)
  }

  const artworkData: Record<string, unknown> = {
    title: data.title.trim(),
    slug,
    creator: artist.id,
    series: data.seriesId,
    seriesSlug,
    yearCreated: data.yearCreated,
    yearCompleted: data.yearCompleted ?? undefined,
    medium,
    measurementType: ['physical'],
    dimensionUnit: data.dimensionUnit,
    widthWhole: data.widthWhole,
    heightWhole: data.heightWhole,
    depthWhole: data.depthWhole,
    orientation: data.orientation,
    sizeTier: data.sizeTier,
    aspectRatio: aspectRatio ?? undefined,
    availabilityStatus: data.availabilityStatus,
    primaryImage: data.primaryImageMediaId,
    status: 'published',
    reasoningStatus: 'stub',
    recordOrigin: 'artist-catalogued',
  }

  if (seriesSlug === DCS_ROOT_SERIES_SLUG) {
    const composition: Record<string, unknown> = {}
    if (data.dcsStreetMediaId) {
      composition.streetPhotoImage = data.dcsStreetMediaId
    }
    if (data.dcsSatelliteMediaId) {
      composition.satelliteViewImage = data.dcsSatelliteMediaId
    }
    if (Object.keys(composition).length) {
      artworkData.dcs = { composition }
    }
  }

  if (seriesSlug === ACH_ROOT_SERIES_SLUG && data.achSourceMediaIds?.length) {
    const rows = data.achSourceMediaIds.map((mediaId) => ({ sourceImage: mediaId }))
    artworkData.ach = {
      sourcePhotographs: rows,
      sourcePhotograph: { sourceImage: data.achSourceMediaIds[0] },
    }
  }

  try {
    const created = await payload.create({
      collection: 'artworks',
      data: artworkData as never,
      overrideAccess: false,
      user,
      locale: 'en',
    })

    const adminRoute = payload.config.routes.admin

    return Response.json({
      id: created.id,
      slug: created.slug,
      title: created.title,
      adminUrl: `${adminRoute}/collections/artworks/${created.id}`,
    })
  } catch (err) {
    const message =
      formatPayloadValidationError(err) ??
      (err instanceof Error ? err.message : formatChatError(err))
    console.error('[art-official/quick-upload]', err)
    return Response.json({ error: message }, { status: 412 })
  }
}
