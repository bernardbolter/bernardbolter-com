import { CollectionConfig } from 'payload'

export const People: CollectionConfig = {
  slug: 'people',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'role', 'nationality'],
    description: 'Artists, collectors, collaborators, curators and other people connected to the work.',
  },
  fields: [
    {
      type: 'tabs',
      tabs: [

        // ── TAB 1: Identity ───────────────────────────────────
        {
          label: 'Identity',
          fields: [
            {
              name: 'name',
              type: 'text',
              required: true,
            },
            {
              name: 'slug',
              type: 'text',
              required: true,
              unique: true,
              admin: {
                description: 'URL-safe identifier e.g. bernard-bolter',
              },
            },
            {
              name: 'role',              // what kind of person is this
              type: 'select',
              required: true,
              hasMany: true,             // someone can be both artist + collector
              options: [
                { label: 'Artist',        value: 'artist' },
                { label: 'Collaborator',  value: 'collaborator' },
                { label: 'Collector',     value: 'collector' },
                { label: 'Curator',       value: 'curator' },
                { label: 'Gallery Owner', value: 'galleryOwner' },
                { label: 'Fabricator',    value: 'fabricator' },
                { label: 'Press',         value: 'press' },
                { label: 'Other',         value: 'other' },
              ],
            },
            {
              name: 'jobTitle',          // schema.org: jobTitle
              type: 'text',
            },
            {
              name: 'pronouns',
              type: 'text',
            },
            {
              name: 'nationality',       // schema.org: nationality
              type: 'text',
            },
            {
              name: 'knowsLanguage',     // schema.org: knowsLanguage
              type: 'array',
              fields: [
                {
                  name: 'language',
                  type: 'select',
                  options: [
                    { label: 'English',  value: 'en' },
                    { label: 'German',   value: 'de' },
                    { label: 'Nederlands', value: 'nl' },
                    { label: 'French',   value: 'fr' },
                    { label: 'Spanish',  value: 'es' },
                    { label: 'Italian',  value: 'it' },
                    { label: 'Chinese',  value: 'zh' },
                    { label: 'Japanese', value: 'ja' },
                  ],
                },
              ],
            },
            {
              name: 'portrait',          // schema.org: image
              type: 'upload',
              relationTo: 'media',
            },
          ],
        },

        // ── TAB 2: Biography ──────────────────────────────────
        {
          label: 'Biography',
          fields: [
            {
              name: 'bio',               // schema.org: description
              type: 'richText',
              localized: true,
            },
            {
              name: 'artistStatement',   // only relevant for role: artist
              type: 'richText',
              localized: true,
              admin: {
                condition: (data) => data?.role?.includes('artist'),
                description: 'Only shown when role includes Artist.',
              },
            },
            {
              name: 'shortBio',          // for meta, social previews
              type: 'textarea',
              localized: true,
              admin: {
                description: 'Max 160 chars. Used for meta descriptions and social previews.',
              },
            },
          ],
        },

        // ── TAB 3: Places ─────────────────────────────────────
        {
          label: 'Places',
          fields: [
            {
              name: 'birthDate',         // schema.org: birthDate
              type: 'date',
            },
            {
              name: 'birthPlace',        // schema.org: birthPlace
              type: 'group',
              fields: [
                { name: 'city',        type: 'text' },
                { name: 'region',      type: 'text' },
                { name: 'country',     type: 'text' },
                { name: 'countryCode', type: 'text' },
              ],
            },
            {
              name: 'workLocations',     // schema.org: workLocation
              type: 'array',
              fields: [
                { name: 'city',        type: 'text' },
                { name: 'country',     type: 'text' },
                { name: 'countryCode', type: 'text' },
                { name: 'lat',         type: 'number' },
                { name: 'lng',         type: 'number' },
                {
                  name: 'current',
                  type: 'checkbox',
                  defaultValue: false,
                },
              ],
            },
          ],
        },

        // ── TAB 4: Links & Authority ──────────────────────────
        {
          label: 'Links & Authority',
          admin: {
            description: 'Powers sameAs in JSON-LD — critical for AI/search authority.',
          },
          fields: [
            {
              name: 'primaryUrl',        // schema.org: url
              type: 'text',
            },
            {
              name: 'authorityLinks',    // schema.org: sameAs
              type: 'array',
              admin: {
                description: 'Verified profiles that are definitively this person.',
              },
              fields: [
                {
                  name: 'type',
                  type: 'select',
                  options: [
                    { label: 'Wikipedia',     value: 'wikipedia' },
                    { label: 'Wikidata',      value: 'wikidata' },
                    { label: 'ULAN (Getty)',  value: 'ulan' },
                    { label: 'ISNI',          value: 'isni' },
                    { label: 'VIAF',          value: 'viaf' },
                    { label: 'Instagram',     value: 'instagram' },
                    { label: 'LinkedIn',      value: 'linkedin' },
                    { label: 'Artsy',         value: 'artsy' },
                    { label: 'Artnet',        value: 'artnet' },
                    { label: 'Own Site',      value: 'ownSite' },
                    { label: 'Other',         value: 'other' },
                  ],
                },
                { name: 'url',   type: 'text', required: true },
                { name: 'label', type: 'text' },
              ],
            },
            {
              name: 'ownSites',
              type: 'array',
              admin: {
                description: 'Own websites and projects.',
                condition: (data) => data?.role?.includes('artist'),
              },
              fields: [
                { name: 'name', type: 'text' },
                { name: 'url',  type: 'text' },
                { name: 'series', type: 'relationship', relationTo: 'series' },
                {
                  name: 'role',
                  type: 'select',
                  options: [
                    { label: 'Series Archive', value: 'seriesArchive' },
                    { label: 'Project Site',   value: 'project' },
                    { label: 'Shop',           value: 'shop' },
                    { label: 'Other',          value: 'other' },
                  ],
                },
              ],
            },
          ],
        },

        // ── TAB 5: CV Background ──────────────────────────────
        {
          label: 'CV Background',
          admin: {
            condition: (data) => data?.role?.includes('artist'),
            description: 'Feeds schema.org Person and the CV page.',
          },
          fields: [
            {
              name: 'alumniOf',          // schema.org: alumniOf
              type: 'array',
              fields: [
                { name: 'institution', type: 'text' },
                { name: 'city',        type: 'text' },
                { name: 'country',     type: 'text' },
                { name: 'yearStart',   type: 'number' },
                { name: 'yearEnd',     type: 'number' },
                { name: 'degree',      type: 'text' },
                { name: 'url',         type: 'text' },
              ],
            },
            {
              name: 'affiliation',       // schema.org: affiliation
              type: 'array',
              fields: [
                { name: 'organization', type: 'text' },
                { name: 'role',         type: 'text' },
                { name: 'yearStart',    type: 'number' },
                { name: 'yearEnd',      type: 'number' },
                { name: 'url',          type: 'text' },
              ],
            },
            {
              name: 'award',             // schema.org: award
              type: 'array',
              fields: [
                { name: 'name',   type: 'text' },
                { name: 'year',   type: 'number' },
                { name: 'issuer', type: 'text' },
                { name: 'url',    type: 'text' },
              ],
            },
          ],
        },

        // ── TAB 6: SEO ────────────────────────────────────────
        {
          label: 'SEO',
          fields: [
            {
              name: 'metaTitle',
              type: 'text',
              localized: true,
            },
            {
              name: 'metaDescription',
              type: 'textarea',
              localized: true,
            },
          ],
        },

      ],
    },
  ],
}