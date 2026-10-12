import { validateEnvelopeDryRun } from '@/lib/artOfficial/contract/validateEnvelopeDryRun'

/**
 * Dry-run envelope validate — commits nothing.
 * Public: Claude sessions need to request a validate URL without studio auth.
 * Zod .strict() failure → wholePasteRejected with per-issue paths.
 */
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      {
        ok: false,
        wholePasteRejected: true,
        rejected: [{ path: '(root)', reason: 'Invalid JSON body' }],
        accepted: [],
        silentlyDropped: [],
      },
      { status: 400 },
    )
  }

  const result = validateEnvelopeDryRun(body)
  const status = result.wholePasteRejected ? 400 : result.ok ? 200 : 422
  return Response.json(result, { status })
}
