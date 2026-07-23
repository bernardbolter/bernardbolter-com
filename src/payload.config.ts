import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Load .env BEFORE importing anything else (.env wins over stale shell env).
// One-off push scripts set PAYLOAD_DATABASE_PUSH=true before importing this module;
// preserve that so .env (often false on production) does not disable the push.
const preserveDatabasePush = process.env.PAYLOAD_DATABASE_PUSH === 'true'
const preserveDevelopmentNodeEnv = process.env.NODE_ENV === 'development'
dotenv.config({ path: '.env', override: true })
dotenv.config({ path: '.env.local', override: true })
if (preserveDatabasePush) {
  process.env.PAYLOAD_DATABASE_PUSH = 'true'
}
if (preserveDevelopmentNodeEnv) {
  Object.assign(process.env, { NODE_ENV: 'development' })
}

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
import { PatternReports } from './collections/PatternReports'
import { Episodes } from './collections/Episodes'
import { FieldNotes } from './collections/FieldNotes'
import { CapturePresets } from './collections/CapturePresets'
import { Tags } from './collections/Tags'
import { ArtHistoricalReferences } from './collections/ArtHistoricalReferences'
import { Events } from './collections/Events'
import { People } from './collections/People'
import { ImageCaptureTechnologies } from './collections/ImageCaptureTechnologies'
import { Artworks } from './collections/Artworks'
import { DCSCapturePhotos } from './collections/DCSCapturePhotos'
import { Triptychs } from './collections/Triptychs'
import { SmallPrints } from './collections/SmallPrints'
import { Sessions } from './collections/Sessions'
import { Campaigns } from './collections/Campaigns'
import { Themes } from './collections/Themes'
import { QueueItems } from './collections/QueueItems'
import { HashtagTags } from './collections/HashtagTags'
import { CalendarDays } from './collections/CalendarDays'
import { FinaleScripts } from './collections/FinaleScripts'
import { Segments } from './collections/Segments'
import { Shots } from './collections/Shots'
import { Takes } from './collections/Takes'
import { ArtOfficialSettings } from './globals/ArtOfficialSettings'
import { PrintSetConfig } from './globals/PrintSetConfig'

import { s3Storage } from '@payloadcms/storage-s3'

import { getCorsOrigins } from './lib/cors'
import { resolveMediaStorageUrl } from './lib/studio/fieldNoteLocalPaths'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

/** Origins allowed to call public REST/corpus APIs (ACH site, local ACH, etc.). */
const corsOrigins = getCorsOrigins()

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set in environment variables')
}

const payloadSecret = process.env.PAYLOAD_SECRET
if (!payloadSecret) {
  throw new Error('PAYLOAD_SECRET is not set in environment variables')
}

const databasePush = process.env.PAYLOAD_DATABASE_PUSH === 'true'
const isDevelopment = process.env.NODE_ENV === 'development'

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    components: {
      beforeNavLinks: [
        '/components/admin/ArtOfficialNavLink#ArtOfficialNavLink',
        '/components/admin/StudioNavLink#StudioNavLink',
        '/components/admin/UpdateAvailabilityNavLink#UpdateAvailabilityNavLink',
      ],
      beforeDashboard: [
        '/components/admin/ArtOfficialDashboardLink#ArtOfficialDashboardLink',
        '/components/admin/StudioDashboardLink#StudioDashboardLink',
      ],
      views: {
        artOfficial: {
          Component: '/components/admin/ArtOfficialView#ArtOfficialView',
          path: '/art-official',
          exact: true,
        },
        artOfficialAudit: {
          Component: '/components/admin/artOfficial/AuditView#AuditView',
          path: '/art-official/audit',
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
    PatternReports,
    Episodes,
    CapturePresets,
    FieldNotes,
    Campaigns,
    Themes,
    QueueItems,
    HashtagTags,
    CalendarDays,
    FinaleScripts,
    Segments,
    Shots,
    Takes,
    Tags,
    ArtHistoricalReferences,
    People,
    Events,
    ImageCaptureTechnologies,
    Artworks,
    DCSCapturePhotos,
    Triptychs,
    SmallPrints,
    Sessions,
  ],
  globals: [PrintSetConfig, ArtOfficialSettings],
  // Public catalogue reads for external sites (e.g. A Colorful History).
  // Access control still limits anonymous clients to published artist-catalogued works.
  cors: corsOrigins.length > 0 ? corsOrigins : undefined,
  csrf: corsOrigins.length > 0 ? corsOrigins : undefined,
  editor: lexicalEditor(),
  secret: payloadSecret,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: databaseUrl,
      // Schema push introspects hundreds of tables in parallel. A small pool +
      // short connect timeout causes "timeout exceeded when trying to connect".
      max: databasePush && isDevelopment ? 20 : isDevelopment ? 10 : 10,
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: databasePush && isDevelopment ? 60_000 : isDevelopment ? 60_000 : 30_000,
      allowExitOnIdle: isDevelopment,
    },
    /** Set `PAYLOAD_DATABASE_PUSH=true` locally to sync Drizzle schema without interactive migrate:create. */
    push: databasePush,
  }),
  sharp,
  plugins: [
    s3Storage({
      collections: {
        media: {
          generateFileURL: ({ filename }) => resolveMediaStorageUrl(filename),
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
