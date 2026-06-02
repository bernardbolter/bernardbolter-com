'use client'

import Loading from './Loading'

export default function NoArtworks() {
  return (
    <Loading
      title="No Artworks Found."
      subtitle="Try refreshing, or adjust the filters."
    />
  )
}
