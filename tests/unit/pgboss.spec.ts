import { beforeEach, describe, expect, it, vi } from 'vitest'

const { startMock, PgBossMock } = vi.hoisted(() => {
  const startMock = vi.fn(async () => undefined)
  const PgBossMock = vi.fn(function PgBossMock(this: { start: typeof startMock }) {
    this.start = startMock
  })
  return { startMock, PgBossMock }
})

vi.mock('pg-boss', () => ({
  PgBoss: PgBossMock,
}))

import {
  createBoss,
  getBoss,
  getBossConnectionString,
  PG_BOSS_SCHEMA,
  resetBossForTests,
} from '@/lib/queue/pgboss'

describe('pg-boss client', () => {
  beforeEach(() => {
    resetBossForTests()
    vi.clearAllMocks()
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test'
  })

  it('uses the pgboss schema and DATABASE_URL', () => {
    expect(getBossConnectionString()).toBe('postgresql://localhost:5432/test')
    createBoss()
    expect(PgBossMock).toHaveBeenCalledWith({
      connectionString: 'postgresql://localhost:5432/test',
      schema: PG_BOSS_SCHEMA,
    })
  })

  it('starts pg-boss only once for repeated getBoss calls', async () => {
    await getBoss()
    await getBoss()
    expect(startMock).toHaveBeenCalledTimes(1)
    expect(PgBossMock).toHaveBeenCalledTimes(1)
  })
})
