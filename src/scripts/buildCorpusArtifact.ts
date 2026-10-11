/**
 * Nightly corpus artifact build — one assembler for disk + optional R2 copy.
 *
 * Usage:
 *   pnpm corpus:build
 *   pnpm corpus:build -- --skip-r2
 *
 * Writes:
 *   data/corpus/corpus.json
 *   data/corpus/briefing.json
 *   data/corpus/build-report.json
 */
import { writeFile } from 'node:fs/promises'

import dotenv from 'dotenv'

dotenv.config({ path: '.env', override: true })
dotenv.config({ path: '.env.local', override: true })

import { getPayload } from 'payload'

import { assembleCorpusArtifact } from '@/lib/corpus/artifact/assembleCorpusArtifact'
import { corpusBuildReportPath } from '@/lib/corpus/artifact/paths'
import { uploadCorpusArtifactToR2 } from '@/lib/corpus/artifact/uploadCorpusArtifactR2'
import config from '@payload-config'

async function main() {
  const skipR2 = process.argv.includes('--skip-r2')
  const payload = await getPayload({ config })
  const { report, paths } = await assembleCorpusArtifact(payload)

  if (!skipR2) {
    const upload = await uploadCorpusArtifactToR2()
    report.r2Upload = upload
    if (!upload.ok) {
      report.warnings.push(`R2 upload failed: ${upload.error ?? 'unknown'}`)
      console.error('[corpus:build] R2 upload failed:', upload.error)
    } else {
      console.log('[corpus:build] R2 uploaded:', upload.keys.join(', '))
    }
    await writeFile(corpusBuildReportPath(), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  } else {
    report.r2Upload = { ok: false, error: 'skipped (--skip-r2)' }
    await writeFile(corpusBuildReportPath(), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  }

  console.log('[corpus:build] wrote', paths)
  console.log(
    JSON.stringify(
      {
        generatedAt: report.generatedAt,
        counts: report.counts,
        sizesBytes: report.sizesBytes,
        briefingTokenEstimate: report.briefingTokenEstimate,
        warnings: report.warnings,
        reasoningStatusAudit: {
          completeWithNoIntent: report.reasoningStatusAudit.completeWithNoIntent.length,
          intentNotMarkedComplete: report.reasoningStatusAudit.intentNotMarkedComplete.length,
        },
        brokenInternalLinks: report.brokenInternalLinks.length,
        publicProseMarkers: report.publicProseMarkers.length,
        privacyScan: report.privacyScan,
        r2Upload: report.r2Upload,
      },
      null,
      2,
    ),
  )

  if (!report.privacyScan.briefingClean) {
    process.exitCode = 2
  }
}

main().catch((error) => {
  console.error('[corpus:build] failed', error)
  process.exit(1)
})
