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

const AGENT_DRAFT_REJECT_REASON =
  'REJECT — agentDraft* belongs on the live admin/chat commit path, not the multi-collection envelope'

const DIALOGUE_SELF_AUDIT_REJECT_REASON =
  'REJECT — DialogueSelfAudit is projected at Tier 5 read time from live session fields; not an envelope write key'

/**
 * Process-layer keys that Zod .strict() would hard-reject. Strip them for
 * structured dry-run reporting so a mixed paste can show accept/reject per field
 * instead of only "Unrecognized key" on the whole paste. Live import still uses
 * .strict() — the same paste fails until these keys are removed.
 */
function isEnvelopeProcessLayerReject(key: string): string | null {
  if (key === 'DialogueSelfAudit' || key === 'art-official:DialogueSelfAudit') {
    return DIALOGUE_SELF_AUDIT_REJECT_REASON
  }
  if (key === 'agentDraft' || key.startsWith('agentDraft')) {
    return AGENT_DRAFT_REJECT_REASON
  }
  return null
}

function stripProcessLayerRejects(body: unknown): {
  cleaned: unknown
  rejected: Array<{ path: string; reason: string }>
} {
  const rejected: Array<{ path: string; reason: string }> = []
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { cleaned: body, rejected }
  }

  const root = body as Record<string, unknown>
  if (!Array.isArray(root.writes)) {
    return { cleaned: body, rejected }
  }

  const writes = root.writes.map((write, i) => {
    if (!write || typeof write !== 'object' || Array.isArray(write)) return write
    const w = { ...(write as Record<string, unknown>) }
    const base = `writes[${i}]`

    if (w.collection === 'sessions' && w.fields && typeof w.fields === 'object' && !Array.isArray(w.fields)) {
      const fields = { ...(w.fields as Record<string, unknown>) }
      for (const key of Object.keys(fields)) {
        const reason = isEnvelopeProcessLayerReject(key)
        if (reason) {
          rejected.push({ path: `${base}.fields.${key}`, reason })
          delete fields[key]
        }
      }
      w.fields = fields
    }

    // DialogueSelfAudit / agentDraft mistakenly placed on the write object itself.
    for (const key of Object.keys(w)) {
      if (key === 'fields' || key === 'entry' || key === 'collection' || key === 'operation' || key === 'sessionId' || key === 'slug') {
        continue
      }
      const reason = isEnvelopeProcessLayerReject(key)
      if (reason) {
        rejected.push({ path: `${base}.${key}`, reason })
        delete w[key]
      }
    }

    if (
      (w.collection === 'statement-throughlines' || w.collection === 'bio-timeline') &&
      w.entry &&
      typeof w.entry === 'object' &&
      !Array.isArray(w.entry)
    ) {
      const entry = { ...(w.entry as Record<string, unknown>) }
      for (const key of Object.keys(entry)) {
        const reason = isEnvelopeProcessLayerReject(key)
        if (reason) {
          rejected.push({ path: `${base}.entry.${key}`, reason })
          delete entry[key]
        }
      }
      w.entry = entry
    }

    return w
  })

  return {
    cleaned: { ...root, writes },
    rejected,
  }
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

  const { cleaned, rejected: processRejects } = stripProcessLayerRejects(body)
  rejected.push(...processRejects)

  const parsed = envelopeImportSchema.safeParse(cleaned)
  if (!parsed.success) {
    // Common mis-paste: vision shape sent without writes — try vision path for clearer errors.
    if (looksLikeVisionBody(body)) {
      return validateVisionDryRun(body)
    }
    return emptyResult({
      ok: false,
      wholePasteRejected: true,
      rejected: [...rejected, ...zodIssues(parsed.error)],
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
          note: `${write.fields.fieldUpdateTimeline.length} timeline row(s); fieldsCoveredThisSession derived on apply`,
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
        write.collection === 'statement-throughlines' &&
        write.entry.reinforcingSessions !== undefined
      ) {
        accepted.push({
          path: `${base}.entry.reinforcingSessions`,
          note: `${write.entry.reinforcingSessions.length} reinforcing session(s); merged onto existing claim text on apply`,
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
