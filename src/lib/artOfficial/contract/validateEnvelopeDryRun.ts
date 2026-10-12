import { ZodError } from 'zod'

import { isFieldAllowedForAgent } from '@/lib/artOfficial/fieldAllowlist'
import { validateArtHistoricalReferencesValue } from '@/lib/artOfficial/artHistoricalReferences'
import {
  ART_OFFICIAL_CONTRACT_VERSION,
  ART_OFFICIAL_PROTOCOL_VERSION,
} from '@/lib/artOfficial/contract/versions'
import type { EnvelopeDryRunResult } from '@/lib/artOfficial/contract/types'
import {
  envelopeImportSchema,
  normalizeVisionImportItems,
  visionAnalysisImportSchema,
} from '@/lib/studio/archiveImportSchemas'

function zodIssues(error: ZodError): Array<{ path: string; reason: string }> {
  return error.issues.map((issue) => ({
    path: issue.path.length ? issue.path.join('.') : '(root)',
    reason: issue.message,
  }))
}

function emptyResult(
  overrides: Partial<EnvelopeDryRunResult> & {
    ok: boolean
    wholePasteRejected: boolean
  },
): EnvelopeDryRunResult {
  return {
    protocolVersion: ART_OFFICIAL_PROTOCOL_VERSION,
    contractVersion: ART_OFFICIAL_CONTRACT_VERSION,
    accepted: [],
    rejected: [],
    silentlyDropped: [],
    ...overrides,
  }
}

function looksLikeVisionBody(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false
  const obj = body as Record<string, unknown>
  if ('analyses' in obj || 'visionAnalyses' in obj) return true
  if (Array.isArray(obj.items)) {
    const first = obj.items[0]
    if (first && typeof first === 'object' && 'analyses' in (first as object)) return true
  }
  return false
}

function validateVisionDryRun(body: unknown): EnvelopeDryRunResult {
  const parsed = visionAnalysisImportSchema.safeParse(body)
  if (!parsed.success) {
    const rejected = zodIssues(parsed.error)
    if (
      body &&
      typeof body === 'object' &&
      'visionAnalyses' in (body as object) &&
      !('analyses' in (body as object))
    ) {
      rejected.unshift({
        path: 'visionAnalyses',
        reason: 'Wrong key — use analyses, not visionAnalyses (Payload field name ≠ import key)',
      })
    }
    return emptyResult({
      ok: false,
      wholePasteRejected: true,
      rejected,
      zodError: parsed.error.message,
    })
  }

  const items = normalizeVisionImportItems(parsed.data)
  return emptyResult({
    ok: true,
    wholePasteRejected: false,
    accepted: items.map((item) => ({
      path: `vision:${item.slug}`,
      note: `${item.analyses.length} analyses entr(y/ies); key=analyses`,
    })),
  })
}

/**
 * Dry-run a multi-collection envelope paste (or a vision import).
 * Commits nothing. Reports what Zod would accept, what would be stripped,
 * and what allowlist/shape checks would reject on artwork fields.
 */
export function validateEnvelopeDryRun(body: unknown): EnvelopeDryRunResult {
  if (looksLikeVisionBody(body) && !(body && typeof body === 'object' && 'writes' in (body as object))) {
    return validateVisionDryRun(body)
  }

  const accepted: EnvelopeDryRunResult['accepted'] = []
  const rejected: EnvelopeDryRunResult['rejected'] = []
  const silentlyDropped: EnvelopeDryRunResult['silentlyDropped'] = []

  const parsed = envelopeImportSchema.safeParse(body)
  if (!parsed.success) {
    // Common mis-paste: vision shape sent without writes — try vision path for clearer errors.
    if (looksLikeVisionBody(body)) {
      return validateVisionDryRun(body)
    }
    return emptyResult({
      ok: false,
      wholePasteRejected: true,
      rejected: zodIssues(parsed.error),
      zodError: parsed.error.message,
    })
  }

  const data = parsed.data
  accepted.push({
    path: 'writes',
    note: `${data.writes.length} write(s) passed envelope Zod .strict()`,
  })

  for (let i = 0; i < data.writes.length; i += 1) {
    const write = data.writes[i]!
    const base = `writes[${i}]`

    if (write.collection === 'sessions') {
      accepted.push({
        path: `${base}.sessions:${write.sessionId}`,
        note: `sessionType=${write.fields.sessionType}; messages=${write.fields.messages.length}`,
      })
      if (write.fields.fieldUpdateTimeline === undefined) {
        silentlyDropped.push({
          path: `${base}.fields.fieldUpdateTimeline`,
          reason:
            'Omitted — coverage timeline will be empty for this session (historical pastes often lacked this)',
        })
      } else {
        accepted.push({
          path: `${base}.fields.fieldUpdateTimeline`,
          note: `${write.fields.fieldUpdateTimeline.length} timeline row(s)`,
        })
      }
      continue
    }

    if (write.collection === 'bio-timeline' || write.collection === 'statement-throughlines') {
      accepted.push({
        path: `${base}.${write.collection}.append`,
        note: 'entry shape valid (idempotent append on live import)',
      })
      if (
        write.entry &&
        typeof write.entry === 'object' &&
        'reinforcingSessions' in (write.entry as object)
      ) {
        // Unreachable if Zod strict — kept for clarity if schema loosens.
        rejected.push({
          path: `${base}.entry.reinforcingSessions`,
          reason: 'Not in entry schema — Unrecognized key',
        })
      }
      continue
    }

    if (write.collection === 'artworks') {
      const fields = { ...write.fields }
      const slug = write.slug

      if (fields.reasoningStatus !== undefined) {
        silentlyDropped.push({
          path: `${base}.fields.reasoningStatus`,
          reason:
            'Derived field — applyEnvelopeImport strips with warning; never written',
        })
        delete fields.reasoningStatus
      }

      for (const [key, value] of Object.entries(fields)) {
        const path = `${base}.fields.${key}`
        if (!isFieldAllowedForAgent('artworks', key)) {
          rejected.push({
            path,
            reason: `FORBIDDEN — artworks.${key} is not agent/envelope-writable`,
          })
          continue
        }
        if (key === 'artHistoricalReferences') {
          const check = validateArtHistoricalReferencesValue(value)
          if (!check.ok) {
            rejected.push({
              path,
              reason: check.error ?? 'Invalid artHistoricalReferences shape',
            })
            continue
          }
        }
        accepted.push({
          path,
          note: `slug=${slug}`,
        })
      }
    }
  }

  const ok = rejected.length === 0
  return {
    ok,
    protocolVersion: ART_OFFICIAL_PROTOCOL_VERSION,
    contractVersion: ART_OFFICIAL_CONTRACT_VERSION,
    accepted,
    rejected,
    silentlyDropped,
    wholePasteRejected: false,
  }
}
