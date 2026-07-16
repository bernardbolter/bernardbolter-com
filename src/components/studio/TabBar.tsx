'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

type NavItem = {
  href: string
  label: string
  match?: (pathname: string, search: string) => boolean
}

type NavGroup = {
  label: string
  items: NavItem[]
}

const GROUPS: NavGroup[] = [
  {
    label: 'Input',
    items: [
      {
        href: '/studio?input=photos',
        label: 'Photos',
        match: (pathname, search) =>
          pathname === '/studio' && (search === '' || search.includes('input=photos')),
      },
      {
        href: '/studio?input=videos',
        label: 'Videos',
        match: (pathname, search) => pathname === '/studio' && search.includes('input=videos'),
      },
      {
        href: '/studio?input=audio',
        label: 'Audio',
        match: (pathname, search) => pathname === '/studio' && search.includes('input=audio'),
      },
      {
        href: '/studio?input=text',
        label: 'Text',
        match: (pathname, search) => pathname === '/studio' && search.includes('input=text'),
      },
    ],
  },
  {
    label: 'Tools',
    items: [
      { href: '/studio/tools/animation', label: 'Animation Maker' },
      { href: '/studio/tools/scripts', label: 'Video Scripts' },
      { href: '/studio/episodes', label: 'Episodes' },
      { href: '/studio/archive', label: 'Archive' },
    ],
  },
  {
    label: 'Reference',
    items: [
      { href: '/studio/notes', label: 'All Media' },
      { href: '/studio/digest', label: 'Digest' },
      { href: '/studio/paintings', label: 'Paintings' },
    ],
  },
]

function isActive(item: NavItem, pathname: string, search: string): boolean {
  if (item.match) return item.match(pathname, search)
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

export function TabBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const search = searchParams?.toString() ?? ''

  return (
    <nav className="studio-nav" aria-label="Studio sections">
      {GROUPS.map((group) => (
        <div key={group.label} className="studio-nav__group">
          <p className="studio-nav__group-label">{group.label}</p>
          <div className="studio-nav__links">
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={isActive(item, pathname, search) ? 'active' : undefined}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}
