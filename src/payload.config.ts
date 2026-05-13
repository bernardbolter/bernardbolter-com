import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Load .env BEFORE importing anything else
dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Artworks } from './collections/Artworks'
import { People } from './collections/People'
import { Series } from './collections/Series'
import { Exhibitions } from './collections/Exhibitions'
import { Events } from './collections/Events'
import { Tags } from './collections/Tags'
import { ArtHistoricalReferences } from './collections/ArtHistoricalReferences'
import { Artists } from './collections/Artists'
import { CollectionKnowledge } from './collections/CollectionKnowledge'
import { Collectors } from './collections/Collectors'
import { Galleries } from './collections/Galleries'
import { GalleryKnowledge } from './collections/GalleryKnowledge'
import { PracticeKnowledge } from './collections/PracticeKnowledge'
import { Sessions } from './collections/Sessions'

import { s3Storage } from '@payloadcms/storage-s3'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set in environment variables')
}

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    components: {
      views: {
        artOfficial: {
          Component: '/components/admin/ArtOfficialView#ArtOfficialView',
          path: '/art-official',
          exact: true,
        },
      },
    },
  },
  localization: {
    locales: [
      { label: 'English', code: 'en' },
      { label: 'Deutsch', code: 'de' },
    ],
    defaultLocale: 'en',
    fallback: true,
  },
  collections: [
    Users,
    Media,
    Artists,
    PracticeKnowledge,
    CollectionKnowledge,
    GalleryKnowledge,
    Collectors,
    Galleries,
    Artworks,
    People,
    Series,
    Exhibitions,
    Events,
    Tags,
    ArtHistoricalReferences,
    Sessions,
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: databaseUrl,
    },
    /** Set `PAYLOAD_DATABASE_PUSH=true` locally to sync Drizzle schema without interactive migrate:create. */
    push: process.env.PAYLOAD_DATABASE_PUSH === 'true',
  }),
  sharp,
  plugins: [
    s3Storage({
      collections: {
        media: {
          generateFileURL: ({ filename }) =>
            `${process.env.NEXT_PUBLIC_IMAGE_DOMAIN}/${filename}`,
        },
      },
      bucket: process.env.R2_BUCKET_NAME || '',
      config: {
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
        },
        region: 'auto',
        endpoint: process.env.R2_ENDPOINT || '',
        forcePathStyle: true,
      },
    }),
  ],
})