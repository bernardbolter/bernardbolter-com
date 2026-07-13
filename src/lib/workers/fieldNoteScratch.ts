import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

export function getFieldNoteScratchBaseDir(): string {
  return process.env.FIELDNOTE_SCRATCH_DIR || path.join(os.tmpdir(), 'fieldnotes')
}

/** Create an isolated scratch directory for one pipeline run. */
export async function createFieldNoteScratchDir(fieldNoteId: number): Promise<string> {
  const dir = path.join(getFieldNoteScratchBaseDir(), String(fieldNoteId), String(Date.now()))
  await fs.mkdir(dir, { recursive: true })
  return dir
}

export async function removeScratchDir(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true })
}
