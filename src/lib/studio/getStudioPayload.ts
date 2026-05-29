import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import type { Payload } from 'payload'

import config from '@payload-config'
import type { User } from '@/payload-types'

import { getStudioUser } from '@/lib/studio/auth'

export async function getStudioPayload(): Promise<{ payload: Payload; user: User }> {
  const user = await getStudioUser()
  if (!user) redirect('/studio/login')
  const payload = await getPayload({ config })
  return { payload, user }
}
