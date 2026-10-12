import { readFile, stat } from 'node:fs/promises'

import {
  CORPUS_ARTIFACT_STALE_MS,
  corpusArtifactPath,
  corpusBriefingPath,
  corpusBuildReportPath,
} from '@/lib/corpus/artifact/paths'
import type {
  ArtifactReadMeta,
  CorpusArtifact,
  CorpusBriefing,
  CorpusBuildReport,
} from '@/lib/corpus/artifact/types'

type CacheEntry<T> = {
  mtimeMs: number
  value: T
}

let artifactCache: CacheEntry<CorpusArtifact> | null = null
let briefingCache: CacheEntry<CorpusBriefing> | null = null

function logArtifactIssue(level: 'error' | 'warn', message: string): void {
  const line = `[corpus-artifact] ${message}`
  if (level === 'error') console.error(line)
  else console.warn(line)
}

export function artifactReadMetaFromGeneratedAt(
  generatedAt: string,
  path: string,
  mtimeMs: number,
): ArtifactReadMeta {
  const generatedMs = Date.parse(generatedAt)
  const ageMs = Number.isFinite(generatedMs) ? Math.max(0, Date.now() - generatedMs) : Number.POSITIVE_INFINITY
  const stale = !Number.isFinite(generatedMs) || ageMs > CORPUS_ARTIFACT_STALE_MS
  return { path, generatedAt, ageMs, stale, mtimeMs }
}

/**
 * Read the nightly corpus artifact from disk.
 * Missing / unparseable → null (callers return 503).
 * Older than 48h → still returned; logs loudly. No live Payload fallback.
 */
export async function readCorpusArtifact(
  cwd?: string,
): Promise<{ artifact: CorpusArtifact; meta: ArtifactReadMeta } | null> {
  const path = corpusArtifactPath(cwd)
  try {
    const info = await stat(path)
    if (artifactCache && artifactCache.mtimeMs === info.mtimeMs) {
      const meta = artifactReadMetaFromGeneratedAt(
        artifactCache.value['art-official:generatedAt'],
        path,
        info.mtimeMs,
      )
      if (meta.stale) {
        logArtifactIssue(
          'error',
          `STALE artifact served ageHours=${(meta.ageMs / 3600000).toFixed(1)} generatedAt=${meta.generatedAt} path=${path}`,
        )
      }
      return { artifact: artifactCache.value, meta }
    }

    const raw = await readFile(path, 'utf8')
    const artifact = JSON.parse(raw) as CorpusArtifact
    if (!artifact || typeof artifact !== 'object' || !Array.isArray(artifact.works)) {
      logArtifactIssue('error', `UNPARSEABLE artifact (missing works[]) path=${path}`)
      return null
    }
    if (typeof artifact['art-official:generatedAt'] !== 'string') {
      logArtifactIssue('error', `UNPARSEABLE artifact (missing generatedAt) path=${path}`)
      return null
    }

    artifactCache = { mtimeMs: info.mtimeMs, value: artifact }
    const meta = artifactReadMetaFromGeneratedAt(
      artifact['art-official:generatedAt'],
      path,
      info.mtimeMs,
    )
    if (meta.stale) {
      logArtifactIssue(
        'error',
        `STALE artifact served ageHours=${(meta.ageMs / 3600000).toFixed(1)} generatedAt=${meta.generatedAt} path=${path}`,
      )
    }
    return { artifact, meta }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code
    if (code === 'ENOENT') {
      logArtifactIssue('error', `MISSING artifact path=${path}`)
    } else {
      logArtifactIssue(
        'error',
        `UNPARSEABLE/UNREADABLE artifact path=${path} error=${error instanceof Error ? error.message : String(error)}`,
      )
    }
    return null
  }
}

export async function readCorpusBriefing(
  cwd?: string,
): Promise<{ briefing: CorpusBriefing; meta: ArtifactReadMeta } | null> {
  const path = corpusBriefingPath(cwd)
  try {
    const info = await stat(path)
    if (briefingCache && briefingCache.mtimeMs === info.mtimeMs) {
      const meta = artifactReadMetaFromGeneratedAt(
        briefingCache.value['art-official:generatedAt'],
        path,
        info.mtimeMs,
      )
      if (meta.stale) {
        logArtifactIssue(
          'error',
          `STALE briefing served ageHours=${(meta.ageMs / 3600000).toFixed(1)} generatedAt=${meta.generatedAt}`,
        )
      }
      return { briefing: briefingCache.value, meta }
    }

    const raw = await readFile(path, 'utf8')
    const briefing = JSON.parse(raw) as CorpusBriefing
    if (!briefing || typeof briefing !== 'object' || !Array.isArray(briefing.works)) {
      logArtifactIssue('error', `UNPARSEABLE briefing path=${path}`)
      return null
    }
    briefingCache = { mtimeMs: info.mtimeMs, value: briefing }
    const meta = artifactReadMetaFromGeneratedAt(
      briefing['art-official:generatedAt'],
      path,
      info.mtimeMs,
    )
    if (meta.stale) {
      logArtifactIssue(
        'error',
        `STALE briefing served ageHours=${(meta.ageMs / 3600000).toFixed(1)} generatedAt=${meta.generatedAt}`,
      )
    }
    return { briefing, meta }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code
    if (code === 'ENOENT') {
      logArtifactIssue('error', `MISSING briefing path=${path}`)
    } else {
      logArtifactIssue(
        'error',
        `UNREADABLE briefing path=${path} error=${error instanceof Error ? error.message : String(error)}`,
      )
    }
    return null
  }
}

export async function readCorpusBuildReport(cwd?: string): Promise<CorpusBuildReport | null> {
  try {
    const raw = await readFile(corpusBuildReportPath(cwd), 'utf8')
    return JSON.parse(raw) as CorpusBuildReport
  } catch {
    return null
  }
}

/** Test helper — clear in-process caches. */
export function clearCorpusArtifactCaches(): void {
  artifactCache = null
  briefingCache = null
}

export function artifactResponseHeaders(
  base: Record<string, string>,
  meta: ArtifactReadMeta,
): Record<string, string> {
  const headers: Record<string, string> = {
    ...base,
    'X-Corpus-Generated-At': meta.generatedAt,
    'X-Corpus-Artifact-Age-Hours': (meta.ageMs / 3600000).toFixed(2),
  }
  if (meta.stale) {
    headers['X-Corpus-Artifact-Stale'] = 'true'
    headers.Warning = `110 - "corpus artifact stale (>${CORPUS_ARTIFACT_STALE_MS / 3600000}h)"`
  }
  return headers
}
