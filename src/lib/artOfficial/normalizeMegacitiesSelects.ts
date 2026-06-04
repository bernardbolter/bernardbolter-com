import { normalizeSelectValue } from './normalizeArtworkSelects'

const MEGACITIES_SERIES_TYPE = [
  'composite_country',
  'skate_city',
  'cultural_composite',
  'exhibition_origin',
] as const

const MEGACITIES_SERIES_STATUS = ['full_series', 'exhibition_artifact', 'undecided'] as const

const MEGACITIES_COMPLETION_STATUS = [
  'completed_full_size',
  'small_scale_done',
  'in_progress',
] as const

const MEGACITIES_CITY_SELECTION = [
  'largest_by_population',
  'capital_cities',
  'cultural_centres',
  'political_body_members',
  'geographic_anchors',
  'mixed',
] as const

const MEGACITIES_OVERLAY_TYPE = ['city_boundary', 'spot_zoom'] as const

const MEGACITIES_VIDEO_FRAMING = [
  'rap_per_city',
  'skate_per_spot',
  'street_level_contrast',
  'audio_only',
  'mixed',
] as const

const MEGACITIES_LOCATION_VIDEO_TYPE = ['rap', 'skate', 'documentary', 'none'] as const

const MEGACITIES_SPOT_TYPE = [
  'bowl',
  'street_plaza',
  'skate_park',
  'diy',
  'mega_ramp',
  'pool',
  'transition',
  'ledges',
  'other',
] as const

const SERIES_STATUS_ALIASES: Record<string, string> = {
  'main-series': 'full_series',
  main_series: 'full_series',
  'main series': 'full_series',
  'full series entry': 'full_series',
  'confirmed main-series entry': 'full_series',
  'exhibition artifact': 'exhibition_artifact',
  'exhibition-artifact': 'exhibition_artifact',
}

const COMPLETION_STATUS_ALIASES: Record<string, string> = {
  'full-size-complete': 'completed_full_size',
  full_size_complete: 'completed_full_size',
  'full size complete': 'completed_full_size',
  'completed full size': 'completed_full_size',
  'small-scale-done': 'small_scale_done',
  small_scale_done: 'small_scale_done',
  'small scale done': 'small_scale_done',
  'in progress': 'in_progress',
}

const CITY_SELECTION_ALIASES: Record<string, string> = {
  'largest cities by population': 'largest_by_population',
  'largest cities by population ranking': 'largest_by_population',
  'largest by population ranking': 'largest_by_population',
  'largest by population': 'largest_by_population',
  'capital cities': 'capital_cities',
  'cultural centres': 'cultural_centres',
  'cultural centers': 'cultural_centres',
  'political body members': 'political_body_members',
  'geographic anchors': 'geographic_anchors',
}

function resolveWithAliases(
  value: unknown,
  allowed: readonly string[],
  labelMap: Record<string, string>,
  aliases: Record<string, string>,
): string | undefined {
  if (typeof value !== 'string') return undefined
  const raw = value.trim()
  if (!raw) return undefined
  const key = raw.toLowerCase()
  if (aliases[key]) return aliases[key]
  if (aliases[raw]) return aliases[raw]
  return normalizeSelectValue(raw, allowed, labelMap)
}

function normalizeSeriesGroup(series: Record<string, unknown>): void {
  const type = resolveWithAliases(
    series.seriesType,
    MEGACITIES_SERIES_TYPE,
    {
      'composite country': 'composite_country',
      'skate city': 'skate_city',
      'cultural composite': 'cultural_composite',
      'exhibition origin': 'exhibition_origin',
    },
    {},
  )
  if (type) series.seriesType = type
  else if (series.seriesType != null && series.seriesType !== '') delete series.seriesType

  const status = resolveWithAliases(
    series.seriesStatus,
    MEGACITIES_SERIES_STATUS,
    {
      'full series': 'full_series',
      'exhibition artifact': 'exhibition_artifact',
      undecided: 'undecided',
    },
    SERIES_STATUS_ALIASES,
  )
  if (status) series.seriesStatus = status
  else if (series.seriesStatus != null && series.seriesStatus !== '') delete series.seriesStatus

  const completion = resolveWithAliases(
    series.completionStatus,
    MEGACITIES_COMPLETION_STATUS,
    {
      'completed full size': 'completed_full_size',
      'small scale done': 'small_scale_done',
      'in progress': 'in_progress',
    },
    COMPLETION_STATUS_ALIASES,
  )
  if (completion) series.completionStatus = completion
  else if (series.completionStatus != null && series.completionStatus !== '') {
    delete series.completionStatus
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/** Drop empty { x, y } groups so Postgres is not asked for NOT NULL x/y on partial rows. */
function stripEmptyPointGroup(row: Record<string, unknown>, key: string): void {
  const group = row[key]
  if (group == null) return
  if (typeof group !== 'object' || Array.isArray(group)) {
    delete row[key]
    return
  }
  const o = group as { x?: unknown; y?: unknown }
  if (!isFiniteNumber(o.x) || !isFiniteNumber(o.y)) {
    delete row[key]
  }
}

function stripEmptyBoundaryPolygon(row: Record<string, unknown>): void {
  const poly = row.boundaryPolygon
  if (!Array.isArray(poly)) return
  const kept = poly.filter((pt) => {
    if (!pt || typeof pt !== 'object' || Array.isArray(pt)) return false
    const p = pt as { x?: unknown; y?: unknown }
    return isFiniteNumber(p.x) && isFiniteNumber(p.y)
  })
  if (kept.length > 0) row.boundaryPolygon = kept
  else delete row.boundaryPolygon
}

function normalizeLocationRow(row: Record<string, unknown>): void {
  stripEmptyPointGroup(row, 'positionInCollage')
  stripEmptyPointGroup(row, 'actualGeoPosition')
  stripEmptyBoundaryPolygon(row)

  const spotType = normalizeSelectValue(row.spotType, MEGACITIES_SPOT_TYPE, {
    'street plaza': 'street_plaza',
    'skate park': 'skate_park',
    'mega ramp': 'mega_ramp',
  })
  if (spotType) row.spotType = spotType
  else if (row.spotType != null && row.spotType !== '') delete row.spotType

  const videoType = normalizeSelectValue(row.videoType, MEGACITIES_LOCATION_VIDEO_TYPE, {})
  if (videoType) row.videoType = videoType
  else if (row.videoType != null && row.videoType !== '') delete row.videoType
}

function normalizeCompositionGroup(composition: Record<string, unknown>): void {
  const criteria = resolveWithAliases(
    composition.citySelectionCriteria,
    MEGACITIES_CITY_SELECTION,
    {
      'largest by population': 'largest_by_population',
      'capital cities': 'capital_cities',
      'cultural centres': 'cultural_centres',
      'political body members': 'political_body_members',
      'geographic anchors': 'geographic_anchors',
      mixed: 'mixed',
    },
    CITY_SELECTION_ALIASES,
  )
  if (criteria) composition.citySelectionCriteria = criteria
  else if (
    composition.citySelectionCriteria != null &&
    composition.citySelectionCriteria !== ''
  ) {
    delete composition.citySelectionCriteria
  }

  if (Array.isArray(composition.locations)) {
    composition.locations = composition.locations.map((row) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) return row
      const next = { ...(row as Record<string, unknown>) }
      normalizeLocationRow(next)
      return next
    })
  }
}

function normalizeWaterwayGroup(waterway: Record<string, unknown>): void {
  if (Array.isArray(waterway.thread)) {
    const kept = waterway.thread.filter((pt) => {
      if (!pt || typeof pt !== 'object' || Array.isArray(pt)) return false
      const p = pt as { x?: unknown; y?: unknown }
      return isFiniteNumber(p.x) && isFiniteNumber(p.y)
    })
    if (kept.length > 0) waterway.thread = kept
    else delete waterway.thread
  }

  if (Array.isArray(waterway.junctions)) {
    waterway.junctions = waterway.junctions
      .filter((j) => {
        if (!j || typeof j !== 'object' || Array.isArray(j)) return false
        const row = j as { name?: unknown; x?: unknown; y?: unknown }
        return Boolean(String(row.name ?? '').trim()) && isFiniteNumber(row.x) && isFiniteNumber(row.y)
      })
      .map((j) => ({ ...(j as Record<string, unknown>) }))
  }
}

function normalizeInteractionGroup(interaction: Record<string, unknown>): void {
  const overlay = interaction.overlaySystem
  if (overlay && typeof overlay === 'object' && !Array.isArray(overlay)) {
    const o = overlay as Record<string, unknown>
    const type = normalizeSelectValue(o.type, MEGACITIES_OVERLAY_TYPE, {
      'city boundary': 'city_boundary',
      'spot zoom': 'spot_zoom',
    })
    if (type) o.type = type
    else if (o.type != null && o.type !== '') delete o.type
  }
}

function normalizeVideoGroup(video: Record<string, unknown>): void {
  const framing = normalizeSelectValue(video.videoFraming, MEGACITIES_VIDEO_FRAMING, {
    'rap per city': 'rap_per_city',
    'skate per spot': 'skate_per_spot',
    'street level contrast': 'street_level_contrast',
    'audio only': 'audio_only',
  })
  if (framing) video.videoFraming = framing
  else if (video.videoFraming != null && video.videoFraming !== '') delete video.videoFraming
}

/** Map agent-staged Megacities labels to Payload select values; drop invalid optionals. */
export function normalizeMegacitiesSelectFields(
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const meg = patch.megacities
  if (!meg || typeof meg !== 'object' || Array.isArray(meg)) return patch

  const megacities = { ...(meg as Record<string, unknown>) }

  const series = megacities.series
  if (series && typeof series === 'object' && !Array.isArray(series)) {
    const next = { ...(series as Record<string, unknown>) }
    normalizeSeriesGroup(next)
    megacities.series = next
  }

  const composition = megacities.composition
  if (composition && typeof composition === 'object' && !Array.isArray(composition)) {
    const next = { ...(composition as Record<string, unknown>) }
    normalizeCompositionGroup(next)
    megacities.composition = next
  }

  const waterway = megacities.waterway
  if (waterway && typeof waterway === 'object' && !Array.isArray(waterway)) {
    const next = { ...(waterway as Record<string, unknown>) }
    normalizeWaterwayGroup(next)
    megacities.waterway = next
  }

  const interaction = megacities.interaction
  if (interaction && typeof interaction === 'object' && !Array.isArray(interaction)) {
    const next = { ...(interaction as Record<string, unknown>) }
    normalizeInteractionGroup(next)
    megacities.interaction = next
  }

  const video = megacities.video
  if (video && typeof video === 'object' && !Array.isArray(video)) {
    const next = { ...(video as Record<string, unknown>) }
    normalizeVideoGroup(next)
    megacities.video = next
  }

  return { ...patch, megacities }
}
