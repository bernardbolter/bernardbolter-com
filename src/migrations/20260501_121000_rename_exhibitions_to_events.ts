import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "exhibitions" RENAME TO "events";
    ALTER TABLE "exhibitions_locales" RENAME TO "events_locales";
    ALTER TABLE "exhibitions_rels" RENAME TO "events_rels";
    ALTER TABLE "artworks_rels" RENAME COLUMN "exhibitions_id" TO "events_id";
    ALTER TABLE "payload_locked_documents_rels" RENAME COLUMN "exhibitions_id" TO "events_id";

    ALTER TABLE "events" ADD COLUMN "event_type" varchar NOT NULL DEFAULT 'group-exhibition';
    ALTER TABLE "events" ADD COLUMN "cv_section" varchar;
    UPDATE "events"
    SET "cv_section" = 'group-exhibitions'
    WHERE "cv_section" IS NULL;

    ALTER TABLE "artworks_rels" DROP CONSTRAINT IF EXISTS "artworks_rels_exhibitions_fk";
    ALTER TABLE "artworks_rels"
      ADD CONSTRAINT "artworks_rels_events_fk"
      FOREIGN KEY ("events_id") REFERENCES "public"."events"("id")
      ON DELETE cascade ON UPDATE no action;

    ALTER TABLE "events_rels" DROP CONSTRAINT IF EXISTS "exhibitions_rels_parent_fk";
    ALTER TABLE "events_rels"
      ADD CONSTRAINT "events_rels_parent_fk"
      FOREIGN KEY ("parent_id") REFERENCES "public"."events"("id")
      ON DELETE cascade ON UPDATE no action;
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "events_rels" DROP CONSTRAINT IF EXISTS "events_rels_parent_fk";
    ALTER TABLE "events_rels"
      ADD CONSTRAINT "exhibitions_rels_parent_fk"
      FOREIGN KEY ("parent_id") REFERENCES "public"."exhibitions"("id")
      ON DELETE cascade ON UPDATE no action;

    ALTER TABLE "artworks_rels" DROP CONSTRAINT IF EXISTS "artworks_rels_events_fk";
    ALTER TABLE "artworks_rels"
      ADD CONSTRAINT "artworks_rels_exhibitions_fk"
      FOREIGN KEY ("exhibitions_id") REFERENCES "public"."exhibitions"("id")
      ON DELETE cascade ON UPDATE no action;

    ALTER TABLE "events" DROP COLUMN IF EXISTS "cv_section";
    ALTER TABLE "events" DROP COLUMN IF EXISTS "event_type";

    ALTER TABLE "payload_locked_documents_rels" RENAME COLUMN "events_id" TO "exhibitions_id";
    ALTER TABLE "artworks_rels" RENAME COLUMN "events_id" TO "exhibitions_id";
    ALTER TABLE "events_rels" RENAME TO "exhibitions_rels";
    ALTER TABLE "events_locales" RENAME TO "exhibitions_locales";
    ALTER TABLE "events" RENAME TO "exhibitions";
  `)
}
