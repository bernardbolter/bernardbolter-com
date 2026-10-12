import { readFile } from 'node:fs/promises'

import {
  artOfficialContractPath,
  artOfficialProtocolPath,
} from '@/lib/artOfficial/contract/paths'
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
    corpusR2ObjectKey('contract.json'),
    corpusR2ObjectKey('protocol.txt'),
  ] as const

  try {
    const [corpus, briefing, report, contract, protocol] = await Promise.all([
      readFile(corpusArtifactPath(cwd)),
      readFile(corpusBriefingPath(cwd)),
      readFile(corpusBuildReportPath(cwd)),
      readFile(artOfficialContractPath(cwd)),
      readFile(artOfficialProtocolPath(cwd)),
    ])

    await putBufferToR2(keys[0], corpus, 'application/json; charset=utf-8')
    await putBufferToR2(keys[1], briefing, 'application/json; charset=utf-8')
    await putBufferToR2(keys[2], report, 'application/json; charset=utf-8')
    await putBufferToR2(keys[3], contract, 'application/json; charset=utf-8')
    await putBufferToR2(keys[4], protocol, 'text/plain; charset=utf-8')

    return { ok: true, keys: [...keys] }
  } catch (error) {
    return {
      ok: false,
      keys: [...keys],
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
