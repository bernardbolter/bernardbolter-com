/**
 * Measure real Art/Official cached prefix size vs Anthropic minimum (1024 tokens).
 * Usage: npx tsx src/scripts/measure-prompt-cache-prefix.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })

import Anthropic from '@anthropic-ai/sdk'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { buildSystemPromptParts } from '@/lib/artOfficial/buildSystemPrompt'
import {
  buildAnthropicSystemBlocks,
  withToolCaching,
} from '@/lib/artOfficial/promptCache'
import { ANTHROPIC_TOOL_SCHEMAS } from '@/lib/artOfficial/agentTools'

async function main() {
  const payload = await getPayload({ config })
  const artists = await payload.find({ collection: 'artists', limit: 1, depth: 0 })
  const artist = artists.docs[0]
  if (!artist) {
    console.error('No artist record')
    process.exit(1)
  }

  const users = await payload.find({ collection: 'users', limit: 1, depth: 0 })
  const user = users.docs[0]
  if (!user) {
    console.error('No user record')
    process.exit(1)
  }

  const parts = await buildSystemPromptParts({
    payload,
    user,
    sessionType: 'artwork-cataloguing',
    artistId: artist.id,
    preUpload: { preUploadStep: 2, hasFirstImpression: false, hasPrimaryImage: false },
  })

  console.log('cachedPrefix chars:', parts.cachedPrefix.length)
  console.log('dynamicSuffix chars:', parts.dynamicSuffix.length)

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const model = process.env.ART_OFFICIAL_MODEL ?? 'claude-sonnet-4-6'

  const count = await client.messages.countTokens({
    model,
    system: buildAnthropicSystemBlocks(parts),
    tools: withToolCaching(ANTHROPIC_TOOL_SCHEMAS),
    messages: [{ role: 'user', content: 'hi' }],
  })

  console.log('countTokens input_tokens (full system+tools+user):', count.input_tokens)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
