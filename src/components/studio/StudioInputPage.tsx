'use client'

import { useSearchParams } from 'next/navigation'
import { useMemo } from 'react'

import { fieldNoteMediaTypes } from '@/lib/studio/fieldNoteSchema'

import { UploadForm } from './UploadForm'

type InputMode = 'photos' | 'videos' | 'audio' | 'text'
type MediaType = (typeof fieldNoteMediaTypes)[number]

const INPUT_DEFAULTS: Record<
  InputMode,
  {
    title: string
    lede: string
    mediaType: MediaType
    accept?: string
  }
> = {
  photos: {
    title: 'Photos',
    lede: 'Capture process photos, museum shots, and stills. Full frame preferred.',
    mediaType: 'photo',
    accept: 'image/*',
  },
  videos: {
    title: 'Videos',
    lede: 'Training reels, b-roll, observations, and process clips.',
    mediaType: 'video-broll',
    accept: 'video/*',
  },
  audio: {
    title: 'Audio',
    lede: 'Voice memos and spoken notes for later transcription.',
    mediaType: 'voice-memo',
    accept: 'audio/*',
  },
  text: {
    title: 'Text',
    lede: 'Drafts and raw material for Video Scripts and other Tools. No media processing.',
    mediaType: 'text',
  },
}

function resolveInput(raw: string | null): InputMode {
  if (raw === 'videos' || raw === 'audio' || raw === 'text' || raw === 'photos') return raw
  return 'photos'
}

export function StudioInputPage() {
  const params = useSearchParams()
  const mode = resolveInput(params.get('input'))
  const config = useMemo(() => INPUT_DEFAULTS[mode], [mode])

  return (
    <section className="studio-upload-page">
      <h2>{config.title}</h2>
      <p className="studio-upload-page__lede">{config.lede}</p>
      <UploadForm
        key={mode}
        initialMediaType={config.mediaType}
        accept={config.accept}
        lockMediaTypeGroup={mode}
      />
    </section>
  )
}
