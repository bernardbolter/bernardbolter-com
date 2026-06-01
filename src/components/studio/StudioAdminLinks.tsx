import Link from 'next/link'

export function StudioAdminLinks() {
  return (
    <nav className="studio-shell__admin-links" aria-label="CMS and Art/Official">
      <Link href="/admin">Admin</Link>
      <Link href="/admin/art-official">Art/Official</Link>
    </nav>
  )
}
