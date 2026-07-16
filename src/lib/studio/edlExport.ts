export type EdlTakeInput = {
  id: number
  takeNumber: number
  shotId: number
  inPointSec: number | null
  outPointSec: number | null
  quickNote: string | null
}

function formatTimecode(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const f = 0
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`
}

/** Simple CMX-style EDL for selected Takes — import into DaVinci Resolve manually. */
export function buildEdlFromTakes(takes: EdlTakeInput[]): string {
  const lines = ['TITLE: Selected Takes', 'FCM: NON-DROP FRAME', '']
  takes.forEach((take, index) => {
    const event = String(index + 1).padStart(3, '0')
    const inSec = take.inPointSec ?? 0
    const outSec = take.outPointSec ?? inSec + 5
    const srcIn = formatTimecode(inSec)
    const srcOut = formatTimecode(outSec)
    const recIn = formatTimecode(index * 5)
    const recOut = formatTimecode(index * 5 + (outSec - inSec))
    lines.push(
      `${event}  AX       V     C        ${srcIn} ${srcOut} ${recIn} ${recOut}`,
    )
    lines.push(
      `* FROM CLIP NAME: shot-${take.shotId}-take-${take.takeNumber}${
        take.quickNote ? ` (${take.quickNote})` : ''
      }`,
    )
    lines.push('')
  })
  return lines.join('\n')
}
