/**
 * Seed contact page fields on the primary Artist record.
 *
 * Usage: npx tsx src/scripts/seed-contact-fields.ts [--dry-run]
 */
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { getPayload } from 'payload'
import config from '@/payload.config'

const dryRun = process.argv.includes('--dry-run')

const DEFAULT_IMPRESSUM = {
  legalName: 'Bernard John Bolter IV',
  streetAddress: 'Charlottenburgerstr. 8a',
  postalCode: '14169',
  city: 'Berlin',
  country: 'Germany',
  publicEmail: 'bernardbolter@gmail.com',
  kleinunternehmerText:
    'Kleinunternehmer im Sinne von § 19 Abs. 1 UStG wird die Umsatzsteuer nicht ausgewiesen.',
}

async function main() {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'artists',
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const artist = result.docs[0]
  if (!artist) {
    console.log('No artist record found.')
    process.exit(1)
  }

  const existingSocial = artist.socialChannels ?? {}
  const data: Record<string, unknown> = {}

  if (!artist.contactStatus) data.contactStatus = 'available'
  if (!artist.primarySocialChannel && existingSocial.instagram) {
    data.primarySocialChannel = 'instagram'
  }

  const socialChannels = {
    instagram: existingSocial.instagram?.trim() || undefined,
    facebook: existingSocial.facebook?.trim() || undefined,
    youtube: existingSocial.youtube?.trim() || undefined,
    vimeo: existingSocial.vimeo?.trim() || undefined,
    linkedin: existingSocial.linkedin?.trim() || undefined,
    tiktok: existingSocial.tiktok?.trim() || undefined,
  }

  if (Object.values(socialChannels).some(Boolean)) {
    data.socialChannels = socialChannels
  }

  if (!artist.impressum?.legalName) {
    data.impressum = DEFAULT_IMPRESSUM
  }

  if (!Object.keys(data).length) {
    console.log('Contact fields already populated — nothing to seed.')
    return
  }

  if (dryRun) {
    console.log('[dry-run] Would update artist:', data)
    return
  }

  await payload.update({
    collection: 'artists',
    id: artist.id,
    data,
    overrideAccess: true,
  })

  console.log('Updated contact fields on artist record:', Object.keys(data).join(', '))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
