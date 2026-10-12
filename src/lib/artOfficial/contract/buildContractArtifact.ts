import { listForbiddenFieldPaths } from '@/lib/artOfficial/fieldAllowlist'
import {
  ART_OFFICIAL_CONTRACT_TITLE,
  ART_OFFICIAL_CONTRACT_VERSION,
  ART_OFFICIAL_PROTOCOL_VERSION,
} from '@/lib/artOfficial/contract/versions'
import type { ArtOfficialContract, ContractFieldRow } from '@/lib/artOfficial/contract/types'
import { CORPUS_BASE } from '@/lib/corpus/constants'

function field(
  name: string,
  type: string,
  opts: Partial<Omit<ContractFieldRow, 'name' | 'type'>> & { notes?: string } = {},
): ContractFieldRow {
  return {
    name,
    type,
    required: opts.required ?? false,
    enumValues: opts.enumValues ?? null,
    readOnly: opts.readOnly ?? false,
    agentWritable: opts.agentWritable ?? true,
    notes: opts.notes ?? '',
  }
}

/**
 * Emit the import contract from live code surfaces — never hand-written field lists.
 * Call from the nightly corpus build (and emergency rebuild).
 */
export function buildArtOfficialContract(generatedAt: string = new Date().toISOString()): ArtOfficialContract {
  const forbidden = listForbiddenFieldPaths()

  const workedExampleEnvelope = {
    sourceSessionRef: 'the-thinker-2026-07-15',
    writes: [
      {
        collection: 'sessions',
        operation: 'set',
        sessionId: 'the-thinker-2026-07-15',
        fields: {
          sessionType: 'artwork',
          status: 'completed',
          primaryArtwork: 'the-thinker',
          mentionedArtworks: [],
          firstImpression: 'Artist blind description before upload…',
          secondDescription: 'Formal re-ask response…',
          sessionNotes: 'Sale details discussed in prose only — not written to salesRecord.',
          messages: [
            { role: 'user', content: '…' },
            { role: 'assistant', content: '…' },
          ],
          fieldUpdateTimeline: [
            {
              field: 'intent',
              source: 'conversation',
              timestamp: '2026-07-15T14:00:00.000Z',
            },
          ],
          proposedAbstracts: [
            {
              targetCollection: 'statement-throughline',
              text: 'Cross-work pattern text…',
              status: 'accepted',
            },
          ],
        },
      },
      {
        collection: 'artworks',
        slug: 'the-thinker',
        operation: 'set',
        fields: {
          intent: '…',
          formalContributionAssessment: '…',
          makingNote: '…',
          currentLocation: {
            category: 'artists-studio',
            locationDetail: 'Studio detail…',
          },
        },
      },
      {
        collection: 'bio-timeline',
        operation: 'append',
        entry: {
          eventDate: '1993',
          text: '…',
          sourceSessionRef: 'the-thinker-2026-07-15',
          linkedArtworkSlugs: ['the-thinker'],
        },
      },
      {
        collection: 'statement-throughlines',
        operation: 'append',
        entry: {
          dateRecognized: '2026-07-15',
          text: '…',
          sourceSessionRef: 'the-thinker-2026-07-15',
          linkedArtworkSlugs: ['the-thinker'],
        },
      },
    ],
  }

  return {
    'art-official:contractVersion': ART_OFFICIAL_CONTRACT_VERSION,
    'art-official:protocolVersion': ART_OFFICIAL_PROTOCOL_VERSION,
    'art-official:generatedAt': generatedAt,
    'art-official:supersedesNote':
      'This contract is generated from the live importer and allowlist. Live endpoints and this file supersede hand-written field lists in older docs.',
    title: ART_OFFICIAL_CONTRACT_TITLE,
    endpoints: [
      {
        method: 'POST',
        path: `${CORPUS_BASE}/api/studio/archive/envelope`,
        role: 'Commit multi-collection envelope (studio auth)',
      },
      {
        method: 'POST',
        path: `${CORPUS_BASE}/api/studio/archive/artwork-fields`,
        role: 'Artwork fields only (studio auth)',
      },
      {
        method: 'POST',
        path: `${CORPUS_BASE}/api/studio/archive/vision-analyses`,
        role: 'Vision analyses import (studio auth); key is analyses, not visionAnalyses',
      },
      {
        method: 'POST',
        path: `${CORPUS_BASE}/api/art-official/validate`,
        role: 'Dry-run validate — accepted / rejected / silently dropped; commits nothing',
      },
      {
        method: 'GET',
        path: `${CORPUS_BASE}/api/corpus/briefing`,
        role: 'Nightly briefing (protocol + contract + corpus)',
      },
      {
        method: 'GET',
        path: `${CORPUS_BASE}/api/corpus/index`,
        role: 'Tier 1 index; ?depth=survey for Tier 2',
      },
      {
        method: 'GET',
        path: `${CORPUS_BASE}/api/corpus/{slug}`,
        role: 'Tier 4 full record',
      },
      {
        method: 'GET',
        path: `${CORPUS_BASE}/api/corpus/{slug}/sessions`,
        role: 'Tier 5 sessions (not ?tier=5)',
      },
      {
        method: 'GET',
        path: `${CORPUS_BASE}/art-official/contract`,
        role: 'Human-readable contract (this document)',
      },
      {
        method: 'GET',
        path: `${CORPUS_BASE}/art-official/protocol`,
        role: 'Human-readable protocol',
      },
    ],
    envelope: {
      topLevel: [
        field('sourceSessionRef', 'string | number', {
          notes: 'Optional default for append sourceSessionRef',
        }),
        field('writes', 'array', {
          required: true,
          notes: 'Min 1. Sessions writes run before bio/throughline appends.',
        }),
      ],
      collections: [
        {
          collection: 'sessions',
          operation: 'set',
          topLevelKeys: [
            field('collection', "'sessions'", { required: true }),
            field('operation', "'set'", { required: true }),
            field('sessionId', 'string', {
              required: true,
              notes: 'Top-level — not inside fields',
            }),
            field('fields', 'object', { required: true }),
          ],
          fields: [
            field('sessionType', 'enum', {
              required: true,
              enumValues: [
                'artwork',
                'statement',
                'event',
                'system-design',
                'artwork-cataloguing',
                'artist-statement',
                'event-enrichment',
              ],
              notes: 'Shorthand mapped to live Payload sessionType',
            }),
            field('status', 'enum', {
              required: true,
              enumValues: ['in-progress', 'completed'],
              notes: 'abandoned exists on Sessions but is rejected by envelope Zod',
            }),
            field('messages', '{role,content}[]', {
              required: true,
              enumValues: null,
              notes: 'role: user | assistant',
            }),
            field('primaryArtwork', 'string slug', {}),
            field('mentionedArtworks', 'string[]', {}),
            field('firstImpression', 'string', {
              notes: 'Artist pre-upload blind text — private',
            }),
            field('secondDescription', 'string', {
              notes: 'Formal re-ask response',
            }),
            field('sessionNotes', 'string', {
              notes: 'Not notes. Use for money/sale prose that must not hit forbidden fields.',
            }),
            field('proposedAbstracts', 'array', {
              notes:
                'targetCollection: bio-timeline | statement-throughline (singular); status proposed|accepted|edited|rejected',
            }),
            field('fieldUpdateTimeline', 'array', {
              notes: 'Optional coverage. Entries passthrough; field name required.',
            }),
          ],
        },
        {
          collection: 'artworks',
          operation: 'set',
          topLevelKeys: [
            field('collection', "'artworks'", { required: true }),
            field('slug', 'string', {
              required: true,
              notes: 'Top-level — not inside fields',
            }),
            field('operation', "'set'", { notes: 'Optional; defaults to set' }),
            field('fields', 'Record<string, unknown>', { required: true }),
          ],
          fields: [
            field('(any artwork path not in forbidden)', 'varies', {
              notes:
                'Artworks use a denylist: anything not forbidden is agent/envelope-writable, then enum/shape/sanitize layers apply.',
            }),
          ],
        },
        {
          collection: 'bio-timeline',
          operation: 'append',
          topLevelKeys: [
            field('collection', "'bio-timeline'", { required: true }),
            field('operation', "'append'", { required: true }),
            field('entry', 'object', { required: true }),
          ],
          fields: [
            field('text', 'string', { required: true }),
            field('eventDate', 'string', {}),
            field('sourceSessionRef', 'string | number', {}),
            field('linkedArtworkSlugs', 'string[]', {}),
            field('visibility', 'public | private', {}),
          ],
        },
        {
          collection: 'statement-throughlines',
          operation: 'append',
          topLevelKeys: [
            field('collection', "'statement-throughlines'", {
              required: true,
              notes: 'Plural. Singular statement-throughline fails Zod.',
            }),
            field('operation', "'append'", { required: true }),
            field('entry', 'object', { required: true }),
          ],
          fields: [
            field('text', 'string', { required: true }),
            field('dateRecognized', 'string', {}),
            field('sourceSessionRef', 'string | number', {}),
            field('linkedArtworkSlugs', 'string[]', {}),
            field('visibility', 'public | private', {}),
          ],
        },
      ],
      sessionTypeMap: {
        artwork: 'artwork-cataloguing',
        statement: 'artist-statement',
        event: 'event-enrichment',
        'system-design': 'system-design',
        'artwork-cataloguing': 'artwork-cataloguing',
        'artist-statement': 'artist-statement',
        'event-enrichment': 'event-enrichment',
      },
    },
    visionImport: {
      key: 'analyses',
      notKey: 'visionAnalyses',
      entryFields: ['text', 'model', 'date'],
    },
    artworkForbidden: forbidden.filter((p) => p.startsWith('artworks.')),
    artworkForbiddenNotes: [
      'Financial/commerce fields are admin-only by deliberate policy.',
      'loanHistory and exhibitionHistory are forbidden as free-text — use Events tools.',
      'reasoningStatus is derived from session messages + why-fields — never paste it.',
      'Artworks are denylist-gated: paths not listed here are writable unless enum/shape checks fail.',
    ],
    artworkAllowedProvenance: [
      'ownershipHistory',
      'provenanceConfidenceLayer',
      'provenanceOriginKnown',
      'currentLocation',
    ],
    artHistoricalReferencesShape:
      '[{ name, matchStrategy: "fuzzy-match-or-create", relevanceNote? }] — prose strings rejected',
    rejections: [
      {
        keyOrField: 'unknown envelope / entry keys',
        where: 'archiveImportSchemas.ts .strict()',
        why: 'Zod rejects the whole paste for one misspelled key',
        behaviour: 'hard-reject',
      },
      {
        keyOrField: 'visionAnalyses (import key)',
        where: 'visionAnalysisImportSchema',
        why: 'Import key is analyses; Payload storage field remains visionAnalyses',
        behaviour: 'hard-reject',
      },
      {
        keyOrField: 'statement-throughline (collection)',
        where: 'envelopeWriteSchema',
        why: 'Collection key must be plural statement-throughlines',
        behaviour: 'hard-reject',
      },
      {
        keyOrField: 'notes (session)',
        where: 'sessionFieldsSchema',
        why: 'Field is sessionNotes',
        behaviour: 'hard-reject',
      },
      {
        keyOrField: 'reinforcingSessions (throughline entry)',
        where: 'statementThroughlineEntrySchema',
        why: 'Not in entry schema; Artist field exists but envelope cannot write it yet',
        behaviour: 'hard-reject',
      },
      {
        keyOrField: 'agentDraft*',
        where: 'sessionFieldsSchema',
        why: 'Live session/tool fields only — not envelope-writable',
        behaviour: 'hard-reject',
      },
      {
        keyOrField: 'reasoningStatus',
        where: 'applyEnvelopeImport + fieldAllowlist',
        why: 'Derived; stripped with warning if pasted',
        behaviour: 'strip-with-warning',
      },
      {
        keyOrField: 'salesRecord / askingPrice / insurance* / gallery*',
        where: 'fieldAllowlist FORBIDDEN',
        why: 'Admin-only financial/commerce',
        behaviour: 'hard-reject',
      },
      {
        keyOrField: 'loanHistory / exhibitionHistory',
        where: 'fieldAllowlist FORBIDDEN',
        why: 'Free-text blocked — route through Events',
        behaviour: 'hard-reject',
      },
      {
        keyOrField: 'artHistoricalReferences (prose)',
        where: 'validateArtHistoricalReferencesValue',
        why: 'Structured array only',
        behaviour: 'hard-reject',
      },
      {
        keyOrField: 'bad relationship shapes / unknown tags',
        where: 'buildArtworkPatch sanitize / resolveArtworkCommitReferences',
        why: 'Invalid relationship values removed from patch',
        behaviour: 'silent-drop',
      },
      {
        keyOrField: 'status: abandoned (envelope)',
        where: 'sessionFieldsSchema',
        why: 'Envelope only accepts in-progress | completed',
        behaviour: 'hard-reject',
      },
    ],
    workedExampleEnvelope,
    reasoningStatusNote:
      'reasoningStatus is derived at build/read time from (completed primary session with messages.length > 0) AND a why-field (intent | formalContributionAssessment | descriptionShort | workContext). Do not paste it. Coverage counts come from the nightly artifact.',
    coverageNote:
      'Catalogued counts and status filters are emitted from the corpus artifact (art-official:coverage). Never hard-code coverage numbers into protocol prose.',
  }
}
