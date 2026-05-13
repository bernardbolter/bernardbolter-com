import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/** Adds `first_mention_date` to `artists` when upgrading from the initial artists migration. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "first_mention_date" timestamp(3) with time zone;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "artists" DROP COLUMN IF EXISTS "first_mention_date";`)
}
