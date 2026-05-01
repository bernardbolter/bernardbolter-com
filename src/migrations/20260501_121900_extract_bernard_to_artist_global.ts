import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    INSERT INTO "artist" ("name")
    SELECT "name"
    FROM "people"
    WHERE "id" = (
      SELECT "id"
      FROM "people"
      WHERE "id" IN (
        SELECT "parent_id"
        FROM "people_role"
        WHERE "value" = 'artist'
      )
      ORDER BY "id" ASC
      LIMIT 1
    )
    ON CONFLICT DO NOTHING;
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DELETE FROM "artist"
    WHERE "name" IN (
      SELECT "name"
      FROM "people"
      WHERE "id" IN (
        SELECT "parent_id"
        FROM "people_role"
        WHERE "value" = 'artist'
      )
    );
  `)
}
