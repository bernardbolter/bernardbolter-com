import { describe, expect, it } from 'vitest'

import { linkSeriesMentionsInText } from '@/lib/bio/linkSeriesMentions'
import { getSeriesLinkHref } from '@/utilities/getSeriesLinkHref'

describe('linkSeriesMentionsInText', () => {
  const series = [
    { name: 'Digital City Series', slug: 'digital-city-series' },
    { name: 'Megacities', slug: 'megacities' },
    { name: 'Mediums of Perception', slug: 'mediums-of-perception' },
  ]

  it('links exact series name matches', () => {
    const nodes = linkSeriesMentionsInText(
      'He began the Digital City Series in 2010 and later Megacities.',
      series,
      'bio',
    )

    expect(nodes).toHaveLength(5)
    expect(nodes[0]).toBe('He began the ')
    expect(nodes[2]).toBe(' in 2010 and later ')
    expect(nodes[4]).toBe('.')
  })

  it('prefers the longest matching series name', () => {
    const nodes = linkSeriesMentionsInText('Mediums of Perception closes the arc.', series, 'bio')
    expect(nodes).toHaveLength(2)
    expect(nodes[1]).toBe(' closes the arc.')
  })

  it('uses getSeriesLinkHref for targets', () => {
    expect(getSeriesLinkHref('megacities')).toBe('/series/megacities')
  })
})
