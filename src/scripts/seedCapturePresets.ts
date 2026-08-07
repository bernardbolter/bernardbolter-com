/**
 * Seed CapturePresets for FieldNotes pipelines.
 *
 * - Leaves "Rap Critic — test gate" alone if present.
 * - Upserts "Rap Critic — TikTok" (whisper-only).
 *
 * Usage: npm run seed:capture-presets
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

import { getPayload } from 'payload'

import config from '@payload-config'

const TEST_GATE_PRESET = {
  name: 'Rap Critic — test gate',
  mediaType: 'video-performance' as const,
  pipelineSteps: ['keyframes', 'moondream', 'whisper', 'slateParse'] as const,
  defaultEpisode: 'e01',
  transcriptLabel: 'speech' as const,
  keyframeIntervalSec: 10,
}

const RAP_CRITIC_TIKTOK_PRESET = {
  name: 'Rap Critic — TikTok',
  mediaType: 'video-performance' as const,
  pipelineSteps: ['whisper'] as const,
  transcriptLabel: 'speech' as const,
  keyframeIntervalSec: 10,
}

async function ensurePreset(
  payload: Awaited<ReturnType<typeof getPayload>>,
  preset: {
    name: string
    mediaType: 'video-performance'
    pipelineSteps: readonly ('keyframes' | 'moondream' | 'whisper' | 'slateParse')[]
    defaultEpisode?: string
    transcriptLabel: 'speech'
    keyframeIntervalSec: number
  },
  options: { updateIfExists: boolean },
) {
  const existing = await payload.find({
    collection: 'capture-presets',
    where: { name: { equals: preset.name } },
    limit: 1,
    overrideAccess: true,
  })

  const data = {
    name: preset.name,
    mediaType: preset.mediaType,
    pipelineSteps: [...preset.pipelineSteps],
    defaultEpisode: preset.defaultEpisode,
    transcriptLabel: preset.transcriptLabel,
    keyframeIntervalSec: preset.keyframeIntervalSec,
  }

  if (existing.docs[0]) {
    if (!options.updateIfExists) {
      console.log(`Capture preset already exists: id=${existing.docs[0].id} name="${preset.name}"`)
      return existing.docs[0]
    }
    const updated = await payload.update({
      collection: 'capture-presets',
      id: existing.docs[0].id,
      data,
      overrideAccess: true,
    })
    console.log(`Updated capture preset: id=${updated.id} name="${updated.name}"`)
    return updated
  }

  const doc = await payload.create({
    collection: 'capture-presets',
    data,
    overrideAccess: true,
  })
  console.log(`Created capture preset: id=${doc.id} name="${doc.name}"`)
  return doc
}

async function main() {
  const payload = await getPayload({ config })

  await ensurePreset(payload, TEST_GATE_PRESET, { updateIfExists: false })
  await ensurePreset(payload, RAP_CRITIC_TIKTOK_PRESET, { updateIfExists: true })

  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
