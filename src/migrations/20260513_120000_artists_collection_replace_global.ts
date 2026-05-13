import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Replaces the `artist` global with the `artists` collection (single row for Bernard).
 * DDL matches `payload generate:db-schema` output for this project.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_artists_actor_roles" AS ENUM ('artist', 'collector', 'gallery');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `)
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_artists_external_identifiers_type" AS ENUM (
        'website', 'instagram', 'artnet', 'wikidata', 'json-ld', 'google-knowledge-graph'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `)
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_artists_career_stage" AS ENUM ('studio', 'market', 'institutional');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `)
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_artists_primary_actor_type" AS ENUM (
        'artist', 'collector', 'gallery',
        'artist-collector', 'artist-gallery', 'artist-collector-gallery'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `)

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "artists" (
      "id" serial PRIMARY KEY NOT NULL,
      "name" varchar DEFAULT 'Bernard Bolter' NOT NULL,
      "generate_slug" boolean DEFAULT true,
      "slug" varchar NOT NULL,
      "career_stage" "enum_artists_career_stage" DEFAULT 'studio',
      "primary_actor_type" "enum_artists_primary_actor_type",
      "platform_join_date" timestamp(3) with time zone,
      "ulan_uri" varchar,
      "wikidata_uri" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `)
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "artists_slug_idx" ON "artists" USING btree ("slug");
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "artists_updated_at_idx" ON "artists" USING btree ("updated_at");
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "artists_created_at_idx" ON "artists" USING btree ("created_at");
  `)

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "artists_locales" (
      "id" serial PRIMARY KEY NOT NULL,
      "bio" jsonb,
      "statement" jsonb,
      "_locale" "enum__locales" NOT NULL,
      "_parent_id" integer NOT NULL,
      CONSTRAINT "artists_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."artists"("id")
        ON DELETE cascade ON UPDATE no action
    );
  `)
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "artists_locales_locale_parent_id_unique"
      ON "artists_locales" USING btree ("_locale","_parent_id");
  `)

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "artists_actor_roles" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer NOT NULL,
      "parent_id" integer NOT NULL,
      "value" "enum_artists_actor_roles",
      CONSTRAINT "artists_actor_roles_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."artists"("id")
        ON DELETE cascade ON UPDATE no action
    );
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "artists_actor_roles_order_idx" ON "artists_actor_roles" USING btree ("order");
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "artists_actor_roles_parent_idx" ON "artists_actor_roles" USING btree ("parent_id");
  `)

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "artists_external_identifiers" (
      "id" varchar PRIMARY KEY NOT NULL,
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "type" "enum_artists_external_identifiers_type" NOT NULL,
      "value" varchar NOT NULL,
      "verified" boolean DEFAULT false,
      CONSTRAINT "artists_external_identifiers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."artists"("id")
        ON DELETE cascade ON UPDATE no action
    );
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "artists_external_identifiers_order_idx" ON "artists_external_identifiers" USING btree ("_order");
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "artists_external_identifiers_parent_id_idx" ON "artists_external_identifiers" USING btree ("_parent_id");
  `)

  // Copy from legacy global `artist` when present and `artists` is still empty
  await db.execute(sql`
    INSERT INTO "artists" (
      "name", "generate_slug", "slug", "career_stage", "ulan_uri", "wikidata_uri",
      "platform_join_date", "updated_at", "created_at"
    )
    SELECT
      COALESCE(a."name", 'Bernard Bolter'),
      true,
      'bernard-bolter',
      'studio'::"enum_artists_career_stage",
      a."ulan_uri",
      a."wikidata_uri",
      now(),
      COALESCE(a."updated_at", now()),
      COALESCE(a."created_at", now())
    FROM "artist" a
    WHERE EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'artist'
    )
    AND NOT EXISTS (SELECT 1 FROM "artists")
    LIMIT 1;
  `)

  await db.execute(sql`
    INSERT INTO "artists_locales" ("bio", "statement", "_locale", "_parent_id")
    SELECT al."bio", al."statement", al."_locale", ar."id"
    FROM "artist_locales" al
    CROSS JOIN (SELECT "id" FROM "artists" ORDER BY "id" ASC LIMIT 1) ar
    WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'artist_locales')
      AND EXISTS (SELECT 1 FROM "artists")
      AND al."_parent_id" = (SELECT "id" FROM "artist" ORDER BY "id" ASC LIMIT 1)
      AND NOT EXISTS (SELECT 1 FROM "artists_locales");
  `)

  await db.execute(sql`
    INSERT INTO "artists_actor_roles" ("order", "parent_id", "value")
    SELECT 1, ar."id", 'artist'::"enum_artists_actor_roles"
    FROM (SELECT "id" FROM "artists" ORDER BY "id" ASC LIMIT 1) ar
    WHERE NOT EXISTS (SELECT 1 FROM "artists_actor_roles" WHERE "parent_id" = ar."id");
  `)

  await db.execute(sql`
    INSERT INTO "artists" (
      "name", "generate_slug", "slug", "career_stage", "platform_join_date", "updated_at", "created_at"
    )
    SELECT 'Bernard Bolter', true, 'bernard-bolter', 'studio'::"enum_artists_career_stage", now(), now(), now()
    WHERE NOT EXISTS (SELECT 1 FROM "artists");
  `)

  await db.execute(sql`
    INSERT INTO "artists_actor_roles" ("order", "parent_id", "value")
    SELECT 1, ar."id", 'artist'::"enum_artists_actor_roles"
    FROM (SELECT "id" FROM "artists" ORDER BY "id" ASC LIMIT 1) ar
    WHERE NOT EXISTS (SELECT 1 FROM "artists_actor_roles" WHERE "parent_id" = ar."id");
  `)

  await db.execute(sql`DROP TABLE IF EXISTS "artist_locales" CASCADE;`)
  await db.execute(sql`DROP TABLE IF EXISTS "artist" CASCADE;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "artists_external_identifiers" CASCADE;`)
  await db.execute(sql`DROP TABLE IF EXISTS "artists_actor_roles" CASCADE;`)
  await db.execute(sql`DROP TABLE IF EXISTS "artists_locales" CASCADE;`)
  await db.execute(sql`DROP TABLE IF EXISTS "artists" CASCADE;`)
  await db.execute(sql`DROP TYPE IF EXISTS "enum_artists_external_identifiers_type";`)
  await db.execute(sql`DROP TYPE IF EXISTS "enum_artists_actor_roles";`)
  await db.execute(sql`DROP TYPE IF EXISTS "enum_artists_primary_actor_type";`)
  await db.execute(sql`DROP TYPE IF EXISTS "enum_artists_career_stage";`)
}
