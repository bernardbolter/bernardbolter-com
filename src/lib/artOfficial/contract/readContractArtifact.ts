import { readFile } from 'node:fs/promises'

import { buildArtOfficialContract } from '@/lib/artOfficial/contract/buildContractArtifact'
import {
  artOfficialContractPath,
  artOfficialProtocolPath,
} from '@/lib/artOfficial/contract/paths'
import type { ArtOfficialContract } from '@/lib/artOfficial/contract/types'
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

/** Prefer nightly artifact; fall back to live build so the page never goes blank mid-migration. */
export async function loadArtOfficialContractForPage(
  cwd?: string,
): Promise<ArtOfficialContract> {
  const fromDisk = await readArtOfficialContract(cwd)
  if (fromDisk) return fromDisk
  return buildArtOfficialContract()
}

export async function loadArtOfficialProtocolText(cwd?: string): Promise<string> {
  try {
    const raw = await readFile(artOfficialProtocolPath(cwd), 'utf8')
    if (raw.trim()) return raw
  } catch {
    // fall through
  }
  return getArtOfficialProtocolDocument().text
}
