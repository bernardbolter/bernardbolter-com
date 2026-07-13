/**
 * Seed a minimal CapturePreset for the FieldNotes test gate (spec §6).
 *
 * Usage: npm run seed:capture-presets
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

import { getPayload } from 'payload'

import config from '@payload-config'

const TEST_PRESET = {
  name: 'Rap Critic — test gate',
  mediaType: 'video-performance' as const,
  pipelineSteps: ['keyframes', 'moondream', 'whisper', 'slateParse'] as const,
  defaultEpisode: 'e01',
  transcriptLabel: 'speech' as const,
  keyframeIntervalSec: 10,
}

async function main() {
  const payload = await getPayload({ config })

  const existing = await payload.find({
    collection: 'capture-presets',
    where: { name: { equals: TEST_PRESET.name } },
    limit: 1,
    overrideAccess: true,
  })

  if (existing.docs[0]) {
    console.log(`Capture preset already exists: id=${existing.docs[0].id}`)
    process.exit(0)
  }

  const doc = await payload.create({
    collection: 'capture-presets',
    data: {
      ...TEST_PRESET,
      pipelineSteps: [...TEST_PRESET.pipelineSteps],
    },
    overrideAccess: true,
  })

  console.log(`Created capture preset: id=${doc.id} name="${doc.name}"`)
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
