import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "artworks_locales" RENAME COLUMN "name" TO "title";

    ALTER TABLE "artworks" ADD COLUMN "year_created" integer;
    ALTER TABLE "artworks" ADD COLUMN "year_completed" integer;

    UPDATE "artworks"
    SET "year_created" = EXTRACT(YEAR FROM "date_created")::integer
    WHERE "date_created" IS NOT NULL AND "year_created" IS NULL;

    ALTER TABLE "artworks" ADD COLUMN "width_whole" integer;
    ALTER TABLE "artworks" ADD COLUMN "width_fraction" varchar;
    ALTER TABLE "artworks" ADD COLUMN "height_whole" integer;
    ALTER TABLE "artworks" ADD COLUMN "height_fraction" varchar;
    ALTER TABLE "artworks" ADD COLUMN "depth_whole" integer;
    ALTER TABLE "artworks" ADD COLUMN "depth_fraction" varchar;
    ALTER TABLE "artworks" ADD COLUMN "width_mm" numeric;
    ALTER TABLE "artworks" ADD COLUMN "height_mm" numeric;
    ALTER TABLE "artworks" ADD COLUMN "depth_mm" numeric;
    ALTER TABLE "artworks" ADD COLUMN "dimensions_display" varchar;
    ALTER TABLE "artworks" ADD COLUMN "aspect_ratio" numeric;
    ALTER TABLE "artworks" ADD COLUMN "size_tier" varchar;

    UPDATE "artworks"
    SET
      "width_whole" = CASE WHEN "dimensions_width" IS NOT NULL THEN FLOOR("dimensions_width")::integer ELSE NULL END,
      "height_whole" = CASE WHEN "dimensions_height" IS NOT NULL THEN FLOOR("dimensions_height")::integer ELSE NULL END,
      "depth_whole" = CASE WHEN "dimensions_depth" IS NOT NULL THEN FLOOR("dimensions_depth")::integer ELSE NULL END,
      "width_mm" = CASE
        WHEN "dimensions_width" IS NULL THEN NULL
        WHEN "dimensions_unit_code" = 'CMT' THEN "dimensions_width" * 10
        WHEN "dimensions_unit_code" = 'MMT' THEN "dimensions_width"
        WHEN "dimensions_unit_code" = 'MTR' THEN "dimensions_width" * 1000
        WHEN "dimensions_unit_code" = 'INH' THEN "dimensions_width" * 25.4
        ELSE "dimensions_width" * 10
      END,
      "height_mm" = CASE
        WHEN "dimensions_height" IS NULL THEN NULL
        WHEN "dimensions_unit_code" = 'CMT' THEN "dimensions_height" * 10
        WHEN "dimensions_unit_code" = 'MMT' THEN "dimensions_height"
        WHEN "dimensions_unit_code" = 'MTR' THEN "dimensions_height" * 1000
        WHEN "dimensions_unit_code" = 'INH' THEN "dimensions_height" * 25.4
        ELSE "dimensions_height" * 10
      END,
      "depth_mm" = CASE
        WHEN "dimensions_depth" IS NULL THEN NULL
        WHEN "dimensions_unit_code" = 'CMT' THEN "dimensions_depth" * 10
        WHEN "dimensions_unit_code" = 'MMT' THEN "dimensions_depth"
        WHEN "dimensions_unit_code" = 'MTR' THEN "dimensions_depth" * 1000
        WHEN "dimensions_unit_code" = 'INH' THEN "dimensions_depth" * 25.4
        ELSE "dimensions_depth" * 10
      END;

    UPDATE "artworks"
    SET "aspect_ratio" = ("width_mm" / NULLIF("height_mm", 0))
    WHERE "width_mm" IS NOT NULL AND "height_mm" IS NOT NULL;

    ALTER TABLE "artworks_locales" ADD COLUMN "description_short" varchar;
    ALTER TABLE "artworks_locales" ADD COLUMN "description_long" jsonb;

    UPDATE "artworks_locales"
    SET "description_long" = "description"
    WHERE "description" IS NOT NULL AND "description_long" IS NULL;
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "artworks_locales" DROP COLUMN IF EXISTS "description_long";
    ALTER TABLE "artworks_locales" DROP COLUMN IF EXISTS "description_short";
    ALTER TABLE "artworks" DROP COLUMN IF EXISTS "size_tier";
    ALTER TABLE "artworks" DROP COLUMN IF EXISTS "aspect_ratio";
    ALTER TABLE "artworks" DROP COLUMN IF EXISTS "dimensions_display";
    ALTER TABLE "artworks" DROP COLUMN IF EXISTS "depth_mm";
    ALTER TABLE "artworks" DROP COLUMN IF EXISTS "height_mm";
    ALTER TABLE "artworks" DROP COLUMN IF EXISTS "width_mm";
    ALTER TABLE "artworks" DROP COLUMN IF EXISTS "depth_fraction";
    ALTER TABLE "artworks" DROP COLUMN IF EXISTS "depth_whole";
    ALTER TABLE "artworks" DROP COLUMN IF EXISTS "height_fraction";
    ALTER TABLE "artworks" DROP COLUMN IF EXISTS "height_whole";
    ALTER TABLE "artworks" DROP COLUMN IF EXISTS "width_fraction";
    ALTER TABLE "artworks" DROP COLUMN IF EXISTS "width_whole";
    ALTER TABLE "artworks" DROP COLUMN IF EXISTS "year_completed";
    ALTER TABLE "artworks" DROP COLUMN IF EXISTS "year_created";
    ALTER TABLE "artworks_locales" RENAME COLUMN "title" TO "name";
  `)
}
