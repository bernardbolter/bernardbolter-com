import { readFile } from 'node:fs/promises'

import { buildArtOfficialContract } from '@/lib/artOfficial/contract/buildContractArtifact'
import {
  artOfficialContractPath,
  artOfficialProtocolPath,
} from '@/lib/artOfficial/contract/paths'
import type { ArtOfficialContract } from '@/lib/artOfficial/contract/types'
import {
  ART_OFFICIAL_CONTRACT_VERSION,
  ART_OFFICIAL_PROTOCOL_VERSION,
} from '@/lib/artOfficial/contract/versions'
import { getArtOfficialProtocolDocument } from '@/lib/artOfficial/protocol/protocolDocument'

export async function readArtOfficialContract(
  cwd?: string,
): Promise<ArtOfficialContract | null> {
  try {
    const raw = await readFile(artOfficialContractPath(cwd), 'utf8')
    return JSON.parse(raw) as ArtOfficialContract
  } catch {
    return null
  }
}

/**
 * Prefer nightly artifact when it matches the live contract version.
 * After an importer/contract deploy, fall back to a live build so the page
 * cannot disagree with Zod until the next corpus:build writes a fresh artifact.
 */
export async function loadArtOfficialContractForPage(
  cwd?: string,
): Promise<ArtOfficialContract> {
  const fromDisk = await readArtOfficialContract(cwd)
  if (
    fromDisk &&
    fromDisk['art-official:contractVersion'] === ART_OFFICIAL_CONTRACT_VERSION
  ) {
    return fromDisk
  }
  return buildArtOfficialContract()
}

export async function loadArtOfficialProtocolText(cwd?: string): Promise<string> {
  const live = getArtOfficialProtocolDocument().text
  try {
    const raw = await readFile(artOfficialProtocolPath(cwd), 'utf8')
    if (raw.trim() && raw.includes(`v${ART_OFFICIAL_PROTOCOL_VERSION}`)) {
      return raw
    }
  } catch {
    // fall through
  }
  return live
}
