import Link from 'next/link'
import type { ReactNode } from 'react'

import { getSeriesLinkHref } from '@/utilities/getSeriesLinkHref'

export type SeriesMention = {
  name: string
  slug: string
}

type TextMatch = {
  start: number
  end: number
  slug: string
  name: string
}

function findSeriesMatches(text: string, series: SeriesMention[]): TextMatch[] {
  const matches: TextMatch[] = []
  const sorted = [...series]
    .filter((entry) => entry.name.trim() && entry.slug.trim())
    .sort((a, b) => b.name.length - a.name.length)

  for (const entry of sorted) {
    let from = 0
    while (from < text.length) {
      const start = text.indexOf(entry.name, from)
      if (start === -1) break

      const end = start + entry.name.length
      const overlaps = matches.some((match) => start < match.end && end > match.start)
      if (!overlaps) {
        matches.push({ start, end, slug: entry.slug, name: entry.name })
      }
      from = start + 1
    }
  }

  return matches.sort((a, b) => a.start - b.start)
}

/** Wrap known series names in links — skips text already inside Lexical link nodes. */
export function linkSeriesMentionsInText(
  text: string,
  series: SeriesMention[],
  keyPrefix: string,
): ReactNode[] {
  if (!text) return []
  if (series.length === 0) return [text]

  const matches = findSeriesMatches(text, series)
  if (matches.length === 0) return [text]

  const nodes: ReactNode[] = []
  let cursor = 0

  matches.forEach((match, index) => {
    if (match.start < cursor) return
    if (match.start > cursor) nodes.push(text.slice(cursor, match.start))
    nodes.push(
      <Link
        key={`${keyPrefix}-series-${index}`}
        href={getSeriesLinkHref(match.slug)}
        className="bio__inline-link"
      >
        {match.name}
      </Link>,
    )
    cursor = match.end
  })

  if (cursor < text.length) nodes.push(text.slice(cursor))
  return nodes
}
