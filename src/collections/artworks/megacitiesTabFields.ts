import type { Tab } from 'payload'

import { privateFieldAccess } from '@/access/isArtistOrAdmin'
import {
  editionTierCopiesField,
  editionTierIsOriginalTierField,
  editionTierMegacitiesRowIdentityValidate,
  editionTierMegacitiesSizeValidate,
  editionTierMegacitiesTierValidate,
  editionTierSeriesRelationField,
  editionTierVendureVariantIdField,
} from '@/collections/artworks/editionTierOwnershipFields'

/** Overlay / map coordinates — optional until set in admin tooling (Art/Official does not collect x/y). */
const xyPointFields = [
  { name: 'x', type: 'number' as const, admin: { description: '% from left' } },
  { name: 'y', type: 'number' as const, admin: { description: '% from top' } },
]

export const megacitiesTab: Tab = {
  label: 'Megacities',
  admin: {
    condition: (data) => data?.seriesSlug === 'megacities',
  },
  fields: [
    {
      name: 'megacities',
      type: 'group',
      admin: {
        description: 'Megacities series-specific data for composite country and Skate City works.',
      },
      fields: [
        // ── 1. Series Classification ────────────────────────
        {
          name: 'series',
          type: 'group',
          label: 'Series classification',
          fields: [
            {
              name: 'seriesType',
              type: 'select',
              admin: {
                description: 'Required when the artwork series is Megacities.',
              },
              options: [
                { label: 'Composite country', value: 'composite_country' },
                { label: 'Skate City', value: 'skate_city' },
                { label: 'Cultural composite', value: 'cultural_composite' },
                { label: 'Exhibition origin', value: 'exhibition_origin' },
              ],
            },
            {
              name: 'classificationNote',
              type: 'textarea',
              admin: { description: 'Free text explaining classification criteria.' },
            },
            {
              name: 'seriesStatus',
              type: 'select',
              options: [
                { label: 'Full series', value: 'full_series' },
                { label: 'Exhibition artifact', value: 'exhibition_artifact' },
                { label: 'Undecided', value: 'undecided' },
              ],
            },
            {
              name: 'completionStatus',
              type: 'select',
              options: [
                { label: 'Completed full size', value: 'completed_full_size' },
                { label: 'Small scale done', value: 'small_scale_done' },
                { label: 'In progress', value: 'in_progress' },
              ],
            },
            {
              name: 'compositeNumber',
              type: 'number',
              admin: { description: 'Position in main series order (e.g. Deutsche Stadt = 1).' },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'yearResearched',
                  type: 'text',
                  admin: { width: '50%', description: 'When cities/spots were selected.' },
                },
                {
                  name: 'yearCompleted',
                  type: 'text',
                  admin: { width: '50%', description: 'When full-size execution finished.' },
                },
              ],
            },
          ],
        },

        // ── 2. Composition ──────────────────────────────────
        {
          name: 'composition',
          type: 'group',
          label: 'Composition',
          fields: [
            {
              name: 'locationCount',
              type: 'number',
            },
            {
              name: 'compositionRationale',
              type: 'textarea',
            },
            {
              name: 'citySelectionCriteria',
              type: 'select',
              options: [
                { label: 'Largest by population', value: 'largest_by_population' },
                { label: 'Capital cities', value: 'capital_cities' },
                { label: 'Cultural centres', value: 'cultural_centres' },
                { label: 'Political body members', value: 'political_body_members' },
                { label: 'Geographic anchors', value: 'geographic_anchors' },
                { label: 'Mixed', value: 'mixed' },
              ],
            },
            {
              name: 'selectionNote',
              type: 'textarea',
            },
            {
              name: 'dominantPalette',
              type: 'array',
              labels: { singular: 'Hex', plural: 'Dominant palette' },
              fields: [{ name: 'hex', type: 'text', required: true }],
            },
            {
              name: 'coverageArea',
              type: 'textarea',
            },
            {
              name: 'referenceCollageImage',
              type: 'upload',
              relationTo: 'media',
              admin: {
                description:
                  'Small-scale working composition or layout reference (before full-size execution).',
              },
            },
            {
              name: 'countryFlagImage',
              type: 'upload',
              relationTo: 'media',
              admin: {
                description:
                  'Optional country or regional flag layer (transparent PNG) used on megacities.world.',
              },
            },
            {
              name: 'locations',
              type: 'array',
              labels: { singular: 'Location', plural: 'Locations' },
              admin: { description: 'Per-city or per-spot data.' },
              fields: [
                { name: 'name', type: 'text', required: true },
                { name: 'slug', type: 'text' },
                {
                  name: 'wikidataUri',
                  type: 'text',
                  admin: {
                    description:
                      'Wikidata entity URI for the city or spot (e.g. https://www.wikidata.org/entity/Q64).',
                  },
                },
                { name: 'country', type: 'text' },
                { name: 'region', type: 'text' },
                {
                  type: 'row',
                  fields: [
                    { name: 'population', type: 'number', admin: { width: '50%' } },
                    { name: 'populationYear', type: 'text', admin: { width: '50%' } },
                  ],
                },
                {
                  name: 'coordinates',
                  type: 'group',
                  label: 'Coordinates',
                  fields: [
                    { name: 'lat', type: 'number' },
                    { name: 'lng', type: 'number' },
                  ],
                },
                {
                  name: 'imageryDate',
                  type: 'text',
                  admin: { description: 'When satellite image was captured.' },
                },
                { name: 'imagerySource', type: 'text' },
                {
                  name: 'positionInCollage',
                  type: 'group',
                  label: 'Position in collage',
                  admin: {
                    description: 'Optional % position on the composite — set in admin, not during Art/Official chat.',
                  },
                  fields: xyPointFields,
                },
                {
                  name: 'boundaryPolygon',
                  type: 'array',
                  labels: { singular: 'Point', plural: 'Boundary polygon' },
                  admin: { description: 'Optional — for seam reveal.' },
                  fields: xyPointFields,
                },
                {
                  name: 'spotType',
                  type: 'select',
                  admin: {
                    condition: (data) => data?.megacities?.series?.seriesType === 'skate_city',
                  },
                  options: [
                    { label: 'Bowl', value: 'bowl' },
                    { label: 'Street plaza', value: 'street_plaza' },
                    { label: 'Skate park', value: 'skate_park' },
                    { label: 'DIY', value: 'diy' },
                    { label: 'Mega ramp', value: 'mega_ramp' },
                    { label: 'Pool', value: 'pool' },
                    { label: 'Transition', value: 'transition' },
                    { label: 'Ledges', value: 'ledges' },
                    { label: 'Other', value: 'other' },
                  ],
                },
                {
                  name: 'spotName',
                  type: 'text',
                  admin: {
                    condition: (data) => data?.megacities?.series?.seriesType === 'skate_city',
                  },
                },
                {
                  name: 'spotLegacyNote',
                  type: 'textarea',
                  admin: {
                    condition: (data) => data?.megacities?.series?.seriesType === 'skate_city',
                  },
                },
                { name: 'videoUrl', type: 'text' },
                {
                  name: 'videoType',
                  type: 'select',
                  options: [
                    { label: 'Rap', value: 'rap' },
                    { label: 'Skate', value: 'skate' },
                    { label: 'Documentary', value: 'documentary' },
                    { label: 'None', value: 'none' },
                  ],
                },
                { name: 'videoNote', type: 'textarea' },
                { name: 'citySelectionNote', type: 'textarea' },
                { name: 'contextNote', type: 'textarea' },
                {
                  name: 'actualGeoPosition',
                  type: 'group',
                  label: 'Ghost map position',
                  admin: {
                    condition: (data) =>
                      data?.megacities?.series?.seriesType !== 'skate_city',
                  },
                  fields: xyPointFields,
                },
              ],
            },
          ],
        },

        // ── 3. Waterway ─────────────────────────────────────
        {
          name: 'waterway',
          type: 'group',
          label: 'Waterway thread',
          fields: [
            {
              name: 'hasWaterway',
              type: 'checkbox',
              defaultValue: false,
            },
            {
              name: 'waterwayName',
              type: 'text',
              admin: {
                condition: (_, sibling) => Boolean(sibling?.hasWaterway),
              },
            },
            {
              name: 'thread',
              type: 'array',
              labels: { singular: 'Point', plural: 'Thread polyline' },
              admin: {
                condition: (_, sibling) => Boolean(sibling?.hasWaterway),
              },
              fields: [
                ...xyPointFields,
                { name: 'label', type: 'text' },
                { name: 'citySlug', type: 'text' },
              ],
            },
            {
              name: 'junctions',
              type: 'array',
              labels: { singular: 'Junction', plural: 'Junctions' },
              admin: {
                condition: (_, sibling) => Boolean(sibling?.hasWaterway),
              },
              fields: [
                { name: 'name', type: 'text', required: true },
                { name: 'x', type: 'number' },
                { name: 'y', type: 'number' },
                { name: 'note', type: 'textarea' },
              ],
            },
            {
              name: 'waterwayNote',
              type: 'textarea',
              admin: {
                condition: (_, sibling) => Boolean(sibling?.hasWaterway),
              },
            },
          ],
        },

        // ── 4. Interaction ──────────────────────────────────
        {
          name: 'interaction',
          type: 'group',
          label: 'Interaction data',
          fields: [
            {
              name: 'overlaySystem',
              type: 'group',
              label: 'Overlay system',
              fields: [
                {
                  name: 'type',
                  type: 'select',
                  options: [
                    { label: 'City boundary', value: 'city_boundary' },
                    { label: 'Spot zoom', value: 'spot_zoom' },
                  ],
                },
                {
                  name: 'defaultZoomLevel',
                  type: 'number',
                  admin: {
                    condition: (_, sibling) => sibling?.type === 'spot_zoom',
                  },
                },
                {
                  name: 'zoomTransitionMs',
                  type: 'number',
                  admin: {
                    condition: (_, sibling) => sibling?.type === 'spot_zoom',
                  },
                },
              ],
            },
            {
              name: 'spotFilters',
              type: 'group',
              label: 'Spot filters (Skate City)',
              admin: {
                condition: (data) => data?.megacities?.series?.seriesType === 'skate_city',
              },
              fields: [
                { name: 'byType', type: 'checkbox', defaultValue: false },
                { name: 'byRegion', type: 'checkbox', defaultValue: false },
                {
                  name: 'regions',
                  type: 'array',
                  labels: { singular: 'Region', plural: 'Regions' },
                  fields: [{ name: 'name', type: 'text', required: true }],
                },
              ],
            },
            {
              name: 'ghostMap',
              type: 'group',
              label: 'Ghost map mode',
              admin: {
                condition: (data) =>
                  data?.megacities?.interaction?.overlaySystem?.type === 'city_boundary' ||
                  data?.megacities?.series?.seriesType !== 'skate_city',
              },
              fields: [
                { name: 'available', type: 'checkbox', defaultValue: false },
                { name: 'countryOutlineSvg', type: 'text' },
                { name: 'transitionMs', type: 'number' },
                { name: 'note', type: 'textarea' },
              ],
            },
            {
              name: 'seamReveal',
              type: 'group',
              label: 'Seam reveal',
              admin: {
                condition: (data) =>
                  data?.megacities?.interaction?.overlaySystem?.type === 'city_boundary',
              },
              fields: [{ name: 'available', type: 'checkbox', defaultValue: false }],
            },
            {
              name: 'coordinateGrid',
              type: 'group',
              label: 'Coordinate grid',
              fields: [{ name: 'available', type: 'checkbox', defaultValue: false }],
            },
          ],
        },

        // ── 5. AR ───────────────────────────────────────────
        {
          name: 'ar',
          type: 'group',
          label: 'AR layer',
          fields: [
            {
              name: 'arEnabled',
              type: 'checkbox',
              defaultValue: false,
            },
            {
              name: 'mindJsTargetImage',
              type: 'text',
              admin: {
                condition: (_, sibling) => Boolean(sibling?.arEnabled),
                description: 'Path to AR recognition image.',
              },
            },
            {
              name: 'arExperienceUrl',
              type: 'text',
              admin: {
                condition: (_, sibling) => Boolean(sibling?.arEnabled),
                description: 'Stable slug-based AR experience URL.',
              },
            },
            {
              name: 'supportedPrintSizes',
              type: 'array',
              labels: { singular: 'Size', plural: 'Supported print sizes' },
              admin: { condition: (_, sibling) => Boolean(sibling?.arEnabled) },
              fields: [{ name: 'size', type: 'text', required: true }],
            },
            {
              name: 'arNotes',
              type: 'textarea',
              admin: { condition: (_, sibling) => Boolean(sibling?.arEnabled) },
            },
            {
              name: 'buyerDelivery',
              type: 'select',
              admin: { condition: (_, sibling) => Boolean(sibling?.arEnabled) },
              options: [
                { label: 'QR on print', value: 'qr_on_print' },
                { label: 'QR on insert', value: 'qr_on_insert' },
                { label: 'Email post-purchase', value: 'email_post_purchase' },
                { label: 'URL in packaging', value: 'url_in_packaging' },
                { label: 'Multiple', value: 'multiple' },
              ],
            },
            {
              name: 'buyerDeliveryNote',
              type: 'textarea',
              admin: { condition: (_, sibling) => Boolean(sibling?.arEnabled) },
            },
          ],
        },

        // ── 6. Video ────────────────────────────────────────
        {
          name: 'video',
          type: 'group',
          label: 'Video and audio layer',
          fields: [
            {
              name: 'layerConcept',
              type: 'textarea',
              admin: { description: 'Curatorial framing for the video layer.' },
            },
            {
              name: 'ambientAudio',
              type: 'group',
              label: 'Ambient audio',
              fields: [
                { name: 'available', type: 'checkbox', defaultValue: false },
                { name: 'audioUrl', type: 'text' },
                { name: 'note', type: 'textarea' },
              ],
            },
            {
              name: 'videoFraming',
              type: 'select',
              options: [
                { label: 'Rap per city', value: 'rap_per_city' },
                { label: 'Skate per spot', value: 'skate_per_spot' },
                { label: 'Street level contrast', value: 'street_level_contrast' },
                { label: 'Audio only', value: 'audio_only' },
                { label: 'Mixed', value: 'mixed' },
              ],
            },
          ],
        },

        // ── 7. Print ────────────────────────────────────────
        {
          name: 'print',
          type: 'group',
          label: 'Print edition',
          fields: [
            {
              name: 'printAvailable',
              type: 'checkbox',
              defaultValue: false,
            },
            {
              name: 'editions',
              type: 'array',
              labels: { singular: 'Edition', plural: 'Editions' },
              validate: editionTierMegacitiesRowIdentityValidate,
              admin: { condition: (_, sibling) => Boolean(sibling?.printAvailable) },
              fields: [
                editionTierSeriesRelationField,
                editionTierVendureVariantIdField,
                {
                  name: 'tier',
                  type: 'select',
                  validate: editionTierMegacitiesTierValidate,
                  admin: {
                    description:
                      'Fallback when seriesEditionTier is not set. Deprecated once the series relation is populated.',
                  },
                  options: [
                    { label: 'Full size', value: 'full_size' },
                    { label: 'A0', value: 'a0' },
                    { label: 'A1', value: 'a1' },
                  ],
                },
                { name: 'dimensions', type: 'text' },
                {
                  name: 'editionSize',
                  type: 'number',
                  validate: editionTierMegacitiesSizeValidate,
                },
                {
                  name: 'vendureProductId',
                  type: 'text',
                  access: privateFieldAccess,
                },
                { name: 'arEnabled', type: 'checkbox', defaultValue: false },
                { name: 'available', type: 'checkbox', defaultValue: true },
                { name: 'notes', type: 'textarea' },
                editionTierIsOriginalTierField,
                editionTierCopiesField,
              ],
            },
            {
              name: 'certificateOfAuthenticity',
              type: 'select',
              options: [
                { label: 'Physical', value: 'physical' },
                { label: 'Digital PDF', value: 'digital_pdf' },
                { label: 'Blockchain', value: 'blockchain' },
                { label: 'Physical and digital', value: 'physical_and_digital' },
                { label: 'None', value: 'none' },
                { label: 'TBD', value: 'tbd' },
              ],
            },
            { name: 'fulfilmentPartner', type: 'text' },
            { name: 'fulfilmentNotes', type: 'textarea' },
            { name: 'printNotes', type: 'textarea' },
          ],
        },

        // ── 8. Framings ─────────────────────────────────────
        {
          name: 'framings',
          type: 'array',
          labels: { singular: 'Framing', plural: 'Contextual framings' },
          admin: { description: 'Every activation register — past and potential.' },
          fields: [
            {
              name: 'framingType',
              type: 'select',
              options: [
                { label: 'Overview effect', value: 'overview_effect' },
                { label: 'Community representation', value: 'community_representation' },
                { label: 'Historical document', value: 'historical_document' },
                { label: 'Political reframe', value: 'political_reframe' },
                { label: 'Cultural celebration', value: 'cultural_celebration' },
                { label: 'Commission response', value: 'commission_response' },
              ],
            },
            { name: 'title', type: 'text', required: true },
            { name: 'description', type: 'textarea' },
            { name: 'activatedBy', type: 'text' },
            {
              name: 'status',
              type: 'select',
              options: [
                { label: 'Active', value: 'active' },
                { label: 'Historical', value: 'historical' },
                { label: 'Latent', value: 'latent' },
              ],
            },
            {
              name: 'exhibitions',
              type: 'array',
              labels: { singular: 'Exhibition', plural: 'Exhibitions' },
              fields: [
                { name: 'name', type: 'text', required: true },
                { name: 'venue', type: 'text' },
                { name: 'venueNote', type: 'textarea' },
                { name: 'city', type: 'text' },
                { name: 'year', type: 'text' },
                {
                  name: 'type',
                  type: 'select',
                  options: [
                    { label: 'Solo', value: 'solo' },
                    { label: 'Group', value: 'group' },
                    { label: 'Commission', value: 'commission' },
                    { label: 'Residency', value: 'residency' },
                    { label: 'Performance', value: 'performance' },
                  ],
                },
                { name: 'notes', type: 'textarea' },
              ],
            },
            {
              name: 'performances',
              type: 'array',
              labels: { singular: 'Performance', plural: 'Performances' },
              fields: [
                { name: 'type', type: 'text' },
                { name: 'venue', type: 'text' },
                { name: 'year', type: 'text' },
                { name: 'description', type: 'textarea' },
              ],
            },
            { name: 'potentialActivations', type: 'textarea' },
          ],
        },

        // ── 9. Curatorial ───────────────────────────────────
        {
          name: 'curatorial',
          type: 'group',
          label: 'Curatorial notes',
          fields: [
            { name: 'artistStatement', type: 'textarea' },
            { name: 'seriesPositionNote', type: 'textarea' },
            { name: 'processNote', type: 'textarea' },
            { name: 'openQuestions', type: 'textarea' },
          ],
        },
      ],
    },
  ],
}
