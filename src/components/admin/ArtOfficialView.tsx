import { DefaultTemplate } from '@payloadcms/next/templates'
import type { DefaultTemplateProps } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'

/** Step 16 stub: custom root admin view at `/admin/art-official`. */
export function ArtOfficialView(props: DefaultTemplateProps) {
  return (
    <DefaultTemplate {...props}>
      <Gutter>
        <p>Art/Official cataloguing agent — coming soon.</p>
      </Gutter>
    </DefaultTemplate>
  )
}
