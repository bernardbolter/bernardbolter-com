// globals/Person.ts
import { GlobalConfig } from 'payload'

const Person: GlobalConfig = {
  slug: 'person',
  label: 'Artist Identity',
  admin: {
    description: 'Core identity data. Powers all JSON-LD Person schema across all sites.',
  },
  fields: [

    // ── Core Identity ───────────────────────────────────────────
    {
      type: 'tabs',
      tabs: [

        // TAB 1: Identity
        {
          label: 'Identity',
          fields: [
            {
              name: 'name',
              type: 'text',
              required: true,
              defaultValue: 'Bernard Bolter',
            },
            {
              name: 'slug',       // for URL generation, e.g. /artist/bernard-bolter
              type: 'text',
              required: true,
            },
            {
              name: 'jobTitle',   // schema.org: jobTitle
              type: 'text',
              defaultValue: 'Artist',
            },
            {
              name: 'pronouns',
              type: 'text',
            },
            {
              name: 'nationality', // schema.org: nationality
              type: 'text',
            },
            {
              name: 'knowsLanguage', // schema.org: knowsLanguage
              type: 'array',
              fields: [
                {
                  name: 'language',
                  type: 'select',
                  options: ['en', 'de', 'fr', 'es', 'it', 'pt', 'zh', 'ja'],
                },
              ],
            },
            {
              name: 'portrait',   // schema.org: image
              type: 'upload',
              relationTo: 'media',
            },
          ],
        },

        // TAB 2: Biography
        {
          label: 'Biography',
          fields: [
            {
              name: 'bio',        // schema.org: description
              type: 'richText',
              localized: true,
            },
            {
              name: 'artistStatement',
              type: 'richText',
              localized: true,
            },
            {
              name: 'shortBio',   // for meta descriptions, social previews
              type: 'textarea',
              localized: true,
              admin: {
                description: 'Max 160 chars. Used for meta descriptions and social previews.',
              },
            },
          ],
        },

        // TAB 3: Birth & Places
        {
          label: 'Places',
          fields: [
            {
              name: 'birthDate',  // schema.org: birthDate
              type: 'date',
            },
            {
              name: 'birthPlace', // schema.org: birthPlace → Place
              type: 'group',
              fields: [
                { name: 'city',        type: 'text', defaultValue: 'San Francisco' },
                { name: 'region',      type: 'text', defaultValue: 'California' },
                { name: 'country',     type: 'text', defaultValue: 'United States' },
                { name: 'countryCode', type: 'text', defaultValue: 'US' },
              ],
            },
            {
              name: 'workLocations', // schema.org: workLocation → [Place]
              type: 'array',
              admin: {
                description: 'Cities where you actively work. Order = priority.',
              },
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
                  admin: { description: 'Is this a current base?' },
                },
              ],
            },
          ],
        },

        // TAB 4: Links & Authority
        {
          label: 'Links & Authority',
          admin: {
            description: 'These power the sameAs property in JSON-LD — critical for AI/search authority.',
          },
          fields: [
            {
              name: 'primaryUrl', // schema.org: url — canonical home
              type: 'text',
              defaultValue: 'https://bernardbolter.com',
            },
            {
              name: 'authorityLinks', // schema.org: sameAs
              type: 'array',
              admin: {
                description: 'Every verified profile/page that is definitively "you". More = more authority.',
              },
              fields: [
                {
                  name: 'type',
                  type: 'select',
                  options: [
                    { label: 'Wikipedia',  value: 'wikipedia' },
                    { label: 'Wikidata',   value: 'wikidata' },
                    { label: 'ULAN (Getty)', value: 'ulan' },
                    { label: 'ISNI',       value: 'isni' },
                    { label: 'VIAF',       value: 'viaf' },
                    { label: 'Instagram',  value: 'instagram' },
                    { label: 'LinkedIn',   value: 'linkedin' },
                    { label: 'Artsy',      value: 'artsy' },
                    { label: 'Artnet',     value: 'artnet' },
                    { label: 'Own Site',   value: 'ownSite' },
                    { label: 'Other',      value: 'other' },
                  ],
                },
                { name: 'url',   type: 'text', required: true },
                { name: 'label', type: 'text' }, // human-readable label
              ],
            },
            {
              name: 'ownSites', // typed version of your WP link1-5
              type: 'array',
              admin: {
                description: 'Your own websites/projects — separate from authority links.',
              },
              fields: [
                { name: 'name',   type: 'text' },  // e.g. "A Colorful History"
                { name: 'url',    type: 'text' },
                // { name: 'series', type: 'relationship', relationTo: 'series', hasMany: false },
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

        // TAB 5: Education & Affiliation
        {
          label: 'CV Background',
          admin: {
            description: 'Feeds into schema.org Person and the CV page.',
          },
          fields: [
            {
              name: 'alumniOf',   // schema.org: alumniOf → EducationalOrganization
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
              name: 'affiliation', // schema.org: affiliation → Organization
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
              name: 'award',      // schema.org: award
              type: 'array',
              fields: [
                { name: 'name',  type: 'text' },
                { name: 'year',  type: 'number' },
                { name: 'issuer', type: 'text' },
                { name: 'url',   type: 'text' },
              ],
            },
          ],
        },

        // TAB 6: SEO
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

export default Person