import path from 'node:path'

import { corpusArtifactDir } from '@/lib/corpus/artifact/paths'

export function artOfficialContractPath(cwd?: string): string {
  return path.join(corpusArtifactDir(cwd), 'contract.json')
}

export function artOfficialProtocolPath(cwd?: string): string {
  return path.join(corpusArtifactDir(cwd), 'protocol.txt')
}
