/**
 * Single source of truth for Art/Official session coverage audit.
 * Field names must match top-level Artworks collection paths (or dotted group paths
 * when the dialogue stages nested ACH fields — those are tracked via timeline drift).
 */
export type RoadmapCategory =
  | 'automatic'
  | 'external-lookup'
  | 'early'
  | 'middle-practical'
  | 'middle-reflective'
  | 'late'
  | 'confirmation-generated'
  | 'series-specific'

export type CatalogLayer = 'artist' | 'agent' | 'automatic'
export type CatalogTier = 'studio' | 'market' | 'institutional'
export type CareerStage = CatalogTier
export type CatalogSeriesScope = 'ach' | 'dcs' | 'megacities'
export type CatalogMediumScope = 'physical'

export interface CatalogField {
  field: string
  category: RoadmapCategory
  layer: CatalogLayer
  tier: CatalogTier
  /** When set (or inferred from ach./dcs./megacities. prefix), only expected for matching series. */
  seriesScope?: CatalogSeriesScope
  /** When 'physical', dormant for digital / time-based works. */
  mediumScope?: CatalogMediumScope
}

export const ARTWORK_FIELD_CATALOG: CatalogField[] = [
  // ── automatic ─────────────────────────────────────────────
  { field: 'slug', category: 'automatic', layer: 'automatic', tier: 'studio' },
  { field: 'aspectRatio', category: 'automatic', layer: 'automatic', tier: 'studio' },
  { field: 'orientation', category: 'automatic', layer: 'automatic', tier: 'studio' },
  { field: 'primaryImageAltText', category: 'automatic', layer: 'agent', tier: 'studio' },
  { field: 'dominantColors', category: 'automatic', layer: 'automatic', tier: 'studio' },
  { field: 'paintedFieldColors', category: 'automatic', layer: 'automatic', tier: 'studio' },
  { field: 'compositionalNotes', category: 'automatic', layer: 'agent', tier: 'studio' },
  { field: 'clipEmbedding', category: 'automatic', layer: 'automatic', tier: 'studio' },
  { field: 'analysisModelVersion', category: 'automatic', layer: 'automatic', tier: 'studio' },

  // ── external-lookup (agent calls API, no artist conversation needed) ───
  { field: 'cityTgnUri', category: 'external-lookup', layer: 'agent', tier: 'studio' },
  { field: 'movementTags', category: 'external-lookup', layer: 'agent', tier: 'studio' },
  { field: 'styleTags', category: 'external-lookup', layer: 'agent', tier: 'studio' },
  { field: 'subjectTags', category: 'external-lookup', layer: 'agent', tier: 'studio' },
  { field: 'genreTags', category: 'external-lookup', layer: 'agent', tier: 'studio' },
  { field: 'periodTags', category: 'external-lookup', layer: 'agent', tier: 'studio' },

  // ── early ─────────────────────────────────────────────────
  { field: 'title', category: 'early', layer: 'artist', tier: 'studio' },
  { field: 'yearCreated', category: 'early', layer: 'artist', tier: 'studio' },
  { field: 'yearCompleted', category: 'early', layer: 'artist', tier: 'studio' },
  { field: 'series', category: 'early', layer: 'artist', tier: 'studio' },
  { field: 'city', category: 'early', layer: 'artist', tier: 'studio' },
  { field: 'country', category: 'early', layer: 'artist', tier: 'studio' },
  { field: 'medium', category: 'early', layer: 'artist', tier: 'studio' },
  {
    field: 'mediumOther',
    category: 'early',
    layer: 'artist',
    tier: 'studio',
  },
  { field: 'support', category: 'early', layer: 'artist', tier: 'studio' },
  { field: 'primaryImage', category: 'early', layer: 'artist', tier: 'studio' },

  // ── middle-practical ──────────────────────────────────────
  { field: 'widthWhole', category: 'middle-practical', layer: 'artist', tier: 'studio' },
  { field: 'heightWhole', category: 'middle-practical', layer: 'artist', tier: 'studio' },
  {
    field: 'sizeTier',
    category: 'middle-practical',
    layer: 'artist',
    tier: 'studio',
  },
  { field: 'depthWhole', category: 'middle-practical', layer: 'artist', tier: 'studio', mediumScope: 'physical' },
  { field: 'framing', category: 'middle-practical', layer: 'artist', tier: 'studio', mediumScope: 'physical' },
  { field: 'processNotes', category: 'middle-practical', layer: 'artist', tier: 'studio' },
  { field: 'materialAndProcessMeaning', category: 'middle-practical', layer: 'artist', tier: 'studio' },
  { field: 'sourceMaterials', category: 'middle-practical', layer: 'artist', tier: 'studio' },
  // artHistoricalReferences is a curated relationship — managed in admin, not agent-stageable
  { field: 'locationCreated', category: 'middle-practical', layer: 'artist', tier: 'studio' },
  { field: 'locationCreated.label', category: 'middle-practical', layer: 'artist', tier: 'studio' },
  { field: 'locationCreated.city', category: 'middle-practical', layer: 'artist', tier: 'studio' },
  { field: 'locationCreated.country', category: 'middle-practical', layer: 'artist', tier: 'studio' },
  { field: 'locationCreated.countryCode', category: 'middle-practical', layer: 'artist', tier: 'studio' },
  { field: 'locationCreated.lat', category: 'middle-practical', layer: 'artist', tier: 'studio' },
  { field: 'locationCreated.lng', category: 'middle-practical', layer: 'artist', tier: 'studio' },

  // ── middle-reflective ─────────────────────────────────────
  { field: 'intent', category: 'middle-reflective', layer: 'artist', tier: 'studio' },
  { field: 'makingNote', category: 'middle-reflective', layer: 'artist', tier: 'studio' },
  { field: 'directInspiration', category: 'middle-reflective', layer: 'artist', tier: 'studio' },
  { field: 'artHistoricalContext', category: 'middle-reflective', layer: 'artist', tier: 'studio' },
  { field: 'seriesContext', category: 'middle-reflective', layer: 'artist', tier: 'studio' },
  { field: 'workContext', category: 'middle-reflective', layer: 'artist', tier: 'studio' },
  { field: 'intentVsOutcome', category: 'middle-reflective', layer: 'artist', tier: 'studio' },
  {
    field: 'relatedWorksAtMaking',
    category: 'middle-reflective',
    layer: 'artist',
    tier: 'studio',
  },
  {
    field: 'seriesHingeMarker',
    category: 'middle-reflective',
    layer: 'artist',
    tier: 'studio',
  },

  // ── late ──────────────────────────────────────────────────
  { field: 'consciousRejections', category: 'late', layer: 'artist', tier: 'studio' },
  { field: 'encounterNote', category: 'late', layer: 'artist', tier: 'studio' },
  {
    field: 'formalContributionAssessment',
    category: 'late',
    layer: 'agent',
    tier: 'studio',
  },

  // ── session close (still studio tier) ─────────────────────
  { field: 'condition', category: 'middle-practical', layer: 'artist', tier: 'studio', mediumScope: 'physical' },
  { field: 'conditionNotes', category: 'middle-practical', layer: 'artist', tier: 'studio', mediumScope: 'physical' },
  { field: 'weight', category: 'middle-practical', layer: 'artist', tier: 'studio', mediumScope: 'physical' },
  { field: 'provenanceNotes', category: 'middle-practical', layer: 'artist', tier: 'studio' },
  { field: 'artworkHolder', category: 'middle-practical', layer: 'artist', tier: 'studio' },
  { field: 'artworkHolder.holderType', category: 'middle-practical', layer: 'artist', tier: 'studio' },
  { field: 'artworkHolder.holderName', category: 'middle-practical', layer: 'artist', tier: 'studio' },
  { field: 'artworkHolder.holderUrl', category: 'middle-practical', layer: 'artist', tier: 'studio' },
  { field: 'currentLocation', category: 'middle-practical', layer: 'artist', tier: 'studio' },
  { field: 'currentLocation.category', category: 'middle-practical', layer: 'artist', tier: 'studio' },
  { field: 'currentLocation.locationDetail', category: 'middle-practical', layer: 'artist', tier: 'studio' },
  { field: 'availabilityStatus', category: 'middle-practical', layer: 'artist', tier: 'studio' },

  // ── confirmation-generated ────────────────────────────────
  { field: 'descriptionShort', category: 'confirmation-generated', layer: 'agent', tier: 'studio' },
  { field: 'descriptionLong', category: 'confirmation-generated', layer: 'agent', tier: 'studio' },
  {
    field: 'conceptualKeywords',
    category: 'confirmation-generated',
    layer: 'agent',
    tier: 'studio',
  },

  // ── market tier (dormant at studio) ───────────────────────
  { field: 'salesRecord', category: 'middle-practical', layer: 'artist', tier: 'market' },

  // ── institutional tier ────────────────────────────────────
  { field: 'loanHistory', category: 'middle-practical', layer: 'artist', tier: 'institutional' },

  // ── series-specific: A Colorful History (ach.*) ───────────
  { field: 'ach.internalGroupTitle', category: 'series-specific', layer: 'artist', tier: 'studio' },
  { field: 'ach.overlay.overlayColors', category: 'series-specific', layer: 'agent', tier: 'studio' },
  { field: 'ach.overlay.overlayRects', category: 'series-specific', layer: 'agent', tier: 'studio' },
  { field: 'ach.sourcePhotographs', category: 'series-specific', layer: 'artist', tier: 'studio' },
  { field: 'ach.sourcePhotograph.sourceImage', category: 'series-specific', layer: 'artist', tier: 'studio' },
  { field: 'ach.sourcePhotograph.sourceCreator', category: 'series-specific', layer: 'agent', tier: 'studio' },
  { field: 'ach.sourcePhotograph.sourceCreatorWikidataUri', category: 'series-specific', layer: 'agent', tier: 'studio' },
  { field: 'ach.sourcePhotograph.sourceWikimediaCommonsUrl', category: 'series-specific', layer: 'agent', tier: 'studio' },
  { field: 'ach.sourcePhotograph.sourceWikidataUri', category: 'series-specific', layer: 'agent', tier: 'studio' },
  { field: 'ach.sourcePhotograph.sourceInstitution', category: 'series-specific', layer: 'agent', tier: 'studio' },
  { field: 'ach.sourcePhotograph.sourceLicense', category: 'series-specific', layer: 'agent', tier: 'studio' },
  { field: 'ach.sourcePhotograph.approximateDate', category: 'series-specific', layer: 'agent', tier: 'studio' },
  { field: 'ach.sourcePhotograph.imageCaptureType', category: 'series-specific', layer: 'agent', tier: 'studio' },
  { field: 'ach.location.locationWikidataUri', category: 'series-specific', layer: 'agent', tier: 'studio' },
  { field: 'ach.location.locationTGNUri', category: 'series-specific', layer: 'agent', tier: 'studio' },
  { field: 'ach.location.wikipediaUrl', category: 'series-specific', layer: 'agent', tier: 'studio' },
  { field: 'ach.location.wikipediaExcerpt', category: 'series-specific', layer: 'artist', tier: 'studio' },
  { field: 'ach.location.keyHistoricalDates', category: 'series-specific', layer: 'artist', tier: 'studio' },
  { field: 'ach.location.conceptCopy', category: 'series-specific', layer: 'artist', tier: 'studio' },
  { field: 'ach.mapAndTour.mapPresence', category: 'series-specific', layer: 'agent', tier: 'studio' },
  { field: 'ach.mapAndTour.lat', category: 'series-specific', layer: 'agent', tier: 'studio' },
  { field: 'ach.mapAndTour.lng', category: 'series-specific', layer: 'agent', tier: 'studio' },
  { field: 'ach.revealSlider.sliderAxis', category: 'series-specific', layer: 'agent', tier: 'studio' },
  { field: 'ach.revealSlider.transferImage', category: 'series-specific', layer: 'artist', tier: 'studio' },

  // ── series-specific: Digital City Series (dcs.*) ──────────
  { field: 'dcs.captureJourney.captureDistanceKm', category: 'series-specific', layer: 'artist', tier: 'studio' },
  { field: 'dcs.captureJourney.captureDays', category: 'series-specific', layer: 'artist', tier: 'studio' },
  { field: 'dcs.captureJourney.captureImageCount', category: 'series-specific', layer: 'artist', tier: 'studio' },
  { field: 'dcs.captureJourney.captureRouteMapUrl', category: 'series-specific', layer: 'artist', tier: 'studio' },
  { field: 'dcs.captureJourney.captureJourneyNote', category: 'series-specific', layer: 'artist', tier: 'studio' },
  { field: 'dcs.composition.streetPhotoImage', category: 'series-specific', layer: 'artist', tier: 'studio' },
  { field: 'dcs.composition.streetPhotoCaption', category: 'series-specific', layer: 'artist', tier: 'studio' },
  { field: 'dcs.composition.satelliteViewImage', category: 'series-specific', layer: 'artist', tier: 'studio' },
  { field: 'dcs.composition.satelliteViewAltText', category: 'series-specific', layer: 'agent', tier: 'studio' },
  { field: 'dcs.composition.sceneCount', category: 'series-specific', layer: 'artist', tier: 'studio' },
  { field: 'dcs.composition.compositionNarrative', category: 'series-specific', layer: 'artist', tier: 'studio' },
  { field: 'dcs.composition.homieAIPhaseUsed', category: 'series-specific', layer: 'artist', tier: 'studio' },
  { field: 'dcs.cityContext.cityFlagImage', category: 'series-specific', layer: 'artist', tier: 'studio' },
  { field: 'dcs.cityContext.cityPortraitEN', category: 'series-specific', layer: 'artist', tier: 'studio' },
  { field: 'dcs.cityContext.cityWikidataUri', category: 'series-specific', layer: 'agent', tier: 'studio' },
  { field: 'dcs.cityContext.cityPopulation', category: 'series-specific', layer: 'agent', tier: 'studio' },
  { field: 'dcs.cityContext.cityAreaKm2', category: 'series-specific', layer: 'agent', tier: 'studio' },
  { field: 'dcs.cityContext.cityPopulationDensity', category: 'series-specific', layer: 'agent', tier: 'studio' },
  { field: 'dcs.cityContext.cityElevationM', category: 'series-specific', layer: 'agent', tier: 'studio' },
  { field: 'dcs.cityContext.capturedNeighborhoods', category: 'series-specific', layer: 'artist', tier: 'studio' },
  { field: 'dcs.editionTiers', category: 'series-specific', layer: 'artist', tier: 'market', seriesScope: 'dcs' },
  { field: 'dcs.oilPainting.hasOilPainting', category: 'series-specific', layer: 'artist', tier: 'studio', seriesScope: 'dcs' },
  { field: 'dcs.oilPainting.oilPaintingArtistName', category: 'series-specific', layer: 'artist', tier: 'studio', seriesScope: 'dcs' },
  { field: 'dcs.oilPainting.oilPaintingArtistUrl', category: 'series-specific', layer: 'artist', tier: 'studio', seriesScope: 'dcs' },
  { field: 'dcs.oilPainting.oilPaintingImage', category: 'series-specific', layer: 'artist', tier: 'studio', seriesScope: 'dcs' },
  { field: 'dcs.oilPainting.oilPaintingDimensionsCm', category: 'series-specific', layer: 'artist', tier: 'studio', seriesScope: 'dcs' },
  { field: 'dcs.oilPainting.oilPaintingCollaborationStory', category: 'series-specific', layer: 'artist', tier: 'studio', seriesScope: 'dcs' },
  { field: 'dcs.oilPainting.oilPaintingAvailabilityStatus', category: 'series-specific', layer: 'artist', tier: 'studio', seriesScope: 'dcs' },
  { field: 'dcs.dcs100.dcs100MonthYear', category: 'series-specific', layer: 'artist', tier: 'studio', seriesScope: 'dcs' },
  { field: 'dcs.dcs100.dcs100TierAvailability', category: 'series-specific', layer: 'artist', tier: 'studio', seriesScope: 'dcs' },

  // ── series-specific: Megacities (megacities.*) ────────────
  { field: 'megacities.series.seriesType', category: 'series-specific', layer: 'artist', tier: 'studio', seriesScope: 'megacities' },
  { field: 'megacities.series.classificationNote', category: 'series-specific', layer: 'artist', tier: 'studio', seriesScope: 'megacities' },
  { field: 'megacities.series.seriesStatus', category: 'series-specific', layer: 'artist', tier: 'studio', seriesScope: 'megacities' },
  { field: 'megacities.series.completionStatus', category: 'series-specific', layer: 'artist', tier: 'studio', seriesScope: 'megacities' },
  { field: 'megacities.series.compositeNumber', category: 'series-specific', layer: 'artist', tier: 'studio', seriesScope: 'megacities' },
  { field: 'megacities.series.yearResearched', category: 'series-specific', layer: 'artist', tier: 'studio', seriesScope: 'megacities' },
  { field: 'megacities.series.yearCompleted', category: 'series-specific', layer: 'artist', tier: 'studio', seriesScope: 'megacities' },
  { field: 'megacities.composition.referenceCollageImage', category: 'series-specific', layer: 'artist', tier: 'studio', seriesScope: 'megacities' },
  { field: 'megacities.composition.countryFlagImage', category: 'series-specific', layer: 'artist', tier: 'studio', seriesScope: 'megacities' },
  { field: 'megacities.composition.locationCount', category: 'series-specific', layer: 'artist', tier: 'studio', seriesScope: 'megacities' },
  { field: 'megacities.composition.compositionRationale', category: 'series-specific', layer: 'artist', tier: 'studio', seriesScope: 'megacities' },
  { field: 'megacities.composition.citySelectionCriteria', category: 'series-specific', layer: 'artist', tier: 'studio', seriesScope: 'megacities' },
  { field: 'megacities.composition.selectionNote', category: 'series-specific', layer: 'artist', tier: 'studio', seriesScope: 'megacities' },
  { field: 'megacities.composition.coverageArea', category: 'series-specific', layer: 'artist', tier: 'studio', seriesScope: 'megacities' },
  { field: 'megacities.composition.dominantPalette', category: 'series-specific', layer: 'agent', tier: 'studio', seriesScope: 'megacities' },
  { field: 'megacities.composition.locations', category: 'series-specific', layer: 'artist', tier: 'studio', seriesScope: 'megacities' },
  { field: 'megacities.waterway.hasWaterway', category: 'series-specific', layer: 'artist', tier: 'studio', seriesScope: 'megacities' },
  { field: 'megacities.waterway.waterwayName', category: 'series-specific', layer: 'artist', tier: 'studio', seriesScope: 'megacities' },
  { field: 'megacities.waterway.waterwayNote', category: 'series-specific', layer: 'artist', tier: 'studio', seriesScope: 'megacities' },
  { field: 'megacities.waterway.thread', category: 'series-specific', layer: 'artist', tier: 'studio', seriesScope: 'megacities' },
  { field: 'megacities.waterway.junctions', category: 'series-specific', layer: 'artist', tier: 'studio', seriesScope: 'megacities' },
  { field: 'megacities.interaction.overlaySystem.type', category: 'series-specific', layer: 'artist', tier: 'studio', seriesScope: 'megacities' },
  { field: 'megacities.interaction.ghostMap.available', category: 'series-specific', layer: 'artist', tier: 'studio', seriesScope: 'megacities' },
  { field: 'megacities.interaction.seamReveal.available', category: 'series-specific', layer: 'artist', tier: 'studio', seriesScope: 'megacities' },
  { field: 'megacities.video.layerConcept', category: 'series-specific', layer: 'artist', tier: 'studio', seriesScope: 'megacities' },
  { field: 'megacities.video.videoFraming', category: 'series-specific', layer: 'artist', tier: 'studio', seriesScope: 'megacities' },
  { field: 'megacities.video.ambientAudio.available', category: 'series-specific', layer: 'artist', tier: 'studio', seriesScope: 'megacities' },
  { field: 'megacities.video.ambientAudio.audioUrl', category: 'series-specific', layer: 'artist', tier: 'studio', seriesScope: 'megacities' },
  { field: 'megacities.video.ambientAudio.note', category: 'series-specific', layer: 'artist', tier: 'studio', seriesScope: 'megacities' },
  { field: 'megacities.print.printAvailable', category: 'series-specific', layer: 'artist', tier: 'market', seriesScope: 'megacities' },
  { field: 'megacities.print.editions', category: 'series-specific', layer: 'artist', tier: 'market', seriesScope: 'megacities' },
  { field: 'megacities.print.certificateOfAuthenticity', category: 'series-specific', layer: 'artist', tier: 'market', seriesScope: 'megacities' },
  { field: 'megacities.print.fulfilmentPartner', category: 'series-specific', layer: 'artist', tier: 'market', seriesScope: 'megacities' },
  { field: 'megacities.print.fulfilmentNotes', category: 'series-specific', layer: 'artist', tier: 'market', seriesScope: 'megacities' },
  { field: 'megacities.print.printNotes', category: 'series-specific', layer: 'artist', tier: 'studio', seriesScope: 'megacities' },
  { field: 'megacities.ar.arEnabled', category: 'series-specific', layer: 'artist', tier: 'market', seriesScope: 'megacities' },
  { field: 'megacities.ar.arNotes', category: 'series-specific', layer: 'artist', tier: 'market', seriesScope: 'megacities' },
  { field: 'megacities.framings', category: 'series-specific', layer: 'artist', tier: 'institutional', seriesScope: 'megacities' },
  { field: 'megacities.curatorial.artistStatement', category: 'series-specific', layer: 'artist', tier: 'studio', seriesScope: 'megacities' },
  { field: 'megacities.curatorial.seriesPositionNote', category: 'series-specific', layer: 'artist', tier: 'studio', seriesScope: 'megacities' },
  { field: 'megacities.curatorial.processNote', category: 'series-specific', layer: 'artist', tier: 'studio', seriesScope: 'megacities' },
  { field: 'megacities.curatorial.openQuestions', category: 'series-specific', layer: 'artist', tier: 'studio', seriesScope: 'megacities' },
]

export const ROADMAP_CATEGORY_ORDER: RoadmapCategory[] = [
  'automatic',
  'external-lookup',
  'early',
  'middle-practical',
  'middle-reflective',
  'late',
  'confirmation-generated',
  'series-specific',
]

export const ROADMAP_CATEGORY_LABELS: Record<RoadmapCategory, string> = {
  automatic: 'Automatic (vision)',
  'external-lookup': 'External lookup (agent)',
  early: 'Early',
  'middle-practical': 'Middle — practical',
  'middle-reflective': 'Middle — reflective',
  late: 'Late',
  'confirmation-generated': 'Confirmation generated',
  'series-specific': 'Series-specific (ACH / DCS / Megacities)',
}

export function isFieldExpectedAtCareerStage(
  fieldTier: CatalogTier,
  careerStage: CareerStage,
): boolean {
  if (fieldTier === 'studio') return true
  if (fieldTier === 'market') {
    return careerStage === 'market' || careerStage === 'institutional'
  }
  return careerStage === 'institutional'
}

export function catalogFieldNames(): Set<string> {
  return new Set(ARTWORK_FIELD_CATALOG.map((f) => f.field))
}
