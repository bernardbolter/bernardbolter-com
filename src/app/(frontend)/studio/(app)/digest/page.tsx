import { DigestView } from '@/components/studio/DigestView'
import { buildStudioDigest } from '@/lib/studio/digest'
import { getStudioPayload } from '@/lib/studio/getStudioPayload'

export default async function StudioDigestPage() {
  const { payload, user } = await getStudioPayload()
  const data = await buildStudioDigest(payload, user)

  return (
    <section>
      <header className="studio-page-header">
        <h2>Digest</h2>
      </header>
      <DigestView data={data} />
    </section>
  )
}
