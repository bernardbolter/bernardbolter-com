import type { Tab } from 'payload'

import { privateFieldAccess } from '@/access/isArtistOrAdmin'

export const dcsTab: Tab = {
  label: 'Digital City Series',
  admin: {
    condition: (data) => data?.seriesSlug === 'digital-city-series',
  },
  fields: [
    {
      name: 'dcs',
      type: 'group',
      admin: {
        description:
          'Digital City Series extension. Base city and yearCreated live on the Core tab; primaryImage is the Meso composition.',
      },
      fields: [
        // ── 1.1 Capture & Journey ─────────────────────────────
        {
          name: 'captureJourney',
          type: 'group',
          label: 'Capture & Journey',
          admin: {
            description:
              'Physical skate mission that generated source material. City and yearCreated are on Core.',
          },
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'captureDistanceKm',
                  type: 'number',
                  admin: {
                    width: '33%',
                    description: 'Total distance skated during the capture mission (km).',
                  },
                },
                {
                  name: 'captureDays',
                  type: 'number',
                  admin: { width: '33%', description: 'Days spent on the ground capturing.' },
                },
                {
                  name: 'captureImageCount',
                  type: 'number',
                  admin: { width: '34%', description: 'Total raw photographs taken.' },
                },
              ],
            },
            {
              name: 'captureRouteGpx',
              type: 'upload',
              relationTo: 'media',
              admin: { description: 'Raw GPX file from GPS tracker.' },
            },
            {
              name: 'captureRouteMapUrl',
              type: 'text',
              admin: { description: 'Fallback embed URL if GPX unavailable.' },
            },
            {
              name: 'captureAmbientAudioUrl',
              type: 'text',
              admin: { description: 'Link to ambient audio from the mission.' },
            },
            {
              name: 'captureBRollVideoUrl',
              type: 'text',
              admin: { description: 'Link to street B-roll footage.' },
            },
            {
              name: 'captureJourneyNote',
              type: 'textarea',
              admin: {
                description:
                  'Artist account of the mission — first-person, informal.',
              },
            },
            {
              name: 'capturePhotos',
              type: 'join',
              collection: 'dcs-capture-photos',
              on: 'parentArtwork',
              admin: {
                description: 'Individual street photographs from this mission (via DCSCapturePhotos).',
              },
            },
          ],
        },

        // ── 1.2 Composition ─────────────────────────────────
        {
          name: 'composition',
          type: 'group',
          label: 'Composition',
          admin: {
            description:
              'Smoothist composition process. primaryImage on Core is the Meso; streetPhotoImage is the Micro.',
          },
          fields: [
            {
              name: 'streetPhotoImage',
              type: 'upload',
              relationTo: 'media',
              admin: { description: 'Selected decisive-moment street photograph (Micro).' },
            },
            {
              name: 'streetPhotoCaption',
              type: 'text',
              admin: { description: 'Where/when captured and why selected.' },
            },
            {
              name: 'satelliteViewImage',
              type: 'upload',
              relationTo: 'media',
              admin: { description: 'Satellite or aerial image (Macro).' },
            },
            {
              name: 'satelliteViewAltText',
              type: 'text',
              admin: { description: 'Alt text for satellite image. Agent drafts; artist confirms.' },
            },
            {
              name: 'sceneCount',
              type: 'number',
              min: 2,
              max: 4,
              admin: { description: 'Panoramic scenes blended (2–4).' },
            },
            {
              name: 'compositionNarrative',
              type: 'textarea',
              admin: { description: 'Curatorial reasoning behind scene choices.' },
            },
            {
              name: 'homieAIPhaseUsed',
              type: 'select',
              options: [
                { label: 'Manual only', value: 'manual-only' },
                { label: 'Phase 1 — sorting', value: 'phase-1-sorting' },
                { label: 'Phase 2 — curation', value: 'phase-2-curation' },
                { label: 'Phase 3 — blending', value: 'phase-3-blending' },
              ],
            },
            {
              name: 'compositionProcessVideoUrl',
              type: 'text',
              admin: { description: 'Screen recording or timelapse of composition session.' },
            },
            {
              name: 'compositionAudioCommentaryUrl',
              type: 'text',
              admin: { description: 'Narrated audio of composition decisions.' },
            },
          ],
        },

        // ── 1.3 City Context ────────────────────────────────
        {
          name: 'cityContext',
          type: 'group',
          label: 'City Context',
          fields: [
            {
              name: 'cityFlagImage',
              type: 'upload',
              relationTo: 'media',
              admin: {
                description:
                  'Country or city flag as a transparent PNG. Used as a decorative layer on the artwork page.',
              },
            },
            {
              name: 'cityPortraitEN',
              type: 'textarea',
              admin: { description: 'Short writing about this city — English.' },
            },
            {
              name: 'cityPortraitDE',
              type: 'textarea',
              admin: { description: 'German translation of city portrait.' },
            },
            {
              name: 'cityWikidataUri',
              type: 'text',
              admin: { description: 'Wikidata entity URI for the city.' },
            },
            {
              name: 'cityPopulation',
              type: 'number',
              admin: { description: 'Population at time of capture.' },
            },
            {
              name: 'cityAreaKm2',
              type: 'number',
              admin: { description: 'City area in km².' },
            },
            {
              name: 'cityPopulationDensity',
              type: 'number',
              admin: { description: 'Population density per km² at time of capture.' },
            },
            {
              name: 'cityElevationM',
              type: 'number',
              admin: { description: 'Mean elevation of the city in metres above sea level.' },
            },
            {
              name: 'capturedNeighborhoods',
              type: 'array',
              labels: { singular: 'Neighbourhood', plural: 'Neighbourhoods' },
              fields: [{ name: 'name', type: 'text', required: true }],
            },
          ],
        },

        // ── 1.4 Edition Tiers ───────────────────────────────
        {
          name: 'editionTiers',
          type: 'array',
          labels: { singular: 'Edition tier', plural: 'Edition tiers' },
          admin: {
            description:
              'Archival record of edition tiers. Vendure is source of truth for pricing; webhook maintains remaining counts.',
          },
          fields: [
            {
              name: 'tierName',
              type: 'select',
              required: true,
              options: [
                { label: 'Small print', value: 'small-print' },
                { label: "Collector's print", value: 'collectors-print' },
                { label: 'Monumental', value: 'monumental' },
                { label: 'Oil painting', value: 'oil-painting' },
              ],
            },
            {
              name: 'totalEditionSize',
              type: 'number',
              required: true,
              admin: { description: 'Fixed edition size — never changes after publication.' },
            },
            {
              name: 'printSubstrate',
              type: 'select',
              options: [
                { label: 'Paper', value: 'paper' },
                { label: 'Aluminum mount', value: 'aluminum-mount' },
                { label: 'Canvas', value: 'canvas' },
                { label: 'Oil on canvas', value: 'oil-on-canvas' },
              ],
            },
            {
              name: 'includesSupportingPrints',
              type: 'checkbox',
              defaultValue: false,
              admin: {
                condition: (_, sibling) => sibling?.tierName !== 'oil-painting',
                description: 'Ships with street photo + satellite supporting prints.',
              },
            },
            {
              name: 'vendureProductId',
              type: 'text',
              access: privateFieldAccess,
              admin: {
                description: 'Vendure product ID — immutable once set.',
              },
            },
            {
              name: 'editionsRemaining',
              type: 'number',
              access: privateFieldAccess,
              admin: {
                readOnly: true,
                description: 'Webhook-maintained remaining stock.',
              },
            },
            {
              name: 'editionsRemainingUpdatedAt',
              type: 'date',
              access: privateFieldAccess,
              admin: {
                readOnly: true,
                description: 'Last successful webhook sync.',
              },
            },
            {
              name: 'tierAvailabilityStatus',
              type: 'select',
              access: privateFieldAccess,
              admin: { readOnly: true },
              options: [
                { label: 'Available', value: 'available' },
                { label: 'Sold out', value: 'sold-out' },
                { label: 'Not yet listed', value: 'not-yet-listed' },
                { label: 'Not for sale', value: 'not-for-sale' },
              ],
            },
          ],
        },

        // ── 1.5 Oil Painting Collaboration ──────────────────
        {
          name: 'oilPainting',
          type: 'group',
          label: 'Oil Painting Collaboration',
          fields: [
            {
              name: 'hasOilPainting',
              type: 'checkbox',
              defaultValue: false,
              admin: { description: 'Whether a Da Fen oil painting collaboration exists.' },
            },
            {
              name: 'oilPaintingArtistName',
              type: 'text',
              admin: {
                condition: (_, sibling) => Boolean(sibling?.hasOilPainting),
              },
            },
            {
              name: 'oilPaintingArtistBio',
              type: 'richText',
              admin: {
                condition: (_, sibling) => Boolean(sibling?.hasOilPainting),
              },
            },
            {
              name: 'oilPaintingArtistUrl',
              type: 'text',
              admin: {
                condition: (_, sibling) => Boolean(sibling?.hasOilPainting),
              },
            },
            {
              name: 'oilPaintingImage',
              type: 'upload',
              relationTo: 'media',
              admin: {
                condition: (_, sibling) => Boolean(sibling?.hasOilPainting),
              },
            },
            {
              name: 'oilPaintingDimensionsCm',
              type: 'text',
              admin: {
                condition: (_, sibling) => Boolean(sibling?.hasOilPainting),
                description: "E.g. '100 × 100 cm'.",
              },
            },
            {
              name: 'oilPaintingCollaborationStory',
              type: 'textarea',
              admin: {
                condition: (_, sibling) => Boolean(sibling?.hasOilPainting),
              },
            },
            {
              name: 'oilPaintingVendureProductId',
              type: 'text',
              access: privateFieldAccess,
              admin: {
                condition: (_, sibling) => Boolean(sibling?.hasOilPainting),
              },
            },
            {
              name: 'oilPaintingAvailabilityStatus',
              type: 'select',
              admin: {
                condition: (_, sibling) => Boolean(sibling?.hasOilPainting),
              },
              options: [
                { label: 'Available', value: 'available' },
                { label: 'Sold', value: 'sold' },
                { label: 'In progress', value: 'in-progress' },
                { label: 'Not for sale', value: 'not-for-sale' },
              ],
            },
          ],
        },

        // ── 1.6 DCS100 Subscription ─────────────────────────
        {
          name: 'dcs100',
          type: 'group',
          label: 'DCS100 Subscription',
          fields: [
            {
              name: 'dcs100MonthYear',
              type: 'text',
              admin: { description: "Monthly drop format YYYY-MM, e.g. '2025-03'." },
            },
            {
              name: 'dcs100IsDelivered',
              type: 'checkbox',
              defaultValue: false,
            },
            {
              name: 'dcs100TierAvailability',
              type: 'select',
              hasMany: true,
              options: [
                { label: 'Cornerstone', value: 'cornerstone' },
                { label: 'Arch stone', value: 'arch-stone' },
                { label: 'Capstone', value: 'capstone' },
              ],
            },
            {
              name: 'zineEditionSize',
              type: 'number',
              defaultValue: 30,
            },
            {
              name: 'zineAvailable',
              type: 'checkbox',
              defaultValue: false,
            },
            {
              name: 'zineVendureProductId',
              type: 'text',
              access: privateFieldAccess,
            },
          ],
        },

        // ── 1.7 Digital Certificate & DAAAH ─────────────────
        {
          name: 'certificate',
          type: 'group',
          label: 'Digital Certificate & DAAAH',
          fields: [
            {
              name: 'certificateId',
              type: 'text',
              access: privateFieldAccess,
              admin: {
                readOnly: true,
                description: 'Auto-generated on first publication. E.g. DCS-BER-SP-042.',
              },
            },
            {
              name: 'certificateRegistryUrl',
              type: 'text',
              access: privateFieldAccess,
              admin: { readOnly: true },
            },
            {
              name: 'daaahListingStatus',
              type: 'select',
              options: [
                { label: 'Not listed', value: 'not-listed' },
                { label: 'Active listing', value: 'active-listing' },
                { label: 'Sold on DAAAH', value: 'sold-on-daaah' },
                { label: 'Reserved', value: 'reserved' },
              ],
            },
            {
              name: 'daaahListingPriceEur',
              type: 'number',
              admin: {
                condition: (_, sibling) => sibling?.daaahListingStatus === 'active-listing',
                description: 'Asking price in EUR when listed on DAAAH.',
              },
            },
            {
              name: 'daaahSaleHistory',
              type: 'array',
              access: privateFieldAccess,
              labels: { singular: 'Sale', plural: 'Sale history' },
              admin: { readOnly: true },
              fields: [
                { name: 'date', type: 'date', required: true },
                { name: 'salePriceEur', type: 'number', required: true },
                { name: 'buyerCity', type: 'text' },
              ],
            },
          ],
        },
      ],
    },
  ],
}
