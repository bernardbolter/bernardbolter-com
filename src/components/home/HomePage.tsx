'use client'

import type { ReactNode } from 'react'

import Artworks from '@/components/artworks/Artworks'
import HomeArtworksReset from '@/components/home/HomeArtworksReset'
import { Nav } from '@/components/navs'

type Props = {
  /** Server-rendered slots (e.g. corpus intro) — stay outside nav/header/footer. */
  children?: ReactNode
}

export default function HomePage({ children }: Props) {
  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-surface-page text-dark">
      <HomeArtworksReset />
      {children}
      <Nav />
      <Artworks />
    </main>
  )
}
