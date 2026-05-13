import type { Payload } from 'payload'
import type { Pool } from 'pg'

export function getPool(payload: Payload): Pool {
  const pool = (payload.db as unknown as { pool?: Pool }).pool
  if (!pool) {
    throw new Error('Postgres pool is not available on payload.db')
  }
  return pool
}
