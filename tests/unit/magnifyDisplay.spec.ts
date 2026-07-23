import { describe, expect, it } from 'vitest'

import {
  getInitialMagnifyDragPosition,
  getMagnifyDragBounds,
  MAGNIFY_BORDER_PADDING,
} from '@/lib/artwork/magnifyDisplay'

describe('getInitialMagnifyDragPosition', () => {
  it('centers an image that fits entirely in the viewport', () => {
    const viewportWidth = 1200
    const viewportHeight = 900
    const imageWidth = 800
    const imageHeight = 600

    const position = getInitialMagnifyDragPosition(
      viewportWidth,
      viewportHeight,
      imageWidth,
      imageHeight,
    )

    expect(position).toEqual({
      x: (viewportWidth - imageWidth) / 2,
      y: (viewportHeight - imageHeight) / 2,
    })
  })

  it('centers an overflowing image within padded drag limits', () => {
    const viewportWidth = 1000
    const viewportHeight = 800
    const imageWidth = 2000
    const imageHeight = 1600

    const position = getInitialMagnifyDragPosition(
      viewportWidth,
      viewportHeight,
      imageWidth,
      imageHeight,
    )

    expect(position.x).toBe((viewportWidth - imageWidth) / 2)
    expect(position.y).toBe((viewportHeight - imageHeight) / 2)

    const { bounds, canDrag } = getMagnifyDragBounds(
      viewportWidth,
      viewportHeight,
      imageWidth,
      imageHeight,
    )
    expect(canDrag).toBe(true)
    expect(position.x).toBeGreaterThanOrEqual(bounds.left)
    expect(position.x).toBeLessThanOrEqual(bounds.right)
    expect(position.y).toBeGreaterThanOrEqual(bounds.top)
    expect(position.y).toBeLessThanOrEqual(bounds.bottom)
  })

  it('locks the fitting axis to center when only one axis overflows', () => {
    const viewportWidth = 1200
    const viewportHeight = 800
    const imageWidth = 2000
    const imageHeight = 400

    const position = getInitialMagnifyDragPosition(
      viewportWidth,
      viewportHeight,
      imageWidth,
      imageHeight,
    )
    const { bounds } = getMagnifyDragBounds(
      viewportWidth,
      viewportHeight,
      imageWidth,
      imageHeight,
    )

    expect(position.y).toBe((viewportHeight - imageHeight) / 2)
    expect(bounds.top).toBe(bounds.bottom)
    expect(bounds.top).toBe(position.y)
    expect(position.x).toBe((viewportWidth - imageWidth) / 2)
    expect(bounds.left).toBe(viewportWidth - MAGNIFY_BORDER_PADDING - imageWidth)
    expect(bounds.right).toBe(MAGNIFY_BORDER_PADDING)
  })
})

describe('getMagnifyDragBounds', () => {
  it('does not pin a fitting image to 0,0', () => {
    const { bounds, canDrag } = getMagnifyDragBounds(1200, 900, 400, 300)
    expect(canDrag).toBe(false)
    expect(bounds.left).toBe(400)
    expect(bounds.right).toBe(400)
    expect(bounds.top).toBe(300)
    expect(bounds.bottom).toBe(300)
  })
})
