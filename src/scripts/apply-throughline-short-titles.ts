/**
 * Rename statement throughline slugs to the approved short forms and set shortTitle.
 * artistBeforeChange records redirects; recordSlugRedirect flattens prior hops
 * so each old URL 308s in one hop to the final slug.
 *
 * Source: docs/throughlines/throughline-short-titles-draft.md
 *
 * Usage:
 *   npx tsx src/scripts/apply-throughline-short-titles.ts --dry-run
 *   npx tsx src/scripts/apply-throughline-short-titles.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env', override: true })
dotenv.config({ path: '.env.local', override: true })

import { getPayload } from 'payload'
import config from '@/payload.config'

/** Match by current slug → { shortTitle, newSlug }. #1 keeps its slug. */
const THROUGHLINE_UPDATES: Record<string, { shortTitle: string; newSlug: string }> = {
  'inside-outside-position': {
    shortTitle: 'Inside and outside the art world',
    newSlug: 'inside-outside-position',
  },
  'preconceived-compositional-rules-abandoned-once-actual': {
    shortTitle: 'Rules dropped when material leads',
    newSlug: 'material-over-rules',
  },
  'solitary-figure-placed-direct-relationship-architecture': {
    shortTitle: 'The figure against architecture',
    newSlug: 'figure-and-architecture',
  },
  '51-time-left-lie-actual-premise': {
    shortTitle: 'No time left to lie',
    newSlug: 'no-time-to-lie',
  },
  'working-frame-art-official-doing-artist': {
    shortTitle: 'Speaker, scribe, and archive',
    newSlug: 'speaker-scribe-archive',
  },
  'ignorance-named-enacted-altar-ignorance-1993': {
    shortTitle: 'Ignorance named, then enacted',
    newSlug: 'ignorance-named-then-enacted',
  },
  'overlooked-birth-civilization-recurring-argument-classical': {
    shortTitle: 'Arguing with the classical canon',
    newSlug: 'arguing-with-the-canon',
  },
  'sky-vantage-migration-traceable-across-three': {
    shortTitle: 'From painted sky to orbit',
    newSlug: 'sky-to-orbit',
  },
  'nature-vs-nurture-1994-structural-homology': {
    shortTitle: 'Invented nature, borrowed Romanticism',
    newSlug: 'invented-nature',
  },
  'space-time-stage-both-use-flat': {
    shortTitle: 'Space blocks against time grids',
    newSlug: 'space-blocks-time-grids',
  },
  'way-la-1994-clean-representational-instance': {
    shortTitle: 'Fisheye from skate-video memory',
    newSlug: 'fisheye-from-memory',
  },
  'loose-gestural-brushwork-impulse-first-surfaced': {
    shortTitle: 'Loose brushwork to glitch style',
    newSlug: 'loose-brushwork-glitch',
  },
  'window-painting-ambiguity-self-portrait-1994': {
    shortTitle: 'The blur became the art',
    newSlug: 'blur-became-the-art',
  },
  'self-portrait-1995-bb-ogp-1995': {
    shortTitle: 'Both vantages held at once',
    newSlug: 'both-vantages-at-once',
  },
  'recurring-mechanism-across-artist-s-early': {
    shortTitle: 'Not knowing it was impossible',
    newSlug: 'not-knowing-it-was-impossible',
  },
  'self-taught-institution-exists-yet-pattern': {
    shortTitle: 'Self-taught where no school existed',
    newSlug: 'self-taught-no-school',
  },
  'transition-rgb-three-channels-light-based': {
    shortTitle: 'RGB to CMYK, three to four',
    newSlug: 'rgb-to-cmyk',
  },
  'transition-art-collision-made-specifically-against': {
    shortTitle: 'Against the subsidy system',
    newSlug: 'against-the-subsidy-system',
  },
  'invented-lived-romanticism-arc-nature-vs': {
    shortTitle: 'Invented Romanticism becomes lived',
    newSlug: 'invented-to-lived-romanticism',
  },
  'foundational-tension-runs-across-bolter-s': {
    shortTitle: 'Photograph settled, paint still open',
    newSlug: 'settled-photograph-open-paint',
  },
  'art-collision-stands-unrepeated-hybrid-moment': {
    shortTitle: 'The unrepeated hybrid moment',
    newSlug: 'unrepeated-hybrid-moment',
  },
  'square-exposed-confession-pixel-logic-four': {
    shortTitle: 'The square confesses the pixel',
    newSlug: 'square-confesses-the-pixel',
  },
  'two-coexisting-photograph-paint-relationships-single': {
    shortTitle: 'Two models of paint on photograph',
    newSlug: 'two-models-paint-photograph',
  },
  'founding-four-s-ascent-earth-sky': {
    shortTitle: 'The founding four ascend',
    newSlug: 'founding-four-ascent',
  },
  'world-war-one-2022-extension-world': {
    shortTitle: 'The hybrid mode returns',
    newSlug: 'hybrid-mode-returns',
  },
  'confidence-transparency-arc-runs-art-collision': {
    shortTitle: 'From hidden seams to open record',
    newSlug: 'hidden-seams-open-record',
  },
  'personal-fatalism-traced-hopi-prophecy-heard': {
    shortTitle: 'Fatalism, prophecy, and spectacle',
    newSlug: 'fatalism-prophecy-spectacle',
  },
  'camera-awareness-chain-across-triptych-world': {
    shortTitle: 'Learning to perform for the camera',
    newSlug: 'camera-awareness-chain',
  },
  'trust-economy-across-wwi-wwii-vietnam': {
    shortTitle: 'Moral credit spent down',
    newSlug: 'moral-credit-spent-down',
  },
  'korea-gap-korea-1950-53-entirely': {
    shortTitle: 'The Korea gap',
    newSlug: 'the-korea-gap',
  },
  'anachronism-leaking-across-medium-per-era': {
    shortTitle: 'Anachronism leaks both directions',
    newSlug: 'anachronism-leaks',
  },
  'sourcing-method-mechanism-enabling-genuine-discovery': {
    shortTitle: 'Random sourcing protects discovery',
    newSlug: 'random-sourcing-discovery',
  },
  'world-war-two-retroactive-bundling-painting': {
    shortTitle: 'One name, three different wars',
    newSlug: 'one-name-three-wars',
  },
  'anonymous-witness-figure-viewer-surrogate-d': {
    shortTitle: 'The anonymous witness figure',
    newSlug: 'anonymous-witness-figure',
  },
  'global-peace-walk-2000-shared-root': {
    shortTitle: 'The Peace Walk as root',
    newSlug: 'peace-walk-as-root',
  },
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const payload = await getPayload({ config })

  const artists = await payload.find({
    collection: 'artists',
    limit: 10,
    depth: 0,
    overrideAccess: true,
  })
  const artist = artists.docs[0]
  if (!artist) {
    console.error('No artist document')
    process.exit(1)
  }

  const usedNew = new Set<string>()
  const changes: Array<{
    id: string
    from: string
    to: string
    shortTitle: string
    slugUnchanged: boolean
  }> = []
  const unmatched: string[] = []
  const missingKeys = new Set(Object.keys(THROUGHLINE_UPDATES))

  const nextThrough = (artist.statementThroughlines ?? []).map((row) => {
    if (!row?.id) return row
    const from = row.slug?.trim() || ''
    const update = from ? THROUGHLINE_UPDATES[from] : undefined
    if (!update) {
      if (from) unmatched.push(from)
      return row
    }
    missingKeys.delete(from)
    if (usedNew.has(update.newSlug) && update.newSlug !== from) {
      throw new Error(`Duplicate target slug: ${update.newSlug}`)
    }
    usedNew.add(update.newSlug)
    changes.push({
      id: row.id,
      from: from || '(empty)',
      to: update.newSlug,
      shortTitle: update.shortTitle,
      slugUnchanged: update.newSlug === from,
    })
    return {
      ...row,
      slug: update.newSlug,
      shortTitle: update.shortTitle,
    }
  })

  console.log(
    JSON.stringify(
      {
        dryRun,
        changeCount: changes.length,
        renameCount: changes.filter((c) => !c.slugUnchanged).length,
        titleOnlyCount: changes.filter((c) => c.slugUnchanged).length,
        missingFromDb: [...missingKeys],
        unmatchedInDb: unmatched,
        changes,
      },
      null,
      2,
    ),
  )

  if (missingKeys.size > 0) {
    console.error('ERROR: draft rows not found in DB by current slug')
    process.exit(1)
  }
  if (unmatched.length > 0) {
    console.error('ERROR: DB throughlines with no draft mapping')
    process.exit(1)
  }

  if (dryRun) {
    console.log('dry-run only; no writes')
    process.exit(0)
  }

  await payload.update({
    collection: 'artists',
    id: artist.id,
    data: {
      statementThroughlines: nextThrough,
    },
    overrideAccess: true,
    overrideLock: true,
  })

  console.log(`done: ${changes.length} throughline(s) updated`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
