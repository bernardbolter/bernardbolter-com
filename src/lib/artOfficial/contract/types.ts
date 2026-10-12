export type ContractFieldRow = {
  name: string
  type: string
  required: boolean
  enumValues: string[] | null
  readOnly: boolean
  agentWritable: boolean
  notes: string
}

export type ContractRejection = {
  keyOrField: string
  where: string
  why: string
  behaviour: 'hard-reject' | 'strip-with-warning' | 'silent-drop'
}

export type ArtOfficialContract = {
  'art-official:contractVersion': string
  'art-official:protocolVersion': string
  'art-official:generatedAt': string
  'art-official:supersedesNote': string
  title: string
  endpoints: Array<{ method: string; path: string; role: string }>
  envelope: {
    topLevel: ContractFieldRow[]
    collections: Array<{
      collection: string
      operation: string
      topLevelKeys: ContractFieldRow[]
      fields: ContractFieldRow[]
    }>
    sessionTypeMap: Record<string, string>
  }
  visionImport: {
    key: string
    notKey: string
    entryFields: string[]
  }
  artworkForbidden: string[]
  artworkForbiddenNotes: string[]
  artworkAllowedProvenance: string[]
  artHistoricalReferencesShape: string
  rejections: ContractRejection[]
  workedExampleEnvelope: Record<string, unknown>
  reasoningStatusNote: string
  coverageNote: string
}

export type EnvelopeDryRunResult = {
  ok: boolean
  protocolVersion: string
  contractVersion: string
  accepted: Array<{ path: string; note?: string }>
  rejected: Array<{ path: string; reason: string }>
  silentlyDropped: Array<{ path: string; reason: string }>
  /** True when Zod .strict() failed the whole paste — nothing would be applied. */
  wholePasteRejected: boolean
  zodError?: string
}
