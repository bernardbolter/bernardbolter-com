import { headers as nextHeaders } from 'next/headers'
import { getPayload } from 'payload'

import config from '@payload-config'
import { isArtistOrAdmin } from '@/access/isArtistOrAdmin'

export async function getStudioUser() {
  const payload = await getPayload({ config })
  const headers = await nextHeaders()
  const { user } = await payload.auth({ headers })
  if (!user || !isArtistOrAdmin(user)) return null
  return user
}
