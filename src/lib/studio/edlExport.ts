export type EdlTakeInput = {
  id: number
  takeNumber: number
  shotId: number
  inPointSec: number | null
  outPointSec: number | null
  quickNote: string | null
}

export type EdlClipEvent = {
  /** Reel / clip name Resolve should match in the media pool. */
  clipName: string
  srcInSec: number
  srcOutSec: number
  comment?: string
}

export type AssemblyEdlRow = {
  beatName?: string | null
  notes?: string | null
  fieldNoteId: number
  durationSec: number | null
  mediaFilename: string | null
  shotType?: string | null
  cameraAngle?: string | null
}

/** Whole-second CMX timecode (frames always 00 — fine for a Resolve rough import). */
export function formatEdlTimecode(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}:00`
}

/** Basename from Media.filename (`inbox/YYYY/MM/uuid-name.mp4` → `uuid-name.mp4`). */
export function clipNameFromMediaFilename(filename: string | null | undefined): string {
  if (!filename?.trim()) return 'UNKNOWN'
  const base = filename.replace(/\\/g, '/').split('/').pop() ?? filename
  const cleaned = base.replace(/[^\w.\-()+ ]+/g, '_').trim()
  return cleaned.slice(0, 120) || 'UNKNOWN'
}

function sanitizeEdlTitle(title: string): string {
  return title.replace(/[\r\n]+/g, ' ').trim().slice(0, 80) || 'Untitled'
}

function normalizeSourceRange(srcInSec: number, srcOutSec: number): {
  inSec: number
  outSec: number
  durationSec: number
} {
  const inSec = Math.max(0, Math.floor(srcInSec))
  let outSec = Math.max(0, Math.floor(srcOutSec))
  if (outSec <= inSec) outSec = inSec + 1
  return { inSec, outSec, durationSec: outSec - inSec }
}

/** Shared CMX 3600 builder — ordered events on a contiguous record timeline. */
export function buildEdl(title: string, events: EdlClipEvent[]): string {
  const lines = [`TITLE: ${sanitizeEdlTitle(title)}`, 'FCM: NON-DROP FRAME', '']
  let recCursor = 0

  events.forEach((ev, index) => {
    const { inSec, outSec, durationSec } = normalizeSourceRange(ev.srcInSec, ev.srcOutSec)
    const event = String(index + 1).padStart(3, '0')
    const srcIn = formatEdlTimecode(inSec)
    const srcOut = formatEdlTimecode(outSec)
    const recIn = formatEdlTimecode(recCursor)
    const recOut = formatEdlTimecode(recCursor + durationSec)
    recCursor += durationSec

    lines.push(`${event}  AX       V     C        ${srcIn} ${srcOut} ${recIn} ${recOut}`)
    lines.push(`* FROM CLIP NAME: ${ev.clipName}`)
    if (ev.comment?.trim()) {
      lines.push(`* ${ev.comment.trim()}`)
    }
    lines.push('')
  })

  return lines.join('\n')
}

/**
 * Episode assembly → rough-cut EDL.
 * Full-clip in/out (0 → duration) in assembly order. Import matching MP4s into Resolve first.
 */
export function buildEdlFromAssembly(title: string, rows: AssemblyEdlRow[]): string {
  const events: EdlClipEvent[] = rows.map((row) => {
    const duration =
      row.durationSec != null && Number.isFinite(row.durationSec) && row.durationSec > 0
        ? row.durationSec
        : 5
    const comment = [
      row.beatName,
      row.shotType,
      row.cameraAngle,
      `field-note-${row.fieldNoteId}`,
      row.notes?.trim(),
    ]
      .filter((part): part is string => Boolean(part && String(part).trim()))
      .join(' · ')

    return {
      clipName: clipNameFromMediaFilename(row.mediaFilename),
      srcInSec: 0,
      srcOutSec: duration,
      comment: comment || undefined,
    }
  })

  return buildEdl(`${title} assembly`, events)
}

/** Simple CMX-style EDL for selected Takes — import into DaVinci Resolve manually. */
export function buildEdlFromTakes(takes: EdlTakeInput[]): string {
  const events: EdlClipEvent[] = takes.map((take) => {
    const inSec = take.inPointSec ?? 0
    const outSec = take.outPointSec ?? inSec + 5
    return {
      clipName: `shot-${take.shotId}-take-${take.takeNumber}`,
      srcInSec: inSec,
      srcOutSec: outSec,
      comment: take.quickNote?.trim() || undefined,
    }
  })
  return buildEdl('Selected Takes', events)
}
