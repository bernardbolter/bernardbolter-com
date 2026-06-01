import type { ServerProps } from 'payload'

import { isArtistOrAdmin } from '@/access/isArtistOrAdmin'

export function StudioDashboardLink({ user }: ServerProps) {
  if (!isArtistOrAdmin(user)) return null

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
      <h2 style={{ fontSize: 18, margin: '0 0 8px' }}>Studio</h2>
      <p style={{ margin: '0 0 16px', opacity: 0.8, lineHeight: 1.5 }}>
        Fast capture, paintings, field notes, episodes, and the weekly digest — mobile-first
        outside the CMS chrome.
      </p>
      <a href="/studio">Open Studio →</a>
    </section>
  )
}
