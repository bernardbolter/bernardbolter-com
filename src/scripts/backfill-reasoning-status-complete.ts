/**
 * RETIRED — reasoningStatus is derived from evidence, not stored for public use.
 *
 * This script previously wrote reasoningStatus=complete across the catalogue.
 * That column is now unread by public surfaces; writing it would only confuse
 * admins and mid-migration tooling.
 *
 * Usage: npx tsx src/scripts/backfill-reasoning-status-complete.ts
 * Always exits non-zero without touching the database.
 */
console.error(
  [
    'backfill-reasoning-status-complete is retired.',
    'reasoningStatus is derived at build/read time from:',
    '  - completed primary session with messages.length > 0',
    '  - plus a why-field (intent | formalContributionAssessment | descriptionShort | workContext)',
    'Do not write the stored column. See src/lib/artwork/deriveReasoningStatus.ts.',
  ].join('\n'),
)
process.exit(1)
