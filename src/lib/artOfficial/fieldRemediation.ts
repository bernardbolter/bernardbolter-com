import type { CatalogField } from './fieldCatalog'
import type { CoverageBucket } from './sessionCoverage'

export interface Remediation {
  file: string
  lever: string
  surface: 'cursor' | 'payload-admin'
}

export function remediationFor(
  f: CatalogField,
  bucket: CoverageBucket,
): Remediation | null {
  if (bucket === 'staged_dropped') {
    return {
      file: 'buildArtworkPatch.ts / fieldAllowlist.ts',
      lever:
        'Field staged but not committed — check the commit mapping and the allowlist.',
      surface: 'cursor',
    }
  }

  if (bucket !== 'unaddressed') return null

  if (f.field === 'clipEmbedding') {
    return {
      file: 'persistArtworkClipEmbedding',
      lever: 'CLIP embedding not wired into the turn loop — wire it on artwork commit.',
      surface: 'cursor',
    }
  }

  if (f.layer === 'automatic' || f.category === 'automatic') {
    return {
      file: 'runImageAnalysis.ts / applyStagedMediaUpload.ts',
      lever: 'Vision field not produced — check the image-analysis pass fires on upload and stages results to the timeline.',
      surface: 'cursor',
    }
  }

  if (f.category === 'external-lookup') {
    return {
      file: 'buildSystemPrompt.ts (field roadmap)',
      lever: 'External lookup not called — agent should call search_getty_tgn / search_wikidata after image upload; check the field roadmap AUTOMATIC block.',
      surface: 'cursor',
    }
  }

  if (f.category === 'series-specific') {
    const scope = f.field.startsWith('dcs.')
      ? 'digital-city-series'
      : f.field.startsWith('megacities.')
        ? 'megacities'
        : f.field.startsWith('ach.')
          ? 'a-colorful-history (or descendant sub-series)'
          : 'the matching series'
    return {
      file: 'buildSystemPrompt.ts (series workflow block)',
      lever: `Series extension field not reached — confirm the artwork is in ${scope} and run the matching workflow block.`,
      surface: 'cursor',
    }
  }

  switch (f.category) {
    case 'early':
    case 'middle-practical':
      return {
        file: 'buildSystemPrompt.ts (field roadmap)',
        lever:
          'Orientation/fact field not reached — adjust the roadmap or the post-upload fact-confirm step.',
        surface: 'cursor',
      }
    case 'middle-reflective':
    case 'late':
      return {
        file: 'buildSystemPrompt.ts (block-handling)',
        lever:
          'Reflective field landed flat or was never reached — adjust the block-handling and "do not close until covered" rules.',
        surface: 'cursor',
      }
    case 'confirmation-generated':
      return f.layer === 'agent'
        ? {
            file: 'PracticeKnowledge: preferred-vocabulary / artist-statement',
            lever: 'Generated prose in the wrong voice — edit the voice model content.',
            surface: 'payload-admin',
          }
        : {
            file: 'agentTools.ts (generate_confirmation_draft)',
            lever: 'Draft field not generated — check the confirmation-draft tool.',
            surface: 'cursor',
          }
    default:
      return null
  }
}
