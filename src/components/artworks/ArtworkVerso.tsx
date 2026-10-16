'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'

import ArtworkIdentityLabel from '@/components/artworks/ArtworkIdentityLabel'
import {
  OPEN_THE_RECORD_LABEL,
  formatCatalogueStatus,
  resolveSeriesDisplay,
  resolveVersoConnectors,
  resolveVersoDescription,
  type VersoConnector,
} from '@/lib/artwork/catalogueIdentity'
import { useArtworks } from '@/providers/ArtworkProvider'
import type { CatalogueClientRow, FilterCategory, TimelineMarkersData } from '@/types/frontend'

const CONNECTOR_GROUP_THROUGHLINES = 'Throughlines'
const CONNECTOR_GROUP_BIOGRAPHY = 'Biography'

type ArtworkVersoProps = {
  artwork: CatalogueClientRow
  filterSeries: FilterCategory[]
  timelineMarkers: TimelineMarkersData
  sessionDates: string[]
  className?: string
  style?: CSSProperties
  /** When false (flipped closed), dismiss any open overlay. */
  active?: boolean
}

function ConnectorChipGroup({
  label,
  connectors,
  openId,
  onOpen,
}: {
  label: string
  connectors: VersoConnector[]
  openId: string | null
  onOpen: (id: string) => void
}) {
  if (connectors.length === 0) return null
  return (
    <div className="artwork-verso__connector-group">
      <p className="artwork-verso__connector-label">{label}</p>
      <ul className="artwork-verso__chip-row">
        {connectors.map((connector) => (
          <li key={connector.id}>
            <button
              type="button"
              className={`artwork-verso__chip${openId === connector.id ? ' is-open' : ''}`}
              aria-expanded={openId === connector.id}
              aria-controls={`verso-overlay-${connector.id}`}
              onClick={(event) => {
                event.stopPropagation()
                onOpen(connector.id)
              }}
            >
              {connector.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function IdentitySection({
  artwork,
  filterSeries,
  title,
  description,
}: {
  artwork: CatalogueClientRow
  filterSeries: FilterCategory[]
  title: string
  description: string | null
}) {
  return (
    <>
      <h2 className="artwork-block__verso-title">{title}</h2>
      <ArtworkIdentityLabel
        artwork={artwork}
        filterSeries={filterSeries}
        includeTitle={false}
        fields="full"
        className="artwork-block__verso-identity"
        renderSeriesAccent={(resolved) => (
          <span
            className="artwork-identity__accent artwork-identity__accent--block"
            style={{ backgroundColor: resolved.color }}
            aria-hidden
          />
        )}
      />
      {description ? <p className="artwork-block__verso-description">{description}</p> : null}
    </>
  )
}

function ConnectorsSection({
  throughlines,
  bios,
  openId,
  onOpen,
}: {
  throughlines: VersoConnector[]
  bios: VersoConnector[]
  openId: string | null
  onOpen: (id: string) => void
}) {
  if (throughlines.length === 0 && bios.length === 0) return null
  return (
    <div className="artwork-verso__connectors">
      <ConnectorChipGroup
        label={CONNECTOR_GROUP_THROUGHLINES}
        connectors={throughlines}
        openId={openId}
        onOpen={onOpen}
      />
      <ConnectorChipGroup
        label={CONNECTOR_GROUP_BIOGRAPHY}
        connectors={bios}
        openId={openId}
        onOpen={onOpen}
      />
    </div>
  )
}

function RecordSections({
  versoRecord,
  hasProvenance,
  hasExhibitions,
  status,
}: {
  versoRecord: CatalogueClientRow['versoRecord']
  hasProvenance: boolean
  hasExhibitions: boolean
  status: string
}) {
  return (
    <>
      {hasProvenance ? (
        <div className="artwork-verso__record-section">
          <p className="artwork-verso__connector-label">Provenance</p>
          {versoRecord?.provenanceSummary ? (
            <p className="artwork-block__verso-status">{versoRecord.provenanceSummary}</p>
          ) : null}
          {versoRecord && versoRecord.provenanceClaims.length > 0 ? (
            <ul className="artwork-verso__claim-list">
              {versoRecord.provenanceClaims.map((row) => (
                <li key={row.claim} className="artwork-verso__claim-item">
                  {row.claim}
                  {row.inferred ? (
                    <span className="artwork-verso__claim-inferred"> — inferred</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {hasExhibitions ? (
        <div className="artwork-verso__record-section">
          <p className="artwork-verso__connector-label">Exhibitions</p>
          <ul className="artwork-verso__exhibition-list">
            {versoRecord!.exhibitions.map((row) => (
              <li key={`${row.year}-${row.title}`} className="artwork-verso__exhibition-item">
                <span className="artwork-verso__exhibition-year">{row.year}</span>
                {' — '}
                {row.href ? (
                  <Link href={row.href} onClick={(event) => event.stopPropagation()}>
                    {row.title}
                  </Link>
                ) : (
                  <span>{row.title}</span>
                )}
                {row.venue ? (
                  <span className="artwork-verso__exhibition-venue"> · {row.venue}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="artwork-block__verso-status">{status}</p>
    </>
  )
}

function VersoOverlays({
  artworkId,
  connectors,
  openId,
  onClose,
  artworkById,
}: {
  artworkId: number
  connectors: VersoConnector[]
  openId: string | null
  onClose: () => void
  artworkById: Map<number, { slug: string; title: string }>
}) {
  return (
    <>
      {openId ? (
        <div
          className="artwork-verso__dismiss-layer"
          data-verso-dismiss=""
          aria-hidden
          onClick={(event) => {
            event.stopPropagation()
            onClose()
          }}
        />
      ) : null}

      {connectors.map((connector) => {
        const related = connector.linkedArtworkIds
          .filter((id) => id !== artworkId)
          .map((id) => artworkById.get(id))
          .filter((row): row is { slug: string; title: string } => Boolean(row))
        const isOpen = openId === connector.id
        return (
          <div
            key={connector.id}
            id={`verso-overlay-${connector.id}`}
            className={`artwork-verso__overlay${isOpen ? ' is-open' : ''}`}
            data-verso-overlay-panel=""
            hidden={!isOpen}
            role="dialog"
            aria-modal={isOpen ? true : undefined}
            aria-labelledby={`verso-overlay-title-${connector.id}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="artwork-verso__overlay-toolbar">
              <button
                type="button"
                className="artwork-verso__overlay-close"
                aria-label="Close claim"
                onClick={(event) => {
                  event.stopPropagation()
                  onClose()
                }}
              >
                Close
              </button>
            </div>
            <div className="artwork-verso__overlay-scroll">
              <p className="artwork-verso__overlay-kind">
                {connector.kind === 'throughline'
                  ? CONNECTOR_GROUP_THROUGHLINES
                  : CONNECTOR_GROUP_BIOGRAPHY}
              </p>
              <h3
                id={`verso-overlay-title-${connector.id}`}
                className="artwork-verso__overlay-title"
              >
                {connector.label}
              </h3>
              <p className="artwork-verso__overlay-claim">{connector.claim}</p>
              {related.length > 0 ? (
                <div className="artwork-verso__overlay-related">
                  <p className="artwork-verso__overlay-related-label">Also on</p>
                  <ul className="artwork-verso__overlay-related-list">
                    {related.map((row) => (
                      <li key={row.slug}>
                        <Link href={`/${row.slug}`}>{row.title}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <Link href={connector.href} className="artwork-verso__overlay-page-link">
                Open the full {connector.kind === 'throughline' ? 'throughline' : 'biography'} page →
              </Link>
            </div>
          </div>
        )
      })}
    </>
  )
}

/** Timeline verso — single scroll face with chips, claim overlay, and record link. */
export default function ArtworkVerso({
  artwork,
  filterSeries,
  timelineMarkers,
  sessionDates,
  className,
  style,
  active = true,
}: ArtworkVersoProps) {
  const [state] = useArtworks()
  const [openId, setOpenId] = useState<string | null>(null)

  const title = artwork.title?.trim() || artwork.slug
  const recordHref = `/${artwork.slug}`
  const status = formatCatalogueStatus(sessionDates)
  const series = resolveSeriesDisplay(artwork, filterSeries)
  const description = resolveVersoDescription(artwork)
  const throughlines = resolveVersoConnectors(
    artwork.id,
    'throughline',
    timelineMarkers.throughlines,
  )
  const bios = resolveVersoConnectors(artwork.id, 'bio', timelineMarkers.bioEntries)
  const connectors = useMemo(() => [...throughlines, ...bios], [throughlines, bios])
  const hasConnectors = connectors.length > 0
  const versoRecord = artwork.versoRecord
  const hasProvenance =
    Boolean(versoRecord?.provenanceSummary) || (versoRecord?.provenanceClaims.length ?? 0) > 0
  const hasExhibitions = (versoRecord?.exhibitions.length ?? 0) > 0

  const artworkById = useMemo(() => {
    const map = new Map<number, { slug: string; title: string }>()
    for (const row of state.original) {
      const slug = row.slug?.trim()
      if (!slug) continue
      map.set(row.id, { slug, title: row.title?.trim() || slug })
    }
    return map
  }, [state.original])

  useEffect(() => {
    if (!active) setOpenId(null)
  }, [active])

  useEffect(() => {
    if (!openId) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      setOpenId(null)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [openId])

  const rootStyle = {
    ...style,
    ...(series ? ({ ['--verso-series-color' as string]: series.color } as CSSProperties) : null),
  } as CSSProperties

  return (
    <div
      className={['artwork-verso', className].filter(Boolean).join(' ')}
      style={rootStyle}
      data-verso-tint={series ? 'series' : 'neutral'}
      data-verso-overlay={openId ? 'open' : undefined}
      data-verso-layout="full"
    >
      <div className="artwork-verso__card">
        <div className="artwork-verso__body">
          <div className="artwork-verso__body-inner">
            <div className="artwork-verso__section artwork-verso__section--identity">
              <IdentitySection
                artwork={artwork}
                filterSeries={filterSeries}
                title={title}
                description={description}
              />
            </div>
            {hasConnectors ? (
              <div className="artwork-verso__section artwork-verso__section--connectors">
                <ConnectorsSection
                  throughlines={throughlines}
                  bios={bios}
                  openId={openId}
                  onOpen={setOpenId}
                />
              </div>
            ) : null}
            <div className="artwork-verso__section artwork-verso__section--record">
              <RecordSections
                versoRecord={versoRecord}
                hasProvenance={hasProvenance}
                hasExhibitions={hasExhibitions}
                status={status}
              />
            </div>
          </div>
        </div>

        <div className="artwork-verso__footer" onClick={(event) => event.stopPropagation()}>
          <Link href={recordHref} className="artwork-verso__record-bar">
            <span className="artwork-verso__record-bar-label">{OPEN_THE_RECORD_LABEL}</span>
          </Link>
        </div>

        <VersoOverlays
          artworkId={artwork.id}
          connectors={connectors}
          openId={openId}
          onClose={() => setOpenId(null)}
          artworkById={artworkById}
        />
      </div>
    </div>
  )
}
