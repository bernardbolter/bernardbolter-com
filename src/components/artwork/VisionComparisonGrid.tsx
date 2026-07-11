'use client'

import { useCallback, useMemo, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'

export type ComparisonItem = {
  id: string
  modelLabel: string
  dateLabel: string | null
  preview: string
  body: ReactNode
}

type ViewMode = 'grid' | 'panel' | 'comparison'

type Props = {
  items: ComparisonItem[]
  seriesColor: string
  className?: string
}

export default function VisionComparisonGrid({ items, seriesColor, className = '' }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [leftId, setLeftId] = useState<string | null>(null)
  const [rightId, setRightId] = useState<string | null>(null)

  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items])

  const openPanel = useCallback((id: string) => {
    setLeftId(id)
    setRightId(null)
    setViewMode('panel')
  }, [])

  const openComparison = useCallback((id: string) => {
    if (!leftId || id === leftId) return
    setRightId(id)
    setViewMode('comparison')
  }, [leftId])

  const replaceLeft = useCallback((id: string) => {
    setLeftId(id)
    if (rightId === id) setRightId(null)
    setViewMode(rightId && rightId !== id ? 'comparison' : 'panel')
  }, [rightId])

  const closeLeft = useCallback(() => {
    if (rightId) {
      setLeftId(rightId)
      setRightId(null)
      setViewMode('panel')
      return
    }
    setLeftId(null)
    setViewMode('grid')
  }, [rightId])

  const closeRight = useCallback(() => {
    setRightId(null)
    setViewMode('panel')
  }, [])

  const closeAll = useCallback(() => {
    setLeftId(null)
    setRightId(null)
    setViewMode('grid')
  }, [])

  if (items.length === 0) return null

  const leftItem = leftId ? itemById.get(leftId) : null
  const rightItem = rightId ? itemById.get(rightId) : null
  const accentStyle = { '--vision-accent-color': seriesColor } as CSSProperties

  if (viewMode === 'grid') {
    return (
      <div className={`vision-comparison ${className}`} style={accentStyle}>
        <div className="vision-comparison__grid">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="vision-comparison__card"
              onClick={() => openPanel(item.id)}
            >
              <p className="vision-comparison__card-model">{item.modelLabel}</p>
              {item.dateLabel ? (
                <p className="vision-comparison__card-date">{item.dateLabel}</p>
              ) : null}
              <p className="vision-comparison__card-preview">{item.preview}</p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const stripItems = items.filter((item) => {
    if (viewMode === 'comparison') {
      return item.id !== leftId && item.id !== rightId
    }
    return item.id !== leftId
  })

  return (
    <div className={`vision-comparison ${className}`} style={accentStyle}>
      <div
        className={`vision-comparison__panels${
          viewMode === 'comparison' ? ' vision-comparison__panels--comparison' : ''
        }`}
      >
        {leftItem ? (
          <article className="vision-comparison__panel">
            <button
              type="button"
              className="vision-comparison__close"
              onClick={closeLeft}
              aria-label="Close panel"
            >
              ×
            </button>
            <header className="vision-comparison__panel-header">
              <p className="vision-comparison__panel-model">{leftItem.modelLabel}</p>
              {leftItem.dateLabel ? (
                <p className="vision-comparison__panel-date">{leftItem.dateLabel}</p>
              ) : null}
            </header>
            <div className="vision-comparison__panel-body">{leftItem.body}</div>
          </article>
        ) : null}

        {viewMode === 'comparison' && rightItem ? (
          <article className="vision-comparison__panel">
            <button
              type="button"
              className="vision-comparison__close"
              onClick={closeRight}
              aria-label="Close panel"
            >
              ×
            </button>
            <header className="vision-comparison__panel-header">
              <p className="vision-comparison__panel-model">{rightItem.modelLabel}</p>
              {rightItem.dateLabel ? (
                <p className="vision-comparison__panel-date">{rightItem.dateLabel}</p>
              ) : null}
            </header>
            <div className="vision-comparison__panel-body">{rightItem.body}</div>
          </article>
        ) : null}
      </div>

      <div className="vision-comparison__strip" role="tablist" aria-label="Select analysis">
        {leftItem ? (
          <button
            type="button"
            className="vision-comparison__strip-item vision-comparison__strip-item--selected"
            onClick={() => replaceLeft(leftItem.id)}
          >
            <span className="vision-comparison__strip-model">{leftItem.modelLabel}</span>
            {leftItem.dateLabel ? (
              <span className="vision-comparison__strip-date">{leftItem.dateLabel}</span>
            ) : null}
          </button>
        ) : null}

        {rightItem ? (
          <button
            type="button"
            className="vision-comparison__strip-item vision-comparison__strip-item--selected"
            onClick={() => openComparison(rightItem.id)}
          >
            <span className="vision-comparison__strip-model">{rightItem.modelLabel}</span>
            {rightItem.dateLabel ? (
              <span className="vision-comparison__strip-date">{rightItem.dateLabel}</span>
            ) : null}
          </button>
        ) : null}

        {stripItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className="vision-comparison__strip-item"
            onClick={() => {
              if (viewMode === 'comparison') {
                replaceLeft(item.id)
              } else if (leftId) {
                openComparison(item.id)
              } else {
                openPanel(item.id)
              }
            }}
          >
            <span className="vision-comparison__strip-model">{item.modelLabel}</span>
            {item.dateLabel ? (
              <span className="vision-comparison__strip-date">{item.dateLabel}</span>
            ) : null}
          </button>
        ))}
      </div>

      {viewMode === 'panel' ? (
        <button type="button" className="vision-comparison__back" onClick={closeAll}>
          Back to all
        </button>
      ) : null}
    </div>
  )
}
