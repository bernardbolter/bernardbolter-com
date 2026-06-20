'use client'

import Artworks from '@/components/artworks/Artworks'
import HomeArtworksReset from '@/components/home/HomeArtworksReset'
import Info from '@/components/info/Info'
import { Nav } from '@/components/navs'

export default function HomePage() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-surface-page text-dark">
      <HomeArtworksReset />
      <Info />
      <Nav />
      <Artworks />
    </main>
  )
}
