import type { CollectionConfig } from 'payload'

import { authenticatedReadStaffWrite } from '@/access/staffAccess'
import { dcsCapturePhotosBeforeChange } from '@/hooks/dcsCapturePhotosBeforeChange'

export const DCSCapturePhotos: CollectionConfig = {
  slug: 'dcs-capture-photos',
  labels: { singular: 'DCS capture photo', plural: 'DCS capture photos' },
  admin: {
    useAsTitle: 'captureSequenceNumber',
    defaultColumns: ['parentArtwork', 'captureSequenceNumber', 'isMicroSelection', 'status'],
    description:
      'Individual street photographs from a DCS skate mission. One photo per parent artwork may be flagged as the Micro selection.',
  },
  access: authenticatedReadStaffWrite,
  hooks: {
    beforeChange: [
      async (args) => {
        if (args.context?.skipMicroGuard) return args.data
        return dcsCapturePhotosBeforeChange(args)
      },
    ],
  },
  fields: [
    {
      name: 'parentArtwork',
      type: 'relationship',
      relationTo: 'artworks',
      required: true,
      admin: {
        description: 'The DCS city composition this photo belongs to.',
      },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'High-res archival photograph.' },
    },
    {
      name: 'captureSequenceNumber',
      type: 'number',
      min: 1,
      max: 40,
      admin: { description: 'Position in the journey sequence, 1–40.' },
    },
    {
      name: 'isMicroSelection',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'The decisive-moment street photo selected as the Micro for the final composition. Only one per parent artwork.',
      },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'captureTimestamp',
          type: 'date',
          admin: {
            width: '50%',
            date: { pickerAppearance: 'dayAndTime' },
            description: 'Exact date and time the photo was taken.',
          },
        },
        {
          name: 'neighborhood',
          type: 'text',
          admin: { width: '50%', description: 'Neighbourhood or district.' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'gpsLat',
          type: 'number',
          admin: { width: '50%', description: 'Latitude from EXIF or GPS log.' },
        },
        {
          name: 'gpsLng',
          type: 'number',
          admin: { width: '50%', description: 'Longitude from EXIF or GPS log.' },
        },
      ],
    },
    {
      name: 'captureNote',
      type: 'textarea',
      admin: {
        description: 'Artist note on this moment — short, informal.',
      },
    },
    {
      name: 'altText',
      type: 'text',
      admin: { description: 'Accessible alt text. Agent drafts; artist confirms.' },
    },
    // Deferred AR reconstruction fields — schema only, hidden in admin (spec §2.4)
    {
      name: 'arReconstructionBefore',
      type: 'upload',
      relationTo: 'media',
      admin: { hidden: true },
    },
    {
      name: 'arReconstructionAfter',
      type: 'upload',
      relationTo: 'media',
      admin: { hidden: true },
    },
    {
      name: 'arReconstructionVideoUrl',
      type: 'text',
      admin: { hidden: true },
    },
    {
      name: 'arReconstructionStatus',
      type: 'select',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'In progress', value: 'in-progress' },
        { label: 'Complete', value: 'complete' },
      ],
      admin: { hidden: true },
    },
  ],
  timestamps: true,
}
