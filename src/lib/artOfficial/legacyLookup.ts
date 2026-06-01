import { loadLegacyDump } from './legacyDump'
import { normalizeLegacyRecord } from './normalizeLegacyRecord'
import type { LegacyRecord, LegacyRecordSummary, WpLegacyArtworkNode } from './legacyTypes'

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase()
}

function scoreMatch(node: WpLegacyArtworkNode, query: string): number {
  const q = normalizeQuery(query)
  if (!q) return 0

  if (String(node.databaseId) === q) return 1000

  const slug = node.slug?.toLowerCase() ?? ''
  if (slug === q) return 900
  if (slug.includes(q)) return 700

  const title = (node.title ?? '').replace(/<[^>]+>/g, '').toLowerCase()
  if (title && title.includes(q)) return 600

  if (slug.replace(/-/g, ' ').includes(q)) return 500

  return 0
}

function matchesSeries(node: WpLegacyArtworkNode, series?: string): boolean {
  if (!series?.trim()) return true
  const needle = series.trim().toLowerCase()
  const fromFields = node.artworkFields?.series?.some(
    (s) => s?.toLowerCase() === needle || s?.toLowerCase().includes(needle),
  )
  if (fromFields) return true
  return Boolean(
    node.categories?.nodes?.some(
      (c) => c.slug?.toLowerCase() === needle || c.slug?.toLowerCase().includes(needle),
    ),
  )
}

function toSummary(record: LegacyRecord): LegacyRecordSummary {
  return {
    legacyRecordId: record.legacyRecordId,
    legacySlug: record.legacySlug,
    titleCandidate: record.titleCandidate,
    yearCandidate: record.yearCandidate,
  }
}

export function listLegacyRecords(args?: { series?: string }): LegacyRecordSummary[] {
  const nodes = loadLegacyDump()
  const out: LegacyRecordSummary[] = []

  for (const node of nodes) {
    if (!matchesSeries(node, args?.series)) continue
    const record = normalizeLegacyRecord(node)
    if (record) out.push(toSummary(record))
  }

  return out.sort((a, b) => a.legacySlug.localeCompare(b.legacySlug))
}

export type LegacyLookupResult =
  | { status: 'no-dump' }
  | { status: 'no-match'; candidates: LegacyRecordSummary[] }
  | { status: 'ambiguous'; candidates: LegacyRecordSummary[] }
  | { status: 'match'; record: LegacyRecord; candidates: LegacyRecordSummary[] }

export function lookupLegacyRecord(args: {
  query: string
  series?: string
}): LegacyLookupResult {
  const nodes = loadLegacyDump()
  if (nodes.length === 0) {
    return { status: 'no-dump' }
  }

  const scored = nodes
    .filter((node) => matchesSeries(node, args.series))
    .map((node) => ({ node, score: scoreMatch(node, args.query) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)

  const candidates: LegacyRecordSummary[] = []
  for (const row of scored.slice(0, 5)) {
    const record = normalizeLegacyRecord(row.node)
    if (record) candidates.push(toSummary(record))
  }

  if (scored.length === 0) {
    return {
      status: 'no-match',
      candidates: listLegacyRecords({ series: args.series }).slice(0, 10),
    }
  }

  const top = scored[0]
  const second = scored[1]
  const topRecord = normalizeLegacyRecord(top.node)
  if (!topRecord) {
    return { status: 'no-match', candidates }
  }

  if (second && second.score >= top.score - 50) {
    const ambiguousCandidates = scored.slice(0, 5).flatMap((row) => {
      const record = normalizeLegacyRecord(row.node)
      return record ? [toSummary(record)] : []
    })
    return { status: 'ambiguous', candidates: ambiguousCandidates }
  }

  return { status: 'match', record: topRecord, candidates }
}

export function legacyRecordById(id: number): LegacyRecord | null {
  const nodes = loadLegacyDump()
  const node = nodes.find((n) => n.databaseId === id)
  return node ? normalizeLegacyRecord(node) : null
}
