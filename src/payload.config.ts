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
import { Artists } from './collections/Artists'
import { PracticeKnowledge } from './collections/PracticeKnowledge'
import { Series } from './collections/Series'
import { Lines } from './collections/Lines'
import { StudioConversations } from './collections/StudioConversations'
import { Tags } from './collections/Tags'
import { ArtHistoricalReferences } from './collections/ArtHistoricalReferences'
import { Events } from './collections/Events'
import { ImageCaptureTechnologies } from './collections/ImageCaptureTechnologies'
import { Artworks } from './collections/Artworks'
import { Triptychs } from './collections/Triptychs'
import { SmallPrints } from './collections/SmallPrints'
import { Sessions } from './collections/Sessions'
import { PrintSetConfig } from './globals/PrintSetConfig'

import { s3Storage } from '@payloadcms/storage-s3'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set in environment variables')
}

const payloadSecret = process.env.PAYLOAD_SECRET
if (!payloadSecret) {
  throw new Error('PAYLOAD_SECRET is not set in environment variables')
}

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    components: {
      beforeNavLinks: ['/components/admin/ArtOfficialNavLink#ArtOfficialNavLink'],
      beforeDashboard: ['/components/admin/ArtOfficialDashboardLink#ArtOfficialDashboardLink'],
      views: {
        artOfficial: {
          Component: '/components/admin/ArtOfficialView#ArtOfficialView',
          path: '/art-official',
          exact: true,
        },
        artOfficialSession: {
          Component:
            '/components/admin/artOfficial/ArtOfficialSessionView#ArtOfficialSessionView',
          path: '/art-official/:sessionId',
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
    Series,
    Lines,
    StudioConversations,
    Tags,
    ArtHistoricalReferences,
    Events,
    ImageCaptureTechnologies,
    Artworks,
    Triptychs,
    SmallPrints,
    Sessions,
  ],
  globals: [PrintSetConfig],
  editor: lexicalEditor(),
  secret: payloadSecret,
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
