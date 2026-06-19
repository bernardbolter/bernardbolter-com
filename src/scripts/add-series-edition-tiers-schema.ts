/**
 * @deprecated Superseded by print-data-architecture-reference.md — SeriesEditionTiers
 * was removed. Ownership lives on dcs.editionTiers[].copies[] instead.
 * Kept for reference when cleaning up legacy DB tables from the earlier Stage 1 attempt.
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

console.log(
  'This migration is deprecated. Use Payload schema push or add-dcs-edition-tier-ownership-fields.ts instead.',
)
process.exit(0)
