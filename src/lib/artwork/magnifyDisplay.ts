export const MAGNIFY_BORDER_PADDING = 20

export type DragPosition = { x: number; y: number }

export type DragBounds = {
  left: number
  right: number
  top: number
  bottom: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Axis bounds: lock to center when the image fits; padded drag range when it overflows. */
function axisBounds(
  viewport: number,
  image: number,
  padding: number,
): { min: number; max: number; overflows: boolean } {
  const center = (viewport - image) / 2
  const overflows = image > viewport - 2 * padding
  if (!overflows) {
    return { min: center, max: center, overflows: false }
  }
  return {
    min: viewport - padding - image,
    max: padding,
    overflows: true,
  }
}

export function getMagnifyDragBounds(
  viewportWidth: number,
  viewportHeight: number,
  imageWidth: number,
  imageHeight: number,
): { bounds: DragBounds; canDrag: boolean } {
  const x = axisBounds(viewportWidth, imageWidth, MAGNIFY_BORDER_PADDING)
  const y = axisBounds(viewportHeight, imageHeight, MAGNIFY_BORDER_PADDING)

  return {
    canDrag: x.overflows || y.overflows,
    bounds: {
      left: x.min,
      right: x.max,
      top: y.min,
      bottom: y.max,
    },
  }
}

export function getInitialMagnifyDragPosition(
  viewportWidth: number,
  viewportHeight: number,
  imageWidth: number,
  imageHeight: number,
): DragPosition {
  const { bounds } = getMagnifyDragBounds(
    viewportWidth,
    viewportHeight,
    imageWidth,
    imageHeight,
  )
  const centerX = (viewportWidth - imageWidth) / 2
  const centerY = (viewportHeight - imageHeight) / 2

  return {
    x: clamp(centerX, bounds.left, bounds.right),
    y: clamp(centerY, bounds.top, bounds.bottom),
  }
}

export function computeMagnifyMiniMap(args: {
  viewportWidth: number
  viewportHeight: number
  imageWidth: number
  imageHeight: number
  position: DragPosition
  miniMapSize?: number
}) {
  const {
    viewportWidth,
    viewportHeight,
    imageWidth,
    imageHeight,
    position,
    miniMapSize = 120,
  } = args

  const padding = 10
  const drawableSize = miniMapSize - 2 * padding
  const containerW = viewportWidth - 2 * MAGNIFY_BORDER_PADDING
  const containerH = viewportHeight - 2 * MAGNIFY_BORDER_PADDING

  const { bounds } = getMagnifyDragBounds(
    viewportWidth,
    viewportHeight,
    imageWidth,
    imageHeight,
  )
  const dragLimitLeft = bounds.left
  const dragLimitRight = bounds.right
  const dragLimitTop = bounds.top
  const dragLimitBottom = bounds.bottom

  const imgAspectRatio = imageWidth / imageHeight
  let mapImgW: number
  let mapImgH: number
  if (imgAspectRatio >= 1) {
    mapImgW = drawableSize
    mapImgH = drawableSize / imgAspectRatio
  } else {
    mapImgH = drawableSize
    mapImgW = drawableSize * imgAspectRatio
  }

  const viewScaleW = mapImgW * (containerW / imageWidth)
  const viewScaleH = mapImgH * (containerH / imageHeight)

  const scrollDistX = dragLimitRight - dragLimitLeft
  const scrollOffsetX = position.x - dragLimitLeft
  const fracX = scrollDistX > 0 ? scrollOffsetX / scrollDistX : 0.5

  const scrollDistY = dragLimitBottom - dragLimitTop
  const scrollOffsetY = position.y - dragLimitTop
  const fracY = scrollDistY > 0 ? scrollOffsetY / scrollDistY : 0.5

  const mapScrollDistX = mapImgW - viewScaleW
  const mapScrollDistY = mapImgH - viewScaleH

  const fixedBoxPosX = (miniMapSize - viewScaleW) / 2
  const fixedBoxPosY = (miniMapSize - viewScaleH) / 2

  return {
    miniMapSize,
    mapImgW,
    mapImgH,
    viewScaleW,
    viewScaleH,
    fixedBoxPosX,
    fixedBoxPosY,
    finalImgTranslateX: fixedBoxPosX - mapScrollDistX + fracX * mapScrollDistX,
    finalImgTranslateY: fixedBoxPosY - mapScrollDistY + fracY * mapScrollDistY,
  }
}
