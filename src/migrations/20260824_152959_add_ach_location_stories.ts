import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
 ALTER TABLE "artworks" ADD COLUMN "ach_hero_hero_eligible" boolean DEFAULT false;
ALTER TABLE "artworks" ADD COLUMN "ach_hero_hero_fields" jsonb;
ALTER TABLE "artworks" ADD COLUMN "ach_hero_hero_photo_id" integer;
ALTER TABLE "artworks_locales" ADD COLUMN "ach_location_older_story" jsonb;
ALTER TABLE "artworks_locales" ADD COLUMN "ach_location_newer_story" jsonb;
ALTER TABLE "artworks" ADD CONSTRAINT "artworks_ach_hero_hero_photo_id_media_id_fk" FOREIGN KEY ("ach_hero_hero_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
CREATE INDEX "artworks_ach_hero_ach_hero_hero_photo_idx" ON "artworks" USING btree ("ach_hero_hero_photo_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
 ALTER TABLE "artworks" DROP CONSTRAINT "artworks_ach_hero_hero_photo_id_media_id_fk";

DROP INDEX "artworks_ach_hero_ach_hero_hero_photo_idx";
ALTER TABLE "artworks" DROP COLUMN "ach_hero_hero_eligible";
ALTER TABLE "artworks" DROP COLUMN "ach_hero_hero_fields";
ALTER TABLE "artworks" DROP COLUMN "ach_hero_hero_photo_id";
ALTER TABLE "artworks_locales" DROP COLUMN "ach_location_older_story";
ALTER TABLE "artworks_locales" DROP COLUMN "ach_location_newer_story";`)
}
