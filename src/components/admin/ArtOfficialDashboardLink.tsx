import { Link } from '@payloadcms/ui'
import type { ServerProps } from 'payload'
import { formatAdminURL } from 'payload/shared'

import { isArtistOrAdmin } from '@/access/isArtistOrAdmin'

export function ArtOfficialDashboardLink({ payload, user }: ServerProps) {
  if (!isArtistOrAdmin(user)) return null

  const href = formatAdminURL({
    adminRoute: payload.config.routes.admin,
    path: '/art-official',
  })

  return (
    <section
      style={{
        marginBottom: 'var(--base)',
        padding: 'calc(var(--base) * 1.25)',
        borderRadius: 'var(--border-radius-m)',
        border: '1px solid var(--theme-elevation-150)',
        background: 'var(--theme-elevation-50)',
      }}
    >
      <h2 style={{ fontSize: 18, margin: '0 0 8px' }}>Art/Official</h2>
      <p style={{ margin: '0 0 16px', opacity: 0.8, lineHeight: 1.5 }}>
        Start or resume conversational cataloguing sessions for the artist archive.
      </p>
      <Link href={href}>Open Art/Official →</Link>
    </section>
  )
}
