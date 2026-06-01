import { readFileSync, existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import type { WpLegacyArtworkNode } from './legacyTypes'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const DEFAULT_DUMP_PATH = path.resolve(dirname, '../../../data/legacy/wp-artworks.json')

let cachedNodes: WpLegacyArtworkNode[] | null = null
let cachedPath: string | null = null

export function legacyDumpPath(): string {
  return process.env.LEGACY_WP_ARTWORKS_PATH ?? DEFAULT_DUMP_PATH
}

export function resetLegacyDumpCache(): void {
  cachedNodes = null
  cachedPath = null
}

/** Load raw WP nodes from the local dump. Returns [] when the file is missing. */
export function loadLegacyDump(filePath = legacyDumpPath()): WpLegacyArtworkNode[] {
  if (cachedNodes && cachedPath === filePath) {
    return cachedNodes
  }

  if (!existsSync(filePath)) {
    cachedNodes = []
    cachedPath = filePath
    return cachedNodes
  }

  try {
    const raw = readFileSync(filePath, 'utf8')
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      cachedNodes = []
      cachedPath = filePath
      return cachedNodes
    }
    cachedNodes = parsed as WpLegacyArtworkNode[]
    cachedPath = filePath
    return cachedNodes
  } catch {
    cachedNodes = []
    cachedPath = filePath
    return cachedNodes
  }
}

export function legacyDumpAvailable(filePath = legacyDumpPath()): boolean {
  return existsSync(filePath) && loadLegacyDump(filePath).length > 0
}
