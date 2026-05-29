import type { Media } from '@/payload-types'

import { resolveMediaUrl } from '@/lib/studio/media'

type TimelapsePlayerProps = {
  file: Media | number | null | undefined
}

export function TimelapsePlayer({ file }: TimelapsePlayerProps) {
  if (!file || typeof file === 'number') {
    return (
      <p className="studio-muted">
        No timelapse yet. Generate one from the painting admin record when process photos are ready.
      </p>
    )
  }

  const url = resolveMediaUrl(file)
  if (!url) {
    return <p className="studio-muted">Timelapse file is registered but URL is unavailable.</p>
  }

  return (
    <video className="studio-timelapse" controls playsInline src={url}>
      <track kind="captions" />
    </video>
  )
}
