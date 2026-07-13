import { PgBoss } from 'pg-boss'

import { JOB_NAMES } from '@/lib/queue/jobs'

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

function attachBossErrorHandler(boss: PgBoss): void {
  boss.on('error', (error) => {
    console.error('[pg-boss] error', error)
  })
}

/** pg-boss v12 requires queues to exist before boss.work() — send() alone does not create them. */
export async function ensureBossQueues(boss: PgBoss): Promise<void> {
  for (const name of Object.values(JOB_NAMES)) {
    const existing = await boss.getQueue(name)
    if (!existing) {
      await boss.createQueue(name)
      console.info(`[pg-boss] created queue ${name}`)
    }
  }
}

/** Singleton pg-boss instance; starts once and reuses across API routes / workers. */
export async function getBoss(): Promise<PgBoss> {
  if (bossInstance) {
    return bossInstance
  }

  if (!bossStartPromise) {
    bossStartPromise = (async () => {
      const boss = createBoss()
      attachBossErrorHandler(boss)
      await boss.start()
      await ensureBossQueues(boss)
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
