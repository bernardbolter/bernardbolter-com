import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { LayoutProviderData } from '@/lib/payload/layoutData'

export const DEV_CATALOGUE_SNAPSHOT_PATH = path.join(
  process.cwd(),
  '.cache',
  'catalogue-layout.json',
)

export type CatalogueSnapshotMode = 'off' | 'use' | 'refresh'

/**
 * Development only. Default is `use` (read the disk snapshot when present).
 * `CATALOGUE_SNAPSHOT=refresh` — hit Payload and rewrite the file.
 * `CATALOGUE_SNAPSHOT=live` — never read or write the file.
 */
export function catalogueSnapshotMode(): CatalogueSnapshotMode {
  if (process.env.NODE_ENV !== 'development') return 'off'
  const raw = process.env.CATALOGUE_SNAPSHOT?.trim().toLowerCase()
  if (raw === '0' || raw === 'off' || raw === 'live') return 'off'
  if (raw === 'refresh') return 'refresh'
  return 'use'
}

let parsed: LayoutProviderData | null = null

export function clearDevCatalogueSnapshotMemory(): void {
  parsed = null
}

export async function readDevCatalogueSnapshot(): Promise<LayoutProviderData | null> {
  if (parsed && parsed.artworks.length > 0) return parsed
  try {
    const raw = await readFile(DEV_CATALOGUE_SNAPSHOT_PATH, 'utf8')
    const data = JSON.parse(raw) as LayoutProviderData
    if (!Array.isArray(data.artworks) || data.artworks.length === 0) return null
    parsed = data
    return data
  } catch {
    return null
  }
}

export async function writeDevCatalogueSnapshot(data: LayoutProviderData): Promise<void> {
  if (data.artworks.length === 0) return
  await mkdir(path.dirname(DEV_CATALOGUE_SNAPSHOT_PATH), { recursive: true })
  await writeFile(DEV_CATALOGUE_SNAPSHOT_PATH, JSON.stringify(data), 'utf8')
  parsed = data
}
