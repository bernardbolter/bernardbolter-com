import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchCommonsFileMetadata } from '@/lib/artOfficial/externalLookups/commons'
import { searchWikidata } from '@/lib/artOfficial/externalLookups/wikidata'

describe('externalLookups', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('parses Commons file metadata', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          query: {
            pages: {
              '1': {
                title: 'File:Test.jpg',
                imageinfo: [
                  {
                    url: 'https://upload.wikimedia.org/test.jpg',
                    extmetadata: {
                      ImageDescription: { value: 'A gate' },
                      Artist: { value: 'Photographer' },
                      LicenseShortName: { value: 'CC BY 4.0' },
                      WikidataConceptURI: {
                        value: 'https://www.wikidata.org/wiki/Q82425',
                      },
                    },
                  },
                ],
              },
            },
          },
        }),
      }),
    )

    const result = await fetchCommonsFileMetadata(
      'https://commons.wikimedia.org/wiki/File:Test.jpg',
    )
    expect('error' in result).toBe(false)
    if (!('error' in result)) {
      expect(result.wikidataEntityId).toBe('Q82425')
      expect(result.artist).toBe('Photographer')
    }
  })

  it('returns Wikidata search hits', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          search: [{ id: 'Q82425', label: 'Brandenburg Gate', description: 'landmark' }],
        }),
      }),
    )

    const result = await searchWikidata('Brandenburg Gate')
    expect('error' in result).toBe(false)
    if (!('error' in result)) {
      expect(result[0]?.uri).toContain('Q82425')
    }
  })
})
