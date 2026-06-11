export const MAGNIFY_BORDER_PADDING = 20

export type DragPosition = { x: number; y: number }

export type DragBounds = {
  left: number
  right: number
  top: number
  bottom: number
}

export function getMagnifyDragBounds(
  viewportWidth: number,
  viewportHeight: number,
  imageWidth: number,
  imageHeight: number,
): { bounds: DragBounds; canDrag: boolean } {
  const effectiveContainerW = viewportWidth - 2 * MAGNIFY_BORDER_PADDING
  const effectiveContainerH = viewportHeight - 2 * MAGNIFY_BORDER_PADDING
  const canDrag = imageWidth > effectiveContainerW || imageHeight > effectiveContainerH

  const dragLimitLeft = viewportWidth - MAGNIFY_BORDER_PADDING - imageWidth
  const dragLimitRight = MAGNIFY_BORDER_PADDING
  const dragLimitTop = viewportHeight - MAGNIFY_BORDER_PADDING - imageHeight
  const dragLimitBottom = MAGNIFY_BORDER_PADDING

  return {
    canDrag,
    bounds: {
      left: canDrag ? dragLimitLeft : 0,
      right: canDrag ? dragLimitRight : 0,
      top: canDrag ? dragLimitTop : 0,
      bottom: canDrag ? dragLimitBottom : 0,
    },
  }
}

export function getInitialMagnifyDragPosition(
  viewportWidth: number,
  viewportHeight: number,
  imageWidth: number,
  imageHeight: number,
): DragPosition {
  const dragLimitLeft = viewportWidth - MAGNIFY_BORDER_PADDING - imageWidth
  const dragLimitRight = MAGNIFY_BORDER_PADDING
  const dragLimitTop = viewportHeight - MAGNIFY_BORDER_PADDING - imageHeight
  const dragLimitBottom = MAGNIFY_BORDER_PADDING

  const centerX = (viewportWidth - imageWidth) / 2
  const centerY = (viewportHeight - imageHeight) / 2

  return {
    x: Math.max(dragLimitLeft, Math.min(dragLimitRight, centerX)),
    y: Math.max(dragLimitTop, Math.min(dragLimitBottom, centerY)),
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

  const dragLimitLeft = viewportWidth - MAGNIFY_BORDER_PADDING - imageWidth
  const dragLimitRight = MAGNIFY_BORDER_PADDING
  const dragLimitTop = viewportHeight - MAGNIFY_BORDER_PADDING - imageHeight
  const dragLimitBottom = MAGNIFY_BORDER_PADDING

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
  const fracX = scrollDistX > 0 ? scrollOffsetX / scrollDistX : 0

  const scrollDistY = dragLimitBottom - dragLimitTop
  const scrollOffsetY = position.y - dragLimitTop
  const fracY = scrollDistY > 0 ? scrollOffsetY / scrollDistY : 0

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
