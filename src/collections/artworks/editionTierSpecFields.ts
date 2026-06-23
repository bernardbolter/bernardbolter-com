import type { Field } from 'payload'

import {
  validateEditionPrintTechnique,
  validateEditionSubstrate,
} from '@/lib/artwork/editionTierVocabulary'

export {
  EDITION_TIER_PRINT_TECHNIQUE_OPTIONS,
  EDITION_TIER_SUBSTRATE_OPTIONS,
} from '@/lib/artwork/editionTierVocabulary'

export const editionTierDimensionFields: Field[] = [
  {
    name: 'dimensionUnit',
    type: 'select',
    defaultValue: 'cm',
    options: [
      { label: 'cm', value: 'cm' },
      { label: 'in', value: 'in' },
    ],
    admin: {
      description: 'Unit for width and height below — same as artwork physical dimensions.',
    },
  },
  {
    type: 'row',
    fields: [
      { name: 'widthWhole', type: 'number', admin: { width: '50%' } },
      {
        name: 'widthFraction',
        type: 'text',
        admin: { width: '50%', description: 'Optional fraction, e.g. 3/16' },
      },
    ],
  },
  {
    type: 'row',
    fields: [
      { name: 'heightWhole', type: 'number', admin: { width: '50%' } },
      {
        name: 'heightFraction',
        type: 'text',
        admin: { width: '50%', description: 'Optional fraction, e.g. 1/2' },
      },
    ],
  },
]

export const editionTierSubstrateField: Field = {
  name: 'substrate',
  type: 'text',
  admin: {
    description:
      'What the edition is printed on. Choose from the list or add a new option — custom entries are saved to Art/Official settings.',
    components: {
      Field: '/components/admin/EditionVocabularySelectField#EditionVocabularySelectField',
    },
    custom: {
      editionVocabularyKind: 'substrate',
    },
  },
  validate: validateEditionSubstrate,
}

export const editionTierPrintTechniqueField: Field = {
  name: 'printTechnique',
  type: 'text',
  admin: {
    description:
      'How the edition is produced. Choose from the list or add a new option — custom entries are saved to Art/Official settings.',
    components: {
      Field: '/components/admin/EditionVocabularySelectField#EditionVocabularySelectField',
    },
    custom: {
      editionVocabularyKind: 'printTechnique',
    },
  },
  validate: validateEditionPrintTechnique,
}
