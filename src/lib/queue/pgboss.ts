import { PgBoss } from 'pg-boss'

/** pg-boss schema (default); kept separate from Payload `public` tables. */
export const PG_BOSS_SCHEMA = 'pgboss'

let bossInstance: PgBoss | null = null
let bossStartPromise: Promise<PgBoss> | null = null

export function getBossConnectionString(): string {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set')
  }
  return connectionString
}

export function createBoss(): PgBoss {
  return new PgBoss({
    connectionString: getBossConnectionString(),
    schema: PG_BOSS_SCHEMA,
  })
}

/** Singleton pg-boss instance; starts once and reuses across API routes / workers. */
export async function getBoss(): Promise<PgBoss> {
  if (bossInstance) {
    return bossInstance
  }

  if (!bossStartPromise) {
    bossStartPromise = (async () => {
      const boss = createBoss()
      await boss.start()
      bossInstance = boss
      return boss
    })()
  }

  return bossStartPromise
}

/** Test-only: reset singleton between unit tests. */
export function resetBossForTests(): void {
  bossInstance = null
  bossStartPromise = null
}
