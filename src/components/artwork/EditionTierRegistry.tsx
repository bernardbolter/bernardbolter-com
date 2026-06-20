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
  const untrackedNote = artwork.untrackedEditionsNote?.trim()

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
  tier: ReturnType<typeof buildPublicEditionTiers>[number]
  isLast: boolean
}

function EditionTierAccordion({ tier, isLast }: TierProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        className={`edition-registry__header${isLast && !open ? ' edition-registry__header--last' : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="edition-registry__label">{tier.tierLabel}</span>
        <span className="edition-registry__summary">
          <span className="edition-registry__pill">{tier.headerSummary}</span>
          <span
            className={`edition-registry__chevron ti-chevron-${open ? 'down' : 'right'}`}
            aria-hidden
          />
        </span>
      </button>

      {open ? (
        <div className={`edition-registry__body${isLast ? ' edition-registry__body--last' : ''}`}>
          {tier.claimedRows.map((row) => (
            <div
              key={`${tier.tierLabel}-${row.copyNumber}`}
              className="edition-registry__row edition-registry__row--split"
            >
              <span>{row.copyNumber}</span>
              <span>{row.ownerLabel}</span>
            </div>
          ))}
          {tier.apRow ? (
            <div className="edition-registry__row edition-registry__row--split edition-registry__row--ap">
              <span>{tier.apRow.copyNumber}</span>
              <span>{tier.apRow.ownerLabel}</span>
            </div>
          ) : null}
          <p className="edition-registry__claim">
            Do you own one of these?{' '}
            <Link href={tier.claimHref} className="text-dark underline">
              Claim yours →
            </Link>
          </p>
        </div>
      ) : null}
    </>
  )
}
