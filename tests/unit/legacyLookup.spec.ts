import { describe, expect, it, beforeEach, afterEach } from 'vitest'

import { resetLegacyDumpCache } from '@/lib/artOfficial/legacyDump'
import { lookupLegacyRecord, listLegacyRecords } from '@/lib/artOfficial/legacyLookup'
import {
  mediumMatchesPayloadEnum,
  normalizeLegacyRecord,
  slugDerivedTitle,
  stripHtml,
} from '@/lib/artOfficial/normalizeLegacyRecord'
import type { WpLegacyArtworkNode } from '@/lib/artOfficial/legacyTypes'
import { writeFileSync, mkdirSync, rmSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const FIXTURE_DIR = path.resolve(dirname, '../fixtures/legacy')
const FIXTURE_DUMP = path.join(FIXTURE_DIR, 'wp-artworks-test.json')

/** Sample from spec — databaseId 334 with missing title and date mismatch. */
export const SAMPLE_WP_RECORD_334: WpLegacyArtworkNode = {
  databaseId: 334,
  slug: 'berlin-wall-sample',
  title: null,
  date: '2024-11-15T10:00:00',
  featuredImage: {
    node: { sourceUrl: 'https://artism.org/wp-content/uploads/sample.jpg' },
  },
  artworkFields: {
    year: '2024',
    city: 'Berlin',
    country: 'Germany',
    medium: 'acrylic transfer and acrylic on canvas',
    units: 'metric',
    width: '50',
    height: '75',
    size: 'md',
    orientation: ['landscape'],
    series: ['a-colorful-history'],
    location: 'Studio notes mention Oct 2025 finish',
    exhibitionHistory: '<p>Shown at <strong>Gallery X</strong> in 2023.</p>',
    provenance: '<p>Artist studio</p>',
    forsale: true,
    price: '12000',
    proportion: '0.8965',
  },
}

function writeFixtureDump(nodes: WpLegacyArtworkNode[]) {
  mkdirSync(FIXTURE_DIR, { recursive: true })
  writeFileSync(FIXTURE_DUMP, JSON.stringify(nodes), 'utf8')
  process.env.LEGACY_WP_ARTWORKS_PATH = FIXTURE_DUMP
  resetLegacyDumpCache()
}

describe('normalizeLegacyRecord', () => {
  it('strips HTML from exhibition, provenance, and editions fields', () => {
    const record = normalizeLegacyRecord(SAMPLE_WP_RECORD_334)
    expect(record?.exhibitionHistoryText).toBe('Shown at Gallery X in 2023.')
    expect(record?.provenanceText).toBe('Artist studio')
    expect(record?.exhibitionHistoryText).not.toContain('<')
  })

  it('derives slugDerivedTitle and flags missing-title', () => {
    expect(slugDerivedTitle('berlin-wall-1961')).toBe('Berlin Wall 1961')
    const record = normalizeLegacyRecord(SAMPLE_WP_RECORD_334)
    expect(record?.titleCandidate).toBeNull()
    expect(record?.slugDerivedTitle).toBe('Berlin Wall Sample')
    expect(record?.conflicts.some((c) => c.type === 'missing-title')).toBe(true)
  })

  it('detects date-mismatch on sample record 334', () => {
    const record = normalizeLegacyRecord(SAMPLE_WP_RECORD_334)!
    expect(record.dateNotes.some((n) => n.includes('2025'))).toBe(true)
    expect(record.conflicts.some((c) => c.type === 'date-mismatch')).toBe(true)
  })

  it('flags dormant commerce/provenance fields', () => {
    const record = normalizeLegacyRecord(SAMPLE_WP_RECORD_334)!
    expect(record.conflicts.some((c) => c.type === 'dormant-field-present')).toBe(true)
    expect(record.forSale).toBe(true)
    expect(record.priceRaw).toBe('12000')
  })

  it('does not use proportion — uses width/height instead', () => {
    const record = normalizeLegacyRecord(SAMPLE_WP_RECORD_334)!
    expect(record.width).toBe(50)
    expect(record.height).toBe(75)
    expect((record as { proportion?: unknown }).proportion).toBeUndefined()
  })

  it('includes featuredImage URL', () => {
    const record = normalizeLegacyRecord(SAMPLE_WP_RECORD_334)!
    expect(record.imageUrl).toContain('sample.jpg')
  })

  it('matches known WP medium strings', () => {
    expect(mediumMatchesPayloadEnum('acrylic transfer and acrylic on canvas')).toBe(true)
    expect(mediumMatchesPayloadEnum('completely unknown medium xyz')).toBe(false)
  })
})

describe('stripHtml', () => {
  it('removes tags and entities', () => {
    expect(stripHtml('<p>Hello &amp; world</p>')).toBe('Hello & world')
  })
})

describe('legacyLookup', () => {
  beforeEach(() => {
    writeFixtureDump([SAMPLE_WP_RECORD_334])
  })

  afterEach(() => {
    delete process.env.LEGACY_WP_ARTWORKS_PATH
    resetLegacyDumpCache()
    rmSync(FIXTURE_DIR, { recursive: true, force: true })
  })

  it('finds record by databaseId', () => {
    const result = lookupLegacyRecord({ query: '334' })
    expect(result.status).toBe('match')
    if (result.status === 'match') {
      expect(result.record.legacyRecordId).toBe(334)
    }
  })

  it('finds record by slug fragment', () => {
    const result = lookupLegacyRecord({ query: 'berlin-wall' })
    expect(result.status).toBe('match')
  })

  it('lists records for browse', () => {
    const records = listLegacyRecords()
    expect(records).toHaveLength(1)
    expect(records[0].legacyRecordId).toBe(334)
  })

  it('returns no-dump when file missing', () => {
    delete process.env.LEGACY_WP_ARTWORKS_PATH
    resetLegacyDumpCache()
    process.env.LEGACY_WP_ARTWORKS_PATH = path.join(FIXTURE_DIR, 'missing.json')
    resetLegacyDumpCache()
    expect(lookupLegacyRecord({ query: '334' }).status).toBe('no-dump')
  })
})
