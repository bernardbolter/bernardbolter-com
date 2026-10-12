import path from 'node:path'

/** Artifact older than this is served with a loud stale warning (no live fallback). */
export const CORPUS_ARTIFACT_STALE_MS = 48 * 60 * 60 * 1000

export const CORPUS_ARTIFACT_STALE_HOURS = CORPUS_ARTIFACT_STALE_MS / 3600000

export const CORPUS_SUPERSEDES_NOTE =
  'Live per-record endpoints supersede this artifact when they disagree. This file is a nightly snapshot for triage and briefing; treat generated-at as the freshness bound.'

export function corpusArtifactDir(cwd: string = process.cwd()): string {
  return path.join(cwd, 'data', 'corpus')
}

export function corpusArtifactPath(cwd?: string): string {
  return path.join(corpusArtifactDir(cwd), 'corpus.json')
}

export function corpusBriefingPath(cwd?: string): string {
  return path.join(corpusArtifactDir(cwd), 'briefing.json')
}

export function corpusBuildReportPath(cwd?: string): string {
  return path.join(corpusArtifactDir(cwd), 'build-report.json')
}

export const CORPUS_R2_PREFIX = 'corpus'

export function corpusR2ObjectKey(
  filename: 'corpus.json' | 'briefing.json' | 'build-report.json' | 'contract.json' | 'protocol.txt',
): string {
  return `${CORPUS_R2_PREFIX}/${filename}`
}
