import { DefaultTemplate } from '@payloadcms/next/templates'
import type { AdminViewServerProps } from 'payload'
import type { ReactNode } from 'react'

/** Wraps custom admin views with nav + header (RootPage does not apply DefaultTemplate for custom routes). */
export function AdminViewShell({
  children,
  initPageResult,
  params,
  payload,
  searchParams,
  viewActions,
}: AdminViewServerProps & { children: ReactNode }) {
  const { locale, permissions, req, visibleEntities } = initPageResult

  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={payload}
      permissions={permissions}
      req={req}
      searchParams={searchParams}
      user={req.user}
      viewActions={viewActions}
      visibleEntities={{
        collections: visibleEntities.collections,
        globals: visibleEntities.globals,
      }}
    >
      {children}
    </DefaultTemplate>
  )
}
