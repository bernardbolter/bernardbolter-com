import { z } from 'zod'

import {
  ACH_ROOT_SERIES_SLUG,
  DCS_ROOT_SERIES_SLUG,
  GATES_OF_PERCEPTION_GROUP_TITLE,
  GATES_OF_PERCEPTION_SERIES_SLUG,
  isAchSeriesSlug,
  isMegacitiesSeriesSlug,
} from '@/lib/artOfficial/catalogScope'
import { formatChatError } from '@/lib/artOfficial/formatChatError'
import { formatPayloadValidationError } from '@/lib/artOfficial/formatPayloadValidationError'
import {
  isValidDimensionFraction,
  resolvePhysicalDimension,
} from '@/lib/artOfficial/physicalDimensions'
import { deriveAspectRatio, slugifyArtworkTitle } from '@/lib/artOfficial/quickUploadDerived'
import { ensureArtworkMediumEnumValue } from '@/lib/artOfficial/artworkMediumDatabase'
import { registerCustomMedium } from '@/lib/artOfficial/artworkMediumOptions'
import { plainToLexical } from '@/lib/artOfficial/plainToLexical'
import { requireStaff } from '@/lib/artOfficial/requireStaff'

const quickUploadSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
  yearCreated: z.number().int().min(1000).max(9999),
  yearCompleted: z.number().int().min(1000).max(9999).optional(),
  seriesId: z.number().int().positive(),
  medium: z.string().min(1),
  mediumOther: z.string().optional(),
  widthWhole: z.number().nonnegative(),
  heightWhole: z.number().nonnegative(),
  widthFraction: z.string().optional(),
  heightFraction: z.string().optional(),
  depthWhole: z.number().nonnegative().optional(),
  depthFraction: z.string().optional(),
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
  wpId: z.number().int().positive().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  streetPhotoCaption: z.string().optional(),
  cityPopulation: z.number().positive().optional(),
  cityAreaKm2: z.number().positive().optional(),
  cityPopulationDensity: z.number().positive().optional(),
  cityElevationM: z.number().optional(),
  dcsStreetMediaId: z.number().int().positive().optional(),
  dcsSatelliteMediaId: z.number().int().positive().optional(),
  achSourceMediaIds: z.array(z.number().int().positive()).optional(),
  locationCreatedLabel: z.string().optional(),
  achMapLat: z.number().optional(),
  achMapLng: z.number().optional(),
  achMapPresence: z.boolean().optional(),
  provenanceNotes: z.string().optional(),
  gatesOfPerception: z.boolean().optional(),
  megacitiesSeriesType: z
    .enum(['composite_country', 'skate_city', 'cultural_composite', 'exhibition_origin'])
    .optional(),
  megacitiesCoverageArea: z.string().optional(),
  megacitiesClassificationNote: z.string().optional(),
  megacitiesReferenceCollageMediaId: z.number().int().positive().optional(),
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

  let seriesSlug = typeof series.slug === 'string' ? series.slug : null
  let seriesId = data.seriesId

  if (data.gatesOfPerception && isAchSeriesSlug(seriesSlug)) {
    const gop = await payload.find({
      collection: 'series',
      where: { slug: { equals: GATES_OF_PERCEPTION_SERIES_SLUG } },
      limit: 1,
      depth: 0,
      overrideAccess: false,
      user,
    })
    const gopDoc = gop.docs[0]
    if (gopDoc) {
      seriesId = gopDoc.id
      seriesSlug = GATES_OF_PERCEPTION_SERIES_SLUG
    }
  }

  const slug = data.slug?.trim() || slugifyArtworkTitle(data.title)

  for (const [label, fraction] of [
    ['Width', data.widthFraction],
    ['Height', data.heightFraction],
    ['Depth', data.depthFraction],
  ] as const) {
    if (fraction && !isValidDimensionFraction(fraction)) {
      return Response.json(
        { error: `${label} fraction must look like 3/16.` },
        { status: 400 },
      )
    }
  }

  const widthQty = resolvePhysicalDimension(data.widthWhole, data.widthFraction)
  const heightQty = resolvePhysicalDimension(data.heightWhole, data.heightFraction)
  if (widthQty == null || widthQty <= 0 || heightQty == null || heightQty <= 0) {
    return Response.json(
      { error: 'Width and height must be greater than zero.' },
      { status: 400 },
    )
  }

  const aspectRatio = deriveAspectRatio({
    widthWhole: data.widthWhole,
    heightWhole: data.heightWhole,
    widthFraction: data.widthFraction,
    heightFraction: data.heightFraction,
    dimensionUnit: data.dimensionUnit,
  })

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
    series: seriesId,
    seriesSlug,
    yearCreated: data.yearCreated,
    yearCompleted: data.yearCompleted ?? undefined,
    medium,
    measurementType: ['physical'],
    dimensionUnit: data.dimensionUnit,
    widthWhole: data.widthWhole,
    widthFraction: data.widthFraction?.trim() || undefined,
    heightWhole: data.heightWhole,
    heightFraction: data.heightFraction?.trim() || undefined,
    depthWhole: data.depthWhole,
    depthFraction: data.depthFraction?.trim() || undefined,
    orientation: data.orientation,
    sizeTier: data.sizeTier,
    aspectRatio: aspectRatio ?? undefined,
    availabilityStatus: data.availabilityStatus,
    primaryImage: data.primaryImageMediaId,
    status: 'published',
    reasoningStatus: 'stub',
    recordOrigin: 'artist-catalogued',
    wp_id: data.wpId,
    city: data.city?.trim() || undefined,
    country: data.country?.trim() || undefined,
  }

  const locationLabel = data.locationCreatedLabel?.trim()
  if (locationLabel || data.achMapLat != null || data.achMapLng != null) {
    artworkData.locationCreated = {
      ...(locationLabel ? { label: locationLabel } : {}),
      ...(data.city?.trim() ? { city: data.city.trim() } : {}),
      ...(data.country?.trim() ? { country: data.country.trim() } : {}),
      ...(data.achMapLat != null ? { lat: data.achMapLat } : {}),
      ...(data.achMapLng != null ? { lng: data.achMapLng } : {}),
    }
  }

  if (data.provenanceNotes?.trim()) {
    artworkData.provenanceNotes = plainToLexical(data.provenanceNotes.trim())
  }

  if (seriesSlug === DCS_ROOT_SERIES_SLUG) {
    const composition: Record<string, unknown> = {}
    if (data.dcsStreetMediaId) {
      composition.streetPhotoImage = data.dcsStreetMediaId
    }
    if (data.dcsSatelliteMediaId) {
      composition.satelliteViewImage = data.dcsSatelliteMediaId
    }
    if (data.streetPhotoCaption?.trim()) {
      composition.streetPhotoCaption = data.streetPhotoCaption.trim()
    }

    const cityContext: Record<string, unknown> = {}
    if (data.cityPopulation != null) cityContext.cityPopulation = data.cityPopulation
    if (data.cityAreaKm2 != null) cityContext.cityAreaKm2 = data.cityAreaKm2
    if (data.cityPopulationDensity != null) {
      cityContext.cityPopulationDensity = data.cityPopulationDensity
    }
    if (data.cityElevationM != null) cityContext.cityElevationM = data.cityElevationM

    const dcs: Record<string, unknown> = {}
    if (Object.keys(composition).length) dcs.composition = composition
    if (Object.keys(cityContext).length) dcs.cityContext = cityContext
    if (Object.keys(dcs).length) artworkData.dcs = dcs
  }

  if (isAchSeriesSlug(seriesSlug)) {
    const ach: Record<string, unknown> = {}
    const mapAndTour: Record<string, unknown> = {}

    if (data.achMapPresence === true) {
      mapAndTour.mapPresence = true
    } else if (data.achMapLat != null && data.achMapLng != null) {
      mapAndTour.mapPresence = true
    }
    if (data.achMapLat != null) mapAndTour.lat = data.achMapLat
    if (data.achMapLng != null) mapAndTour.lng = data.achMapLng
    if (Object.keys(mapAndTour).length) ach.mapAndTour = mapAndTour

    if (data.achSourceMediaIds?.length) {
      const rows = data.achSourceMediaIds.map((mediaId) => ({ sourceImage: mediaId }))
      ach.sourcePhotographs = rows
      ach.sourcePhotograph = { sourceImage: data.achSourceMediaIds[0] }
    }

    if (data.gatesOfPerception) {
      ach.internalGroupTitle = GATES_OF_PERCEPTION_GROUP_TITLE
    }

    if (Object.keys(ach).length) artworkData.ach = ach
  }

  if (isMegacitiesSeriesSlug(seriesSlug)) {
    const megacities: Record<string, unknown> = {}
    const series: Record<string, unknown> = {}

    if (data.megacitiesSeriesType) {
      series.seriesType = data.megacitiesSeriesType
    }
    if (data.megacitiesClassificationNote?.trim()) {
      series.classificationNote = data.megacitiesClassificationNote.trim()
    }
    if (Object.keys(series).length) megacities.series = series

    const composition: Record<string, unknown> = {}
    if (data.megacitiesCoverageArea?.trim()) {
      composition.coverageArea = data.megacitiesCoverageArea.trim()
    }
    if (data.megacitiesReferenceCollageMediaId) {
      composition.referenceCollageImage = data.megacitiesReferenceCollageMediaId
    }
    if (Object.keys(composition).length) megacities.composition = composition

    if (Object.keys(megacities).length) artworkData.megacities = megacities
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
