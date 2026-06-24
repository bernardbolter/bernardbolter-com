'use client'

import { usePathname } from 'next/navigation'

import Info from '@/components/info/Info'

/** Public-site chrome (artist name, hamburger menu). Hidden on studio routes. */
export function SiteChrome() {
  const pathname = usePathname()
  if (pathname === '/studio' || pathname.startsWith('/studio/')) return null
  return <Info />
}
