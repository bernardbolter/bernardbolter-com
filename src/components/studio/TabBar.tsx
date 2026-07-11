'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/studio', label: 'Upload' },
  { href: '/studio/paintings', label: 'Paintings' },
  { href: '/studio/notes', label: 'Notes' },
  { href: '/studio/episodes', label: 'Episodes' },
  { href: '/studio/digest', label: 'Digest' },
  { href: '/studio/archive', label: 'Archive' },
]

export function TabBar() {
  const pathname = usePathname()
  return (
    <nav className="studio-tabbar" aria-label="Studio sections">
      {TABS.map((tab) => {
        const active =
          tab.href === '/studio'
            ? pathname === '/studio'
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`)
        return (
          <Link key={tab.href} href={tab.href} className={active ? 'active' : undefined}>
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
