import Link from 'next/link'

import { VideoScriptsClient } from '@/components/studio/VideoScriptsClient'
import { getStudioPayload } from '@/lib/studio/getStudioPayload'
import { listFieldNotes } from '@/lib/studio/fieldNotes'

export default async function VideoScriptsPage() {
  const { payload, user } = await getStudioPayload()

  const [textNotes, shots, takes, campaigns] = await Promise.all([
    listFieldNotes(payload, user, { mediaType: 'text' }, 40),
    payload.find({
      collection: 'shots',
      sort: '-updatedAt',
      limit: 40,
      depth: 1,
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: 'takes',
      where: { selected: { equals: true } },
      sort: 'takeNumber',
      limit: 100,
      depth: 1,
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: 'campaigns',
      sort: '-updatedAt',
      limit: 20,
      depth: 0,
      overrideAccess: false,
      user,
    }),
  ])

  return (
    <section>
      <header className="studio-page-header">
        <div>
          <h2>Video Scripts for Social</h2>
          <p className="studio-muted">
            Text FieldNotes feed shot/take planning. Export selected takes as an EDL for Resolve.
          </p>
        </div>
        <Link href="/studio?input=text" className="studio-page-header__link">
          New text note →
        </Link>
      </header>
      <VideoScriptsClient
        campaigns={campaigns.docs.map((c) => ({ id: c.id, name: c.name }))}
        textNotes={textNotes.docs.map((n) => ({
          id: n.id,
          preview: (n.writtenNote ?? n.locationName ?? `Note #${n.id}`).slice(0, 160),
        }))}
        shots={shots.docs.map((s) => ({
          id: s.id,
          description: s.description,
          status: s.status,
          campaignId:
            typeof s.campaign === 'object' && s.campaign ? s.campaign.id : (s.campaign as number),
        }))}
        selectedTakes={takes.docs.map((t) => ({
          id: t.id,
          takeNumber: t.takeNumber,
          shotId: typeof t.shot === 'object' && t.shot ? t.shot.id : (t.shot as number),
          inPointSec: t.inPointSec ?? null,
          outPointSec: t.outPointSec ?? null,
          quickNote: t.quickNote ?? null,
        }))}
      />
    </section>
  )
}
