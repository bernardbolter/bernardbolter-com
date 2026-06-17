'use client'

import Link from 'next/link'
import { useState } from 'react'

import { buildPublicEditionTiers } from '@/lib/artwork/ownershipRegistryPublic'
import type { Artwork } from '@/payload-types'

type Props = {
  artwork: Artwork
}

export default function EditionTierRegistry({ artwork }: Props) {
  const tiers = buildPublicEditionTiers(artwork)
  const untrackedNote = (artwork as Artwork & { untrackedEditionsNote?: string | null })
    .untrackedEditionsNote?.trim()

  if (tiers.length === 0) {
    if (!untrackedNote) return null
    return <p className="edition-registry__untracked">{untrackedNote}</p>
  }

  return (
    <div className="edition-registry">
      {tiers.map((tier) => (
        <EditionTierAccordion key={tier.tierLabel} tier={tier} />
      ))}
      {untrackedNote ? <p className="edition-registry__untracked">{untrackedNote}</p> : null}
    </div>
  )
}

type TierProps = {
  tier: ReturnType<typeof buildPublicEditionTiers>[number]
}

function EditionTierAccordion({ tier }: TierProps) {
  const [open, setOpen] = useState(false)
  const hasOpenContent = tier.claimedRows.length > 0 || tier.apRow !== null

  return (
    <div className="edition-registry__card">
      <button
        type="button"
        className="edition-registry__header"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="edition-registry__label">{tier.tierLabel}</span>
        <span className="edition-registry__summary">
          <span className="edition-registry__pill">{tier.headerSummary}</span>
          <span className="edition-registry__chevron" aria-hidden>
            {open ? '▾' : '▸'}
          </span>
        </span>
      </button>

      {open ? (
        <div className="edition-registry__body">
          {tier.claimedRows.map((row) => (
            <p key={`${tier.tierLabel}-${row.copyNumber}`} className="edition-registry__row">
              {row.displayLine}
            </p>
          ))}
          {tier.apRow ? (
            <p className="edition-registry__row edition-registry__row--ap">{tier.apRow.displayLine}</p>
          ) : null}
          {!hasOpenContent ? (
            <p className="edition-registry__row edition-registry__row--muted">
              No publicly confirmed copies yet.
            </p>
          ) : null}
          <p className="edition-registry__claim">
            Do you own one of these?{' '}
            <Link href={tier.claimHref} className="text-dark underline">
              Claim yours →
            </Link>
          </p>
        </div>
      ) : null}
    </div>
  )
}
