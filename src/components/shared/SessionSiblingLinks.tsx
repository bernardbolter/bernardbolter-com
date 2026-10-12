import Link from 'next/link'

import { resolveConnectorCardLabel } from '@/lib/artwork/catalogueIdentity'
import type { Artist } from '@/payload-types'

export type SiblingLink = {
  kind: 'bio' | 'throughline'
  slug: string
  label: string
  href: string
}

function relationId(value: unknown): number | null {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id: unknown }).id
    return typeof id === 'number' ? id : null
  }
  return null
}

export function collectSessionSiblingLinks(options: {
  artist: Artist
  sourceSessionId: number
  excludeSlug?: string | null
}): SiblingLink[] {
  const { artist, sourceSessionId, excludeSlug } = options
  const out: SiblingLink[] = []

  for (const entry of artist.bioTimelineEntries ?? []) {
    if ((entry.visibility ?? 'public') !== 'public') continue
    if (!entry.slug?.trim() || !entry.text?.trim()) continue
    if (excludeSlug && entry.slug === excludeSlug) continue
    if (relationId(entry.sourceSessionRef) !== sourceSessionId) continue
    const label = resolveConnectorCardLabel({
      text: entry.text.trim(),
      shortTitle: entry.shortTitle,
    })
    if (!label) continue
    out.push({
      kind: 'bio',
      slug: entry.slug,
      label,
      href: `/bio/entries/${entry.slug}`,
    })
  }

  for (const entry of artist.statementThroughlines ?? []) {
    if ((entry.visibility ?? 'public') !== 'public') continue
    if (!entry.slug?.trim() || !entry.text?.trim()) continue
    if (excludeSlug && entry.slug === excludeSlug) continue
    if (relationId(entry.sourceSessionRef) !== sourceSessionId) continue
    const label = resolveConnectorCardLabel({
      text: entry.text.trim(),
      shortTitle: entry.shortTitle,
    })
    if (!label) continue
    out.push({
      kind: 'throughline',
      slug: entry.slug,
      label,
      href: `/statement/throughlines/${entry.slug}`,
    })
  }

  return out
}

type Props = {
  siblings: SiblingLink[]
}

/** Also from this session — renders nothing when empty. */
export default function SessionSiblingLinks({ siblings }: Props) {
  if (!siblings.length) return null

  return (
    <section className="session-sibling-links" aria-label="Also from this session">
      <h2 className="still-being-written__heading">Also from this session</h2>
      <ul className="session-sibling-links__list">
        {siblings.map((sib) => (
          <li key={`${sib.kind}-${sib.slug}`}>
            <Link href={sib.href} className="bio__inline-link">
              {sib.kind === 'bio' ? 'Bio' : 'Throughline'}: {sib.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
