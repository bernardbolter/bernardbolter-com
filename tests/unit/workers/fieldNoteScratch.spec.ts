import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import {
  createFieldNoteScratchDir,
  getFieldNoteScratchBaseDir,
  removeScratchDir,
} from '@/lib/workers/fieldNoteScratch'

describe('fieldNoteScratch', () => {
  const createdDirs: string[] = []

  afterEach(async () => {
    for (const dir of createdDirs.splice(0)) {
      await removeScratchDir(dir)
    }
  })

  it('creates nested scratch dir under base', async () => {
    const previous = process.env.FIELDNOTE_SCRATCH_DIR
    const base = await fs.mkdtemp(path.join(os.tmpdir(), 'fn-scratch-base-'))
    process.env.FIELDNOTE_SCRATCH_DIR = base

    try {
      expect(getFieldNoteScratchBaseDir()).toBe(base)
      const dir = await createFieldNoteScratchDir(42)
      createdDirs.push(dir)

      expect(dir.startsWith(path.join(base, '42'))).toBe(true)
      await fs.access(dir)
    } finally {
      if (previous) process.env.FIELDNOTE_SCRATCH_DIR = previous
      else delete process.env.FIELDNOTE_SCRATCH_DIR
      await fs.rm(base, { recursive: true, force: true })
    }
  })
})
