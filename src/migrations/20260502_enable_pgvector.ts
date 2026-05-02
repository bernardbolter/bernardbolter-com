import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector;`)
  await db.execute(sql`
    ALTER TABLE "artworks" ADD COLUMN IF NOT EXISTS "clip_embedding" vector(1536);
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "artworks_clip_embedding_idx"
    ON "artworks" USING hnsw ("clip_embedding" vector_cosine_ops);
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP INDEX IF EXISTS "artworks_clip_embedding_idx";`)
  await db.execute(sql`ALTER TABLE "artworks" DROP COLUMN IF EXISTS "clip_embedding";`)
}
