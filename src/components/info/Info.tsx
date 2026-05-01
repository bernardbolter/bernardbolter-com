// src/components/Info/Info.tsx
'use client'

import { useArtworks } from '@/providers/ArtworkProvider'

const Info = () => {
  const [state, setState] = useArtworks()
  const artist = state.artist

  console.log('🎨 Info Component - artistData:', artist)

  return (
    <div className="flex flex-col gap-1 p-4">

      {/* Name */}
      <h1 className="text-2xl font-bold uppercase tracking-wide">
        {artist ?.name ?? 'Loading...'}
      </h1>
    </div>
  )
}

export default Info