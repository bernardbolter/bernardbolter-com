import { readFile } from 'node:fs/promises'

import {
  corpusArtifactPath,
  corpusBriefingPath,
  corpusBuildReportPath,
  corpusR2ObjectKey,
} from '@/lib/corpus/artifact/paths'
import { putBufferToR2 } from '@/lib/studio/r2'

export async function uploadCorpusArtifactToR2(cwd?: string): Promise<{
  ok: boolean
  keys: string[]
  error?: string
}> {
  const keys = [
    corpusR2ObjectKey('corpus.json'),
    corpusR2ObjectKey('briefing.json'),
    corpusR2ObjectKey('build-report.json'),
  ] as const

  try {
    const [corpus, briefing, report] = await Promise.all([
      readFile(corpusArtifactPath(cwd)),
      readFile(corpusBriefingPath(cwd)),
      readFile(corpusBuildReportPath(cwd)),
    ])

    await putBufferToR2(keys[0], corpus, 'application/json; charset=utf-8')
    await putBufferToR2(keys[1], briefing, 'application/json; charset=utf-8')
    await putBufferToR2(keys[2], report, 'application/json; charset=utf-8')

    return { ok: true, keys: [...keys] }
  } catch (error) {
    return {
      ok: false,
      keys: [...keys],
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
