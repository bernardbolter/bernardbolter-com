'use client'

import Link from 'next/link'
import { useState } from 'react'

import type { PublicEditionTier } from '@/lib/artwork/ownershipRegistryPublic'

type Props = {
  tiers: PublicEditionTier[]
  untrackedEditionsNote?: string | null
}

export default function EditionTierRegistry({ tiers, untrackedEditionsNote }: Props) {
  const untrackedNote = untrackedEditionsNote?.trim()

  if (tiers.length === 0) {
    if (!untrackedNote) return null
    return <p className="edition-registry__untracked">{untrackedNote}</p>
  }

  return (
    <div className="edition-registry">
      <div className="edition-registry__card">
        {tiers.map((tier, index) => (
          <EditionTierAccordion
            key={tier.tierLabel}
            tier={tier}
            isLast={index === tiers.length - 1}
          />
        ))}
      </div>
      {untrackedNote ? <p className="edition-registry__untracked">{untrackedNote}</p> : null}
    </div>
  )
}

type TierProps = {
  tier: PublicEditionTier
  isLast: boolean
}

function EditionTierAccordion({ tier, isLast }: TierProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`edition-registry__tier${open ? ' edition-registry__tier--open' : ''}`}>
      <button
        type="button"
        className={`edition-registry__header${isLast && !open ? ' edition-registry__header--last' : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="edition-registry__header-main">
          <span className="edition-registry__label">{tier.tierLabel}</span>
          {tier.specLine ? (
            <span className="edition-registry__spec">{tier.specLine}</span>
          ) : null}
        </span>
        <span className="edition-registry__summary">
          <span className="edition-registry__pill">{tier.headerSummary}</span>
          <span className="edition-registry__chevron" aria-hidden>
            {open ? '−' : '+'}
          </span>
        </span>
      </button>

      {open ? (
        <div className="edition-registry__body">
          {tier.claimedRows.length > 0 ? (
            <ul className="edition-registry__claimed-list">
              {tier.claimedRows.map((row) => (
                <li key={row.copyNumber} className="edition-registry__claimed-row">
                  {row.copyNumber} — {row.ownerLabel}
                </li>
              ))}
            </ul>
          ) : (
            <p className="edition-registry__empty">No copies claimed yet.</p>
          )}

          {tier.apRow ? (
            <p className="edition-registry__ap-row">
              {tier.apRow.copyNumber} — {tier.apRow.ownerLabel}
            </p>
          ) : null}

          <p className="edition-registry__claim-cta">
            <Link href={tier.claimHref} className="text-dark underline">
              Claim a copy →
            </Link>
          </p>
        </div>
      ) : null}
    </div>
  )
}
